import { useEffect, useRef } from "react";
import * as Linking from "expo-linking";
import { supabase } from "@/shared/services/supabase";
import { anotarEnLaBase } from "@/shared/services/erroresDeLaApp";
import {
  escucharLlamadasNativas,
  tokenVoip,
  type EventoNativo,
} from "../services/llamadasNativas";

/** Los enlaces ya atendidos: el inicial se vuelve a leer en cada montaje. */
const yaAtendidos = new Set<string>();

/**
 * Lo que llega de fuera de la app sobre una llamada (28/10/2026):
 *
 *   · **Android**: la pantalla de llamada del APK (`plugins/llamada-entrante`)
 *     abre la app en `veciyo://llamada?id=…&accion=contestar`.
 *   · **iPhone**: CallKit avisa de «contestar» y «colgar», y PushKit da el
 *     token que la base necesita para despertar este iPhone
 *     (`dispositivo_voip`).
 *
 * Quien lo usa decide qué hacer: el `Intercomunicador`, que es quien contesta
 * y cuelga dentro de la app.
 */
export function useLlamadaDesdeFuera(
  usuarioId: string | null | undefined,
  acciones: {
    contestar: (llamadaId: string) => void;
    colgar: (llamadaId: string) => void;
    ver: () => void;
  },
) {
  // Las acciones cambian en cada render; los oyentes se montan una vez.
  const ultimas = useRef(acciones);
  ultimas.current = acciones;

  // Android: el enlace con el que la pantalla de llamada abre la app.
  useEffect(() => {
    if (!usuarioId) return;
    const atender = (url: string | null) => {
      if (!url) return;
      const { hostname, path, queryParams } = Linking.parse(url);
      if (hostname !== "llamada" && path !== "llamada") return;
      const id = typeof queryParams?.id === "string" ? queryParams.id : "";
      if (!id || yaAtendidos.has(url)) return;
      yaAtendidos.add(url);
      void anotarEnLaBase("rastro", "enlace de llamada", url);
      if (queryParams?.accion === "contestar") ultimas.current.contestar(id);
      else ultimas.current.ver();
    };
    void Linking.getInitialURL().then(atender);
    const suscripcion = Linking.addEventListener("url", ({ url }) => atender(url));
    return () => suscripcion.remove();
  }, [usuarioId]);

  // iPhone: CallKit y el token de PushKit.
  useEffect(() => {
    if (!usuarioId) return;
    const apuntar = (token: string) => {
      void supabase
        .rpc("apuntar_dispositivo_voip", { p_token: token, p_entorno: __DEV__ ? "desarrollo" : "produccion" })
        .then(({ error }) => {
          // Sin el token el iPhone recibe la llamada como aviso: no es para cortar nada.
          if (error) console.warn("No se pudo guardar el token de llamadas", error.message);
        });
    };
    const atender = (e: EventoNativo) => {
      if (e.evento === "tokenVoip") apuntar(e.token);
      else if (e.evento === "contestar") ultimas.current.contestar(e.llamadaId);
      else ultimas.current.colgar(e.llamadaId);
    };
    const { pendientes, dejar } = escucharLlamadasNativas(atender);
    pendientes.forEach(atender);
    const token = tokenVoip();
    if (token) apuntar(token);
    return dejar;
  }, [usuarioId]);
}
