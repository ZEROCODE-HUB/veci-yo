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
import {
  llamarAPorteria,
  llamarAVivienda,
} from "@/features/intercom/services/intercom.repo";
import { useIntercomStore } from "@/features/intercom/intercom-store";
import { llamadaPorInternet } from "../helpers/llamadaPorInternet";

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
 *
 * Desde el 23/10/2026 es **la única puerta para llamar**, como en el
 * prototipo: el botón flotante tenía además «Intercomunicador: llamar a
 * portería» y la portería una tarjeta «Intercomunicador», y el cliente pidió
 * quitarlos. Así que aquí se decide por dónde sale la llamada:
 *
 *   · un vecino a una portería, y la portería a una vivienda: **por internet,
 *     dentro de la app** (el intercomunicador, LiveKit);
 *   · a la administración, o la administración a una vivienda: el marcador
 *     del teléfono, porque para eso no hay llamada por internet.
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
  const esAdministracion = rolActivo === "administrador";
  const iniciarLlamada = useIntercomStore((s) => s.iniciar);
  const [conectando, setConectando] = useState(false);

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
    // La administración también: llama a una vivienda o a una portería.
    enabled: (!esPersonal || esAdministracion) && Boolean(condominioId),
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

  /*
    La administración llama a una vivienda o a una portería de su edificio. Lo
    segundo no existía y la T-199 lo pedía (28/10/2026): sale por el teléfono
    de la portería, porque la administración no tiene llamada por internet.
  */
  const aUnaPorteria = esAdministracion && destino.startsWith("porteria:");
  const aUnaVivienda = esPersonal && !aUnaPorteria;

  /** A quién se va a llamar, con palabras, y a qué número. */
  const aQuien = aUnaVivienda ? (vivienda?.label ?? "") : (elegido?.etiqueta ?? "");
  const numero = aUnaVivienda ? (contacto.data?.numero ?? "") : (elegido?.numero ?? "");

  /** La llamada sale por internet, sin número de teléfono. */
  const porInternet = llamadaPorInternet({
    rolActivo,
    destino,
    unidadId,
    unidadActivaId: unidadActiva?.unidadId,
  });

  const buscando = aUnaVivienda
    ? Boolean(unidadId) && contacto.isLoading && !porInternet
    : destinos.isLoading;

  /** Por qué no se puede llamar todavía. Vacío: se puede. */
  const motivo = !aQuien
    ? aUnaVivienda
      ? "Elige la vivienda a la que quieres llamar."
      : "Elige a quién quieres llamar."
    : buscando || porInternet
      ? ""
      : numero
        ? ""
        : aUnaVivienda
          ? "Esa vivienda no tiene un teléfono de contacto visible."
          : `${aQuien} no tiene un teléfono registrado.`;

  const anotar = useMutation({
    mutationFn: () =>
      registrarLlamadaRepo({
        condominioId,
        usuarioId,
        aNombre: aQuien,
        unidadId: aUnaPorteria
          ? null
          : esPersonal
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
    if (porInternet) {
      if (conectando) return;
      setConectando(true);
      try {
        const id = esPersonal
          ? await llamarAVivienda(unidadId)
          : await llamarAPorteria(unidadActiva?.unidadId ?? "");
        anotar.mutate();
        iniciarLlamada(id, true, aQuien);
      } catch (e) {
        addToast(mensajeDeError(e, `No se pudo llamar a ${aQuien}`), "error");
      } finally {
        setConectando(false);
      }
      return;
    }
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
    /** Las porterías del edificio, para la administración. */
    porterias: (destinos.data ?? [])
      .filter((d) => d.clave.startsWith("porteria:"))
      .map((d) => ({ value: d.clave, label: d.etiqueta })),
    esAdministracion,
    destino,
    setDestino,
    aQuien,
    /** El nombre de quien contesta en la vivienda, si se sabe. */
    nombreDelContacto: aUnaVivienda ? (contacto.data?.nombre ?? "") : "",
    numero,
    buscando: buscando || conectando,
    porInternet,
    motivo,
    llamar,
    avatarEmoji: aUnaVivienda
      ? "🏢"
      : destino === "administracion"
        ? "🛡️"
        : "👮",
    historial: historialDelDestino,
  };
}
