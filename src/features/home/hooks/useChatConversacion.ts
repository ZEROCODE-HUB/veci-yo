import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores";
import { useUIStore } from "@/stores";
import {
  enviarMensaje,
  marcarLeida,
  obtenerMensajes,
  retirarMensaje,
} from "../services/chat.repo";
import { CHAT_QUERY_KEY } from "./useChatConversations";

export function useChatConversacion(conversacionId: string) {
  const queryClient = useQueryClient();
  const usuarioId = useAuthStore((s) => s.usuarioId ?? "");
  const usuario = useAuthStore((s) => s.usuario);
  const addToast = useUIStore((s) => s.addToast);

  const nombre =
    [usuario?.nombre, usuario?.apellido].filter(Boolean).join(" ") || "Yo";

  const query = useQuery({
    queryKey: [...CHAT_QUERY_KEY, conversacionId, "mensajes"],
    queryFn: () => obtenerMensajes(conversacionId, usuarioId),
    enabled: Boolean(conversacionId && usuarioId),
  });

  // Al abrir la conversación se marca hasta dónde leyó esta persona. Antes se
  // marcaba `leido: true` en el mensaje, que era compartido por todos.
  useEffect(() => {
    if (!conversacionId || !usuarioId) return;
    marcarLeida({ conversacionId, usuarioId })
      .then(() => queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEY }))
      .catch(() => {});
  }, [conversacionId, usuarioId, queryClient]);

  const enviar = useMutation({
    mutationFn: (texto: string) =>
      enviarMensaje({ conversacionId, texto, usuarioId, nombre }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEY }),
    onError: (error: Error) => addToast(error.message, "error"),
  });

  /*
    Retirar un mensaje. Lo puede hacer su autor, y en un canal tambien la
    administracion --la moderacion que pidio el cliente el 02/10/2026--.

    Quien puede lo decide la base: `retirar_mensaje` es `security invoker`, asi
    que si la politica no lo deja el `update` toca cero filas y la funcion
    avisa. Aqui no se adivina el permiso: se intenta y se cuenta lo que diga.
  */
  const retirar = useMutation({
    mutationFn: (mensajeId: string) => retirarMensaje(mensajeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEY });
      addToast("Mensaje retirado", "success");
    },
    onError: (error: Error) => addToast(error.message, "error"),
  });

  return {
    mensajes: query.data ?? [],
    cargando: query.isLoading,
    enviando: enviar.isPending,
    enviar: (texto: string) => enviar.mutate(texto),
    retirar: (mensajeId: string) => retirar.mutate(mensajeId),
    retirando: retirar.isPending,
  };
}
