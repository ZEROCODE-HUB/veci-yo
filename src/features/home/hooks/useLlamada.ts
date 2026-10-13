import { useMemo, useState } from "react";
import { Linking } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore, useUIStore } from "@/stores";
import {
  useCondominioActivo,
  useUnidadActiva,
  useUnidadesDisponibles,
} from "@/shared/hooks";
import { mensajeDeError } from "@/shared/utils/error.util";
import {
  obtenerHistorialLlamadas,
  registrarLlamada as registrarLlamadaRepo,
} from "../services/chat.repo";
import {
  contactoDeLaVivienda,
  destinosDelEdificio,
} from "../services/llamadas.repo";

const LLAMADAS_QUERY_KEY = ["chat", "llamadas"];

/**
 * Llamadas.
 *
 * La aplicación **no cursa la llamada: abre el marcador del teléfono** con el
 * número ya puesto, y deja anotado a quién se llamó. Lo decidió el cliente el
 * 13/10/2026. Hasta ese día era un simulacro: «Llamada en curso», un contador
 * que arrancaba en 00:15, y «Rechazar» que guardaba una llamada perdida que no
 * había existido.
 *
 * Un vecino llama a una portería o a la administración; el personal llama a
 * una vivienda.
 */
export function useLlamada() {
  const queryClient = useQueryClient();
  const rolActivo = useAuthStore((s) => s.rolActivo);
  const usuarioId = useAuthStore((s) => s.usuarioId ?? "");
  const condominioId = useCondominioActivo() ?? "";
  const addToast = useUIStore((s) => s.addToast);
  const { unidades } = useUnidadesDisponibles();
  // La vivienda **elegida**: con dos, la llamada se anotaba siempre a la primera.
  const unidadActiva = useUnidadActiva();

  const esPersonal = rolActivo === "guardia" || rolActivo === "administrador";

  const torres = useMemo(
    () => [...new Set(unidades.map((u) => u.torre))].sort(),
    [unidades],
  );
  const [torre, setTorre] = useState("");
  const [unidadId, setUnidadId] = useState("");
  const [destino, setDestino] = useState("");

  const viviendas = useMemo(
    () =>
      unidades
        .filter((u) => !torre || u.torre === torre)
        .map((u) => ({ value: u.unidadId, label: `Departamento ${u.codigo}` })),
    [unidades, torre],
  );

  const destinos = useQuery({
    queryKey: [...LLAMADAS_QUERY_KEY, "destinos", condominioId],
    queryFn: () => destinosDelEdificio(condominioId),
    enabled: !esPersonal && Boolean(condominioId),
  });

  const contacto = useQuery({
    queryKey: [...LLAMADAS_QUERY_KEY, "vivienda", unidadId],
    queryFn: () => contactoDeLaVivienda(unidadId),
    enabled: esPersonal && Boolean(unidadId),
  });

  const historial = useQuery({
    queryKey: [...LLAMADAS_QUERY_KEY, usuarioId],
    queryFn: obtenerHistorialLlamadas,
    enabled: Boolean(usuarioId),
  });

  const elegido = (destinos.data ?? []).find((d) => d.clave === destino);
  const vivienda = viviendas.find((v) => v.value === unidadId);

  /** A quién se va a llamar, con palabras, y a qué número. */
  const aQuien = esPersonal ? (vivienda?.label ?? "") : (elegido?.etiqueta ?? "");
  const numero = esPersonal ? (contacto.data?.numero ?? "") : (elegido?.numero ?? "");
  const buscando = esPersonal
    ? Boolean(unidadId) && contacto.isLoading
    : destinos.isLoading;

  /** Por qué no se puede llamar todavía. Vacío: se puede. */
  const motivo = !aQuien
    ? esPersonal
      ? "Elige la vivienda a la que quieres llamar."
      : "Elige a quién quieres llamar."
    : buscando
      ? ""
      : numero
        ? ""
        : esPersonal
          ? "Esa vivienda no tiene un teléfono de contacto visible."
          : `${aQuien} no tiene un teléfono registrado.`;

  const anotar = useMutation({
    mutationFn: () =>
      registrarLlamadaRepo({
        condominioId,
        usuarioId,
        aNombre: aQuien,
        unidadId: esPersonal
          ? unidadId || null
          : (unidadActiva?.unidadId ?? null),
        tipo: "saliente",
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: LLAMADAS_QUERY_KEY }),
    // Que no quede anotada no impide llamar: se dice y se sigue.
    onError: (fallo) =>
      addToast(
        mensajeDeError(fallo, "La llamada no quedó anotada en el historial"),
        "error",
      ),
  });

  const llamar = async () => {
    if (!numero) return;
    anotar.mutate();
    try {
      await Linking.openURL(`tel:${numero}`);
    } catch {
      addToast(`No se pudo abrir el marcador. Marca ${numero}.`, "error");
    }
  };

  const historialDelDestino = useMemo(
    () =>
      (historial.data ?? [])
        .filter((item) => !aQuien || item.contacto === aQuien)
        .slice(0, 10),
    [historial.data, aQuien],
  );

  return {
    esPersonal,
    torres,
    torre,
    cambiarTorre: (valor: string) => {
      setTorre(valor);
      setUnidadId("");
    },
    viviendas,
    unidadId,
    setUnidadId,
    destinos: (destinos.data ?? []).map((d) => ({
      value: d.clave,
      label: d.etiqueta,
    })),
    destino,
    setDestino,
    aQuien,
    /** El nombre de quien contesta en la vivienda, si se sabe. */
    nombreDelContacto: esPersonal ? (contacto.data?.nombre ?? "") : "",
    numero,
    buscando,
    motivo,
    llamar,
    avatarEmoji: esPersonal
      ? "🏢"
      : destino === "administracion"
        ? "🛡️"
        : "👮",
    historial: historialDelDestino,
  };
}
