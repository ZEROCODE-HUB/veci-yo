import { useMemo, useState } from "react";
import { listaDe } from "@/shared/utils";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores";
import { useCondominioActivo, useUnidadActiva } from "@/shared/hooks";
import {
  contarRegalosPorDar,
  obtenerCuadroHonor,
  obtenerDetalleCuotas,
  obtenerMiCuota,
  obtenerResumenCuotas,
  obtenerVisibilidadCuotas,
  type UnidadCuadroHonor,
} from "../services/cuadroHonor.repo";

/** A quién se le va a dar el reconocimiento. */
export interface DestinatarioReconocimiento {
  usuarioId: string | null;
  nombre: string;
}

export function useCuadroHonor() {
  const rolActivo = useAuthStore((s) => s.rolActivo);
  const unidades = useAuthStore((s) => s.unidades);
  const usuarioId = useAuthStore((s) => s.usuarioId) ?? "";
  const condominioId = useCondominioActivo() ?? "";

  const [search, setSearch] = useState("");
  const [showReconocimientoPopup, setShowReconocimientoPopup] = useState(false);
  const [destinatario, setDestinatario] =
    useState<DestinatarioReconocimiento | null>(null);

  const query = useQuery({
    queryKey: ["cuadro-honor", condominioId],
    queryFn: () => obtenerCuadroHonor(condominioId),
    enabled: Boolean(condominioId),
  });

  const cuotas = useQuery({
    queryKey: ["cuadro-honor", "cuotas", condominioId],
    queryFn: () => obtenerResumenCuotas(condominioId),
    enabled: Boolean(condominioId),
  });

  /*
    Es uno al mes. La misma clave que la portada, para que dar uno apague las
    dos a la vez. Mientras no se sabe, se ofrece: quien decide es la base.
  */
  const regalos = useQuery({
    queryKey: ["home", "regalos", condominioId, usuarioId],
    queryFn: () => contarRegalosPorDar({ condominioId, usuarioId }),
    enabled: Boolean(condominioId && usuarioId),
  });
  const yaDioEsteMes = regalos.data === 0;

  /*
    Debajo del carrusel (hueco 13): la cuota propia, y la lista hasta donde
    la administración decidió publicar. Lo que no se publica no llega: lo
    recorta `detalle_cuotas` en la base.
  */
  const unidadActiva = useUnidadActiva();
  const unidadId = rolActivo === "administrador" || rolActivo === "guardia" ? null : unidadActiva?.unidadId ?? null;
  const miCuota = useQuery({
    queryKey: ["cuadro-honor", "mi-cuota", condominioId, unidadId],
    queryFn: () => obtenerMiCuota(condominioId, unidadId ?? ""),
    enabled: Boolean(condominioId && unidadId),
  });
  const detalle = useQuery({
    queryKey: ["cuadro-honor", "detalle", condominioId],
    queryFn: () => obtenerDetalleCuotas(condominioId),
    enabled: Boolean(condominioId),
  });
  const visibilidad = useQuery({
    queryKey: ["visibilidad-cuotas", condominioId],
    queryFn: () => obtenerVisibilidadCuotas(condominioId),
    enabled: Boolean(condominioId),
  });

  const departamentos = listaDe(query.data);

  const filtered = useMemo(
    () =>
      departamentos.filter(
        (d: UnidadCuadroHonor) =>
          !search ||
          d.departamento.toLowerCase().includes(search.toLowerCase()) ||
          d.responsable.toLowerCase().includes(search.toLowerCase()),
      ),
    [departamentos, search],
  );

  const esGuardia = rolActivo === "guardia";
  const esAdmin = rolActivo === "administrador";
  // Participa quien vive en el condominio. `es_residente` sale de la membresía,
  // no de un store local: antes se deducía del correo del usuario.
  const esResidente = unidades.some((u) => u.esResidente);
  const puedeVerPagina = !esGuardia;
  const sinPropiedades = !esAdmin && !esGuardia && unidades.length === 0;

  const handleOpenReconocimiento = (elegido?: DestinatarioReconocimiento) => {
    setDestinatario(elegido ?? null);
    setShowReconocimientoPopup(true);
  };

  const cerrarReconocimiento = () => {
    setShowReconocimientoPopup(false);
    setDestinatario(null);
  };

  return {
    isLoading: query.isLoading,
    error: query.error,
    search,
    setSearch,
    filtered,
    cuotas: cuotas.data ?? [],
    miCuota: miCuota.data ?? null,
    detalleCuotas: detalle.data ?? [],
    visibilidadCuotas: visibilidad.data ?? "porcentaje",
    esAdmin,
    puedeVerPagina,
    sinPropiedades,
    puedeParticipar: esResidente,
    yaDioEsteMes,
    showReconocimientoPopup,
    destinatario,
    /** Vecinos a los que se puede reconocer: los del cuadro, con cuenta. */
    candidatos: departamentos.filter((d) => d.responsableUsuarioId),
    handleOpenReconocimiento,
    cerrarReconocimiento,
  };
}
