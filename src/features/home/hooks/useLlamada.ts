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
  llamarPorInternet,
  sePuedeLlamarPorLaApp,
} from "@/features/intercom/services/intercom.repo";
import { useIntercomStore } from "@/features/intercom/intercom-store";
import { llamadaPorInternet } from "../helpers/llamadaPorInternet";

const LLAMADAS_QUERY_KEY = ["chat", "llamadas"];

/** Lo que elige el personal para llamar a una vivienda. */
const A_UNA_VIVIENDA = "vivienda";

/**
 * Llamadas.
 *
 * Hay dos formas de llamar, y la pantalla ofrece las dos cuando se puede:
 *
 *   · **por la app**, por internet (el intercomunicador, LiveKit). Desde el
 *     28/10/2026 entra también la administración: una vivienda llama a la
 *     portería o a la administración, la portería a una vivienda o a la
 *     administración, y la administración a una vivienda o a la portería;
 *   · **por teléfono**: se abre el marcador con el número puesto, y el
 *     número se enseña.
 *
 * Por la app, solo si al otro lado alguien recibe llamadas por la app: cada
 * persona lo elige en Perfil › Configuración. Si nadie, queda el teléfono.
 * Cada llamada queda anotada en el historial.
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

  // Las porterías y la administración, con sus teléfonos.
  const destinos = useQuery({
    queryKey: [...LLAMADAS_QUERY_KEY, "destinos", condominioId],
    queryFn: () => destinosDelEdificio(condominioId),
    enabled: Boolean(condominioId),
  });

  /** El personal llama a una vivienda salvo que elija otra cosa. */
  const aUnaVivienda =
    esPersonal && (destino === "" || destino === A_UNA_VIVIENDA);

  const contacto = useQuery({
    queryKey: [...LLAMADAS_QUERY_KEY, "vivienda", unidadId],
    queryFn: () => contactoDeLaVivienda(unidadId),
    enabled: aUnaVivienda && Boolean(unidadId),
  });

  const historial = useQuery({
    queryKey: [...LLAMADAS_QUERY_KEY, usuarioId],
    queryFn: obtenerHistorialLlamadas,
    enabled: Boolean(usuarioId),
  });

  const elegido = (destinos.data ?? []).find((d) => d.clave === destino);
  const vivienda = viviendas.find((v) => v.value === unidadId);

  /** A quién se va a llamar, con palabras, y a qué número. */
  const aQuien = aUnaVivienda ? (vivienda?.label ?? "") : (elegido?.etiqueta ?? "");
  /** Lo que se ve en la llamada en curso: con el nombre completo, si se sabe (29/10/2026). */
  const etiquetaDeLaLlamada =
    aUnaVivienda && contacto.data?.nombre && vivienda
      ? `${contacto.data.nombre} · ${vivienda.label}`
      : aQuien;
  const numero = aUnaVivienda ? (contacto.data?.numero ?? "") : (elegido?.numero ?? "");

  /** La llamada por la app que corresponde a lo elegido, si hay camino. */
  const porLaApp = llamadaPorInternet({
    rolActivo,
    destino: aUnaVivienda ? A_UNA_VIVIENDA : destino,
    unidadId,
    unidadActivaId: unidadActiva?.unidadId,
    condominioId,
  });

  // Y si al otro lado alguien las recibe.
  const recibe = useQuery({
    queryKey: [...LLAMADAS_QUERY_KEY, "por-la-app", condominioId, porLaApp],
    queryFn: () =>
      porLaApp ? sePuedeLlamarPorLaApp({ ...porLaApp, condominioId }) : false,
    enabled: Boolean(porLaApp) && Boolean(condominioId),
  });
  const porInternet = Boolean(porLaApp) && recibe.data === true;

  const buscando =
    (aUnaVivienda ? Boolean(unidadId) && contacto.isLoading : destinos.isLoading) ||
    (Boolean(porLaApp) && recibe.isLoading);

  /** Por qué no se puede llamar de ninguna forma. Vacío: se puede. */
  const motivo = !aQuien
    ? aUnaVivienda
      ? "Elige la vivienda a la que quieres llamar."
      : "Elige a quién quieres llamar."
    : buscando || porInternet || numero
      ? ""
      : `${aQuien} no recibe llamadas por la app y no tiene un teléfono registrado.`;

  /** Por qué no sale por la app, cuando sí se puede por teléfono. */
  const sinApp =
    aQuien && !buscando && !porInternet && numero
      ? `${aQuien} no recibe llamadas por la app: llama por teléfono.`
      : "";

  const anotar = useMutation({
    mutationFn: () =>
      registrarLlamadaRepo({
        condominioId,
        usuarioId,
        aNombre: aQuien,
        unidadId: aUnaVivienda
          ? unidadId || null
          : esPersonal
            ? null
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

  const llamarPorLaApp = async () => {
    if (!porLaApp || conectando) return;
    setConectando(true);
    try {
      const id = await llamarPorInternet(porLaApp);
      anotar.mutate();
      iniciarLlamada(id, true, etiquetaDeLaLlamada);
    } catch (e) {
      addToast(mensajeDeError(e, `No se pudo llamar a ${aQuien}`), "error");
      // Quizá apagó las llamadas por la app mientras tanto: se vuelve a preguntar.
      void queryClient.invalidateQueries({
        queryKey: [...LLAMADAS_QUERY_KEY, "por-la-app"],
      });
    } finally {
      setConectando(false);
    }
  };

  const llamarPorTelefono = async () => {
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

  const opcion = (d: { clave: string; etiqueta: string }) => ({
    value: d.clave,
    label: d.etiqueta,
  });
  const porterias = (destinos.data ?? [])
    .filter((d) => d.clave.startsWith("porteria:"))
    .map(opcion);
  const administracion = (destinos.data ?? [])
    .filter((d) => d.clave === "administracion")
    .map(opcion);

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
    destinos: (destinos.data ?? []).map(opcion),
    /**
     * Lo que elige el personal antes de la vivienda: la portería llama a una
     * vivienda o a la administración; la administración, a una vivienda o a
     * una portería.
     */
    opcionesDelPersonal: [
      { value: A_UNA_VIVIENDA, label: "A una vivienda" },
      ...(esAdministracion ? porterias : administracion),
    ],
    aUnaVivienda,
    destino: destino || (esPersonal ? A_UNA_VIVIENDA : ""),
    setDestino,
    aQuien,
    /** El nombre de quien contesta en la vivienda, si se sabe. */
    nombreDelContacto: aUnaVivienda ? (contacto.data?.nombre ?? "") : "",
    numero,
    buscando: buscando || conectando,
    porInternet,
    motivo,
    sinApp,
    llamarPorLaApp,
    llamarPorTelefono,
    avatarEmoji: aUnaVivienda
      ? "🏢"
      : destino === "administracion"
        ? "🛡️"
        : "👮",
    historial: historialDelDestino,
  };
}
