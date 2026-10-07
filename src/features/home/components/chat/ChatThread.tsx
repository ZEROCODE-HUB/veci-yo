import { theme } from "@/config";
import React, { useRef, useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useGuardiasDeTurno } from "../../hooks/useGuardiasDeTurno";
import { EtiquetaVivienda } from "@/shared/components";
import type { Conversation, MensajeChat } from "@/shared/types";

interface ChatThreadProps {
  conversation: Conversation;
  messages: MensajeChat[];
  /** Si quien mira puede retirar mensajes ajenos. El propio siempre se puede. */
  puedeModerar?: boolean;
  retirando?: boolean;
  onRetirar?: (mensajeId: string) => void;
}

export function ChatThread({
  conversation,
  messages,
  puedeModerar = false,
  retirando = false,
  onRetirar,
}: ChatThreadProps) {
  const scrollRef = useRef<ScrollView>(null);
  const guardias = useGuardiasDeTurno();

  /*
    Que mensaje esta preguntando «seguro?».

    Dos pasos y no un dialogo del sistema: retirar **es de ida** --un
    disparador impide volver a publicar lo retirado-- y un toque accidental en
    un movil no puede llevarse lo que alguien escribio. Un `confirm()` tampoco
    sirve: en React Native no existe.
  */
  const [confirmando, setConfirmando] = useState<string | null>(null);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  return (
    <>
      {/* Security/Admin header info */}
      {conversation.nombre.startsWith("Seguridad") && (
        <View
          className="px-4 py-2 flex-row items-center gap-1.5"
          style={{
            backgroundColor: theme.colors.secondaryLight,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          }}
        >
          <Text>👮</Text>
          <Text
            className="text-xs"
            style={{ color: theme.colors.secondaryDark }}
          >
            Personal de seguridad de turno:{" "}
            <Text className="font-bold">
              {guardias.join(", ") || "sin turno asignado"}
            </Text>
          </Text>
        </View>
      )}
      {conversation.nombre.startsWith("Administración") && (
        <View
          className="px-4 py-2 flex-row items-center gap-1.5"
          style={{
            backgroundColor: theme.colors.successSoft,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          }}
        >
          <Text>🛡️</Text>
          <Text
            className="text-xs"
            style={{ color: theme.colors.badgeGreenText }}
          >
            Chat con <Text className="font-bold">Administración</Text> — el
            mensaje será visible para todo el equipo administrativo.
          </Text>
        </View>
      )}

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        className="flex-1 px-4 py-4"
        contentContainerClassName="gap-0.5"
      >
        {messages.length === 0 ? (
          <Text
            className="text-sm text-center py-10"
            style={{ color: theme.colors.textMuted }}
          >
            No hay mensajes en {conversation.nombre}
          </Text>
        ) : (
          messages.map((msg) => {
            const isGrupo = conversation.tipo === "grupo";
            // El prototipo comparaba contra el literal "portero", asi que
            // en el telefono de un residente sus propios mensajes salian del
            // lado equivocado. Y despues `de` valia "yo" para los propios,
            // asi que en un grupo el autor de los mios decia «yo».
            const isPortero = msg.esMio;
            return (
              <View
                key={String(msg.id)}
                className="flex-row items-start gap-2 py-1.5 px-2 mb-0.5"
                style={{
                  flexDirection: isGrupo
                    ? "row"
                    : isPortero
                      ? "row-reverse"
                      : "row",
                  backgroundColor: !msg.leido
                    ? theme.colors.chatBurbujaPropia
                    : "transparent",
                  borderRadius: !msg.leido ? 8 : 0,
                }}
              >
                <View
                  className="w-9 h-9 rounded-full items-center justify-center"
                  style={{
                    backgroundColor: isGrupo
                      ? theme.colors.chatAcentoSuave
                      : isPortero
                        ? theme.colors.comunicacionNeutro
                        : theme.colors.chatAcento,
                  }}
                >
                  <Text style={{ fontSize: 18 }}>
                    {msg.avatarEmoji || "👤"}
                  </Text>
                </View>
                <View className="flex-1">
                  {isGrupo && (
                    /*
                      El nombre y el depto, juntos. Lo pidio el cliente el
                      02/10/2026: en un grupo de residentes esto era un nombre
                      a secas, y con el alias encendido --«Vecino
                      Misterioso»-- no identificaba a nadie. El depto viene
                      congelado en el mensaje; la administracion y la porteria
                      no tienen, y entonces no se pinta etiqueta.
                    */
                    <View className="flex-row items-center gap-1.5 mb-0.5">
                      <Text
                        className="text-xs font-semibold"
                        style={{ color: theme.colors.primary }}
                      >
                        {msg.de}
                      </Text>
                      <EtiquetaVivienda codigo={msg.unidad} />
                    </View>
                  )}
                  {/*
                    La lápida. Un mensaje retirado deja hueco en vez de
                    desaparecer: lo decidió el cliente el 07/10/2026, y el
                    motivo es que si no, la conversación pierde mensajes en
                    silencio y después se discute sobre lo que se dijo.

                    Quién lo quitó se distingue a propósito: «me arrepentí» y
                    «lo moderó la administración» no son lo mismo para quien
                    lee el hueco. El texto no está aquí porque no sale de la
                    base.
                  */}
                  {msg.retiradoPor ? (
                    <Text
                      className="text-base italic"
                      style={{ lineHeight: 20, color: theme.colors.textMuted }}
                    >
                      {msg.retiradoPor === "administracion"
                        ? "Mensaje retirado por la administración"
                        : "Mensaje retirado"}
                    </Text>
                  ) : (
                    <Text
                      className="text-base text-gray-900"
                      style={{ lineHeight: 20 }}
                    >
                      {msg.texto}
                    </Text>
                  )}
                  <Text
                    className="text-xs mt-1"
                    style={{
                      color: theme.colors.textMuted,
                      textAlign: isGrupo
                        ? "left"
                        : isPortero
                          ? "right"
                          : "left",
                    }}
                  >
                    {msg.hora}
                    {"\n"}
                    {msg.fecha}
                  </Text>

                  {/*
                    Retirar. Hasta el 07/10/2026 **no habia ningun sitio desde
                    donde hacerlo**: la funcion estaba en la base, la politica
                    tambien, y el ultimo eslabon de la cadena faltaba, asi que
                    la moderacion que pidio el cliente no existia en la
                    practica. Es el defecto que este proyecto ya conoce --la
                    votacion estuvo igual durante semanas--.
                  */}
                  {!msg.retiradoPor && (msg.esMio || puedeModerar) ? (
                    confirmando === String(msg.id) ? (
                      <View className="flex-row items-center gap-3 mt-1">
                        <Text
                          className="text-xs"
                          style={{ color: theme.colors.textMuted }}
                        >
                          ¿Retirarlo? No se puede deshacer.
                        </Text>
                        <Pressable
                          accessibilityLabel="Confirmar que se retira el mensaje"
                          disabled={retirando}
                          onPress={() => {
                            onRetirar?.(String(msg.id));
                            setConfirmando(null);
                          }}
                        >
                          <Text
                            className="text-xs font-bold"
                            style={{ color: theme.colors.danger }}
                          >
                            Sí, retirar
                          </Text>
                        </Pressable>
                        <Pressable
                          accessibilityLabel="Dejar el mensaje como está"
                          onPress={() => setConfirmando(null)}
                        >
                          <Text
                            className="text-xs"
                            style={{ color: theme.colors.textSecondary }}
                          >
                            Cancelar
                          </Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable
                        accessibilityLabel={`Retirar el mensaje de ${msg.de}`}
                        onPress={() => setConfirmando(String(msg.id))}
                      >
                        <Text
                          className="text-xs mt-1"
                          style={{ color: theme.colors.textMuted }}
                        >
                          Retirar
                        </Text>
                      </Pressable>
                    )
                  ) : null}

                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </>
  );
}
