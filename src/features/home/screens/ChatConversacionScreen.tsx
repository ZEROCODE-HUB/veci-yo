import React, { useLayoutEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { EvitarTeclado } from "@/shared/layouts/EvitarTeclado";
import { theme } from "@/config";
import { useRoute } from "@react-navigation/native";
import { useHeaderHeight } from "@react-navigation/elements";
import type { RouteProp } from "@react-navigation/native";
import type { SharedStackParamList, Conversation } from "@/shared/types";
import { ChatComposer, ChatThread } from "../components/chat";
import { useChatConversations } from "../hooks/useChatConversations";
import { useChatConversacion } from "../hooks/useChatConversacion";
import { useNavegacion } from "@/shared/hooks";
import { useUIStore } from "@/stores";
import { mensajeDeError } from "@/shared/utils/error.util";
import { elegirDocumento } from "@/shared/services/elegir-archivo";
import type { ArchivoElegido } from "@/shared/services/archivos";

export function ChatConversacionScreen() {
  const navigation = useNavegacion();
  const route = useRoute<RouteProp<SharedStackParamList, "ChatConversacion">>();
  const alturaCabecera = useHeaderHeight();
  const conversacionId = route.params.conversationId;
  const [texto, setTexto] = useState("");
  const addToast = useUIStore((s) => s.addToast);

  const { conversations, carga: cargaDeLaLista } = useChatConversations({
    soloNoLeidos: false,
    filtroChat: "todos",
    tabActiva: "torres",
    filtroTorre: "",
    filtroDepto: "",
  });

  const { mensajes, carga, enviar, enviando, puedeModerar, retirando, retirar } =
    useChatConversacion(conversacionId);

  const conversation = useMemo<Conversation>(
    () =>
      conversations.find((item) => item.id === conversacionId) ?? {
        id: conversacionId,
        tipo: "individual",
        nombre: "Conversación",
        ultimoMensaje: "",
        ultimaHora: "",
        ultimaFecha: "",
        avatarEmoji: "💬",
        noLeidos: 0,
      },
    [conversations, conversacionId],
  );

  /*
    Mientras llega la lista, el título se queda en blanco: antes decía
    «Conversación» y saltaba al nombre de verdad (13/11/2026).
  */
  const titulo = cargaDeLaLista.cargando ? "" : conversation.nombre;
  useLayoutEffect(() => {
    navigation.setOptions({ title: titulo });
  }, [titulo, navigation]);

  /** Una foto o un PDF elegido para mandar con el mensaje (hueco 8). */
  const [adjunto, setAdjunto] = useState<ArchivoElegido | null>(null);

  const handleSend = () => {
    const mensaje = texto.trim();
    if ((!mensaje && !adjunto) || enviando) return;
    /*
      El campo se vacía **cuando el mensaje salió**. Se vaciaba al pulsar: si
      el envío fallaba, lo escrito se había perdido y había que teclearlo otra
      vez.
    */
    enviar(mensaje, adjunto)
      .then(() => {
        setTexto((actual) => (actual.trim() === mensaje ? "" : actual));
        setAdjunto(null);
      })
      // El motivo ya salió en pantalla (`onError` del hook).
      .catch(() => undefined);
  };

  return (
    /*
      También en Android: la app se dibuja de borde a borde y el sistema ya no
      achica la ventana, así que el teclado tapaba la caja de escribir
      (auditoría de responsividad, 24/10/2026). Lo mismo que `ScreenLayout`.
    */
    <EvitarTeclado
      style={{ flex: 1 }}
      /*
        La cabecera de la pantalla queda por encima de esta vista, y
        `KeyboardAvoidingView` mide desde su propio borde: sin descontarla, se
        quedaba corta justo el alto de la cabecera y el teclado seguía tapando
        lo que se escribía (Para Claude 125, 28/10/2026). Eso es Android; en el
        iPhone `EvitarTeclado` mide en la pantalla y no lo necesita (09/11/2026).
      */
      keyboardVerticalOffset={alturaCabecera}
      medirEnAndroid
    >
      <View className="flex-1 bg-white">
        <ChatThread
          conversation={conversation}
          messages={mensajes}
          puedeModerar={puedeModerar}
          retirando={retirando}
          onRetirar={retirar}
          carga={carga}
        />
        {conversation.archivado ? (
          /*
            Un canal archivado conserva lo dicho y no recibe mas: lo rechaza un
            disparador en la base. Ofrecer la caja de escribir seria un control
            que siempre falla, que es peor que no tenerlo.
          */
          <View
            className="px-4 py-3"
            style={{
              borderTopWidth: 1,
              borderTopColor: theme.colors.border,
              backgroundColor: theme.colors.bgMuted,
            }}
          >
            <Text
              className="text-sm text-center"
              style={{ color: theme.colors.textMuted }}
            >
              Este canal está archivado. Se puede leer, no escribir.
            </Text>
          </View>
        ) : (
          <ChatComposer
            value={texto}
            onChangeText={setTexto}
            onSend={handleSend}
            adjunto={adjunto}
            onAdjuntar={async () => {
              try {
                const elegido = await elegirDocumento();
                if (elegido) setAdjunto(elegido);
              } catch (e) {
                addToast(mensajeDeError(e, "No se pudo elegir el archivo"), "error");
              }
            }}
            onQuitarAdjunto={() => setAdjunto(null)}
            enviando={enviando}
          />
        )}
      </View>
    </EvitarTeclado>
  );
}
