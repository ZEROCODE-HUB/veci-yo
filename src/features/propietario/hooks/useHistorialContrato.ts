import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { useUIStore } from "@/stores/ui-store";
import { useUnidadActiva } from "@/shared/hooks";
import {
  cerrarContrato,
  crearContrato,
  obtenerContratos,
  type Contrato,
  type NuevoContrato,
} from "../services/contratos.repo";
import { obtenerResidentes } from "../services/residentes.repo";
import { useReglaDetalle } from "@/features/reglas/hooks/useReglaDetalle";
import { mensajeDeError } from "@/shared/utils/error.util";

/**
 * El historial de contratos de la vivienda.
 *
 * La pantalla llevaba dos contratos escritos a mano —"N° 16548", uno "Activa"
 * y otro "Finalizado"— y, debajo, el texto completo de los términos de
 * arrendamiento **copiado del reglamento**: literalmente el mismo que ya vive
 * en la tabla `reglamento` para el residente permanente.
 *
 * Así que los términos generales salen de ahí, que es su sitio y donde el
 * condominio puede cambiarlos, y el contrato solo lleva sus cláusulas
 * particulares si las tiene.
 */
export function useHistorialContrato() {
  const unidad = useUnidadActiva();
  const unidadId = unidad?.unidadId ?? "";

  const query = useQuery({
    queryKey: ["contratos", unidadId],
    queryFn: () => obtenerContratos(unidadId),
    enabled: Boolean(unidadId),
  });

  const reglamento = useReglaDetalle("residente-permanente");

  /** Los términos generales, como párrafos, desde el reglamento del edificio. */
  const terminosGenerales = (reglamento.content?.sections ?? []).flatMap(
    (seccion) => [
      ...(seccion.title ? [seccion.title] : []),
      ...seccion.items.map((item) => `· ${item}`),
    ],
  );

  /*
    A quién se le alquila. Son las personas que ya están en la vivienda: un
    contrato no da de alta a nadie —eso es una invitación— y esta pantalla no
    duplica ese flujo.
  */
  const { data: residentes = [] } = useQuery({
    queryKey: ["propietario", "residentes-unidad", unidadId],
    queryFn: () => obtenerResidentes(unidadId),
    enabled: Boolean(unidadId),
  });

  const client = useQueryClient();
  const usuarioId = useAuthStore((s) => s.usuarioId ?? "");
  const addToast = useUIStore((s) => s.addToast);
  const [altaAbierta, setAltaAbierta] = useState(false);

  const refrescar = () =>
    client.invalidateQueries({ queryKey: ["contratos", unidadId] });

  const avisar = (error: unknown, respaldo: string) =>
    addToast(mensajeDeError(error, respaldo), "error");

  const registrar = useMutation({
    // La moneda no se manda: la pone el condominio, que es quien sabe en qué
    // cobra. Pedírsela a la pantalla solo abre la puerta a un contrato de
    // Bogotá en soles.
    mutationFn: (datos: Omit<NuevoContrato, "unidadId" | "moneda">) =>
      crearContrato({ ...datos, unidadId }, usuarioId),
    onSuccess: () => {
      refrescar();
      addToast("Contrato registrado", "success");
      setAltaAbierta(false);
    },
    onError: (error) => avisar(error, "No se pudo registrar el contrato"),
  });

  const cerrar = useMutation({
    mutationFn: ({
      contratoId,
      estado,
    }: {
      contratoId: string;
      estado: "finalizado" | "cancelado";
    }) => cerrarContrato(contratoId, estado),
    onSuccess: () => {
      refrescar();
      addToast("Contrato actualizado", "success");
    },
    onError: (error) => avisar(error, "No se pudo cerrar el contrato"),
  });

  return {
    contratos: query.data ?? [],
    cargando: query.isLoading,
    terminosGenerales,
    /** Quiénes pueden figurar como inquilinos: los de la vivienda. */
    candidatos: residentes.filter((r) => r.rol !== "Propietario"),
    altaAbierta,
    setAltaAbierta,
    registrar,
    cerrar,
  };
}

export type { Contrato };
