import { useMemo, useState } from "react";
import { listaDe } from "@/shared/utils";
import { useQuery } from "@tanstack/react-query";
import { estadoDe, juntarCargas } from "@/shared/components";
import { useAuthStore } from "@/stores";
import { useCondominioActivo, useUnidadActiva } from "@/shared/hooks";
import {
  diasParaDarReconocimiento,
  obtenerCuadroHonor,
  obtenerDetalleCuotas,
  obtenerMiCuota,
  obtenerResumenCuotas,
  obtenerPuntualidadCuotas,
  obtenerVisibilidadCuotas,
  puedeVerRecaudacion,
  type PeriodoCuota,
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

  /*
    El huésped temporal no ve nada del Cuadro de Honor (17/11/2026): ni se le
    pide nada a la base. La base tampoco se lo daría --no es miembro del
    edificio--, pero así no hay ni una llamada.
  */
  const esHuesped = rolActivo === "huesped-temporal";
  const habilitado = Boolean(condominioId) && !esHuesped;

  const query = useQuery({
    queryKey: ["cuadro-honor", condominioId],
    queryFn: () => obtenerCuadroHonor(condominioId),
    enabled: habilitado,
  });

  /*
    La recaudación, solo para propietarios, residentes y la administración
    (17/11/2026). Lo decide la base; hasta saberlo no se pide.
  */
  const permisoRecaudacion = useQuery({
    queryKey: ["cuadro-honor", "puede-ver-recaudacion", condominioId, usuarioId],
    queryFn: () => puedeVerRecaudacion(condominioId),
    enabled: habilitado,
  });
  const veRecaudacion = permisoRecaudacion.data === true;

  const cuotas = useQuery({
    queryKey: ["cuadro-honor", "cuotas", condominioId],
    queryFn: () => obtenerResumenCuotas(condominioId),
    enabled: habilitado && veRecaudacion,
  });

  const puntualidad = useQuery({
    queryKey: ["cuadro-honor", "puntualidad", condominioId],
    queryFn: () => obtenerPuntualidadCuotas(condominioId),
    enabled: habilitado && veRecaudacion,
  });

  // Cada mes con su puntualidad, por el periodo: las dos vienen de la base.
  const historial = useMemo<PeriodoCuota[]>(
    () =>
      (cuotas.data ?? []).map((mes) => ({
        ...mes,
        puntualidad: (puntualidad.data ?? []).find((p) => p.periodo === mes.periodo),
      })),
    [cuotas.data, puntualidad.data],
  );

  /*
    Uno cada 30 días (16/10/2026). La misma clave que la portada, para que
    dar uno apague las dos a la vez.

    Mientras no se sabe, **no** se ofrece (13/11/2026): con el cero de relleno
    salía «Gratitud» a quien ya lo había dado, abría la ventana y la base lo
    rechazaba al final. `gratitudSabida` dice si ya llegó la respuesta.
  */
  const regalos = useQuery({
    queryKey: ["home", "regalos", condominioId, usuarioId],
    queryFn: () => diasParaDarReconocimiento(condominioId),
    enabled: Boolean(condominioId && usuarioId),
  });
  const diasParaGratitud = regalos.data ?? 0;
  const gratitudSabida = regalos.data !== undefined;
  const yaDioEsteMes = diasParaGratitud > 0;

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
    enabled: habilitado && veRecaudacion && Boolean(unidadId),
  });
  const detalle = useQuery({
    queryKey: ["cuadro-honor", "detalle", condominioId],
    queryFn: () => obtenerDetalleCuotas(condominioId),
    enabled: habilitado && veRecaudacion,
  });
  const visibilidad = useQuery({
    queryKey: ["visibilidad-cuotas", condominioId],
    queryFn: () => obtenerVisibilidadCuotas(condominioId),
    enabled: habilitado && veRecaudacion,
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
  // Un huésped temporal no: la gratitud es entre vecinos (16/10/2026), y su
  // membresía también lleva `es_residente`.
  const esResidente = unidades.some(
    (u) => u.esResidente && u.rol !== "huesped_temporal",
  );
  const puedeVerPagina = !esGuardia && !esHuesped;
  const sinPropiedades = !esAdmin && !esGuardia && !esHuesped && unidades.length === 0;

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
    /*
      Cómo va cada trozo de la pantalla (13/11/2026): la lista se quedaba en
      blanco mientras cargaba, y «Todavía nadie.» / «Ninguna.» se leían antes
      de saberlo.
    */
    carga: estadoDe(query),
    cargaPermisoRecaudacion: estadoDe(permisoRecaudacion),
    cargaCarrusel: juntarCargas(estadoDe(cuotas), estadoDe(puntualidad)),
    cargaEstadoCuotas: juntarCargas(estadoDe(miCuota), estadoDe(detalle), estadoDe(visibilidad)),
    /** Propietarios, residentes y administración; ni portería ni huéspedes. */
    puedeVerRecaudacion: veRecaudacion,
    esHuesped,
    cargaGratitud: estadoDe(regalos),
    gratitudSabida,
    search,
    setSearch,
    filtered,
    cuotas: historial,
    miCuota: miCuota.data ?? null,
    detalleCuotas: detalle.data ?? [],
    visibilidadCuotas: visibilidad.data ?? "porcentaje",
    esAdmin,
    puedeVerPagina,
    sinPropiedades,
    puedeParticipar: esResidente,
    yaDioEsteMes,
    diasParaGratitud,
    showReconocimientoPopup,
    destinatario,
    /** Vecinos a los que se puede reconocer: los del cuadro, con cuenta. */
    candidatos: departamentos.filter((d) => d.responsableUsuarioId),
    handleOpenReconocimiento,
    cerrarReconocimiento,
  };
}
