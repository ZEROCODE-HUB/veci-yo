import { theme } from "@/config";
import React, { useRef, useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useGuardiasDeTurno } from "../../hooks/useGuardiasDeTurno";
import { EtiquetaVivienda } from "@/shared/components";
import type { Conversation, MensajeChat } from "@/shared/types";
import { nombreDelDia } from "../../helpers/chatHelpers";
import { AdjuntoDelMensaje } from "./AdjuntoDelMensaje";

interface ChatThreadProps {
  conversation: Conversation;
  messages: MensajeChat[];
  /** Si quien mira puede retirar mensajes ajenos. El propio siempre se puede. */
  puedeModerar?: boolean;
  retirando?: boolean;
  onRetirar?: (mensajeId: string) => void;
}

/** Hasta dónde se estira la conversación en una pantalla ancha. */
export const ANCHO_DEL_CHAT = 760;

/**
 * La conversación, con burbujas (17/10/2026).
 *
 * Hasta ese día cada mensaje era una fila suelta: el propio pegado a la
 * izquierda con el avatar en el otro extremo, la hora y la fecha apiladas en
 * dos líneas, y un «Retirar» flotando debajo. No se distinguía de un vistazo
 * qué había escrito cada quien. Ahora lo mío va a la derecha en amarillo, lo
 * ajeno a la izquierda en blanco, y los días se separan con «Hoy» o «Ayer».
 */
export function ChatThread({
  conversation,
  messages,
  puedeModerar = false,
  retirando = false,
  onRetirar,
}: ChatThreadProps) {
  const scrollRef = useRef<ScrollView>(null);
  const guardias = useGuardiasDeTurno();
  const isGrupo = conversation.tipo === "grupo";

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
    <View className="flex-1" style={{ backgroundColor: theme.colors.chatFondo }}>
      {conversation.nombre.startsWith("Seguridad") && (
        <Aviso
          icono="👮"
          fondo={theme.colors.secondaryLight}
          color={theme.colors.secondaryDark}
        >
          Personal de seguridad de turno:{" "}
          <Text className="font-bold">
            {guardias.join(", ") || "sin turno asignado"}
          </Text>
        </Aviso>
      )}
      {conversation.nombre.startsWith("Administración") && (
        <Aviso
          icono="🛡️"
          fondo={theme.colors.successSoft}
          color={theme.colors.badgeGreenText}
        >
          Lo que escribas aquí lo ve todo el equipo de la administración.
        </Aviso>
      )}

      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 12,
          paddingVertical: 12,
          width: "100%",
          maxWidth: ANCHO_DEL_CHAT,
          alignSelf: "center",
        }}
      >
        {messages.length === 0 ? (
          <View className="items-center py-16 gap-2">
            <Text style={{ fontSize: 36 }}>💬</Text>
            <Text
              className="text-sm text-center"
              style={{ color: theme.colors.textMuted }}
            >
              Todavía no hay mensajes. Escribe el primero.
            </Text>
          </View>
        ) : (
          messages.map((msg, i) => {
            const anterior = messages[i - 1];
            const nuevoDia = !anterior || anterior.fecha !== msg.fecha;
            // El autor y su avatar solo cuando cambia: varios seguidos de la
            // misma persona se leen como un bloque.
            const mismoAutor =
              !nuevoDia &&
              anterior?.esMio === msg.esMio &&
              anterior?.de === msg.de;
            // El prototipo comparaba contra el literal "portero", asi que en
            // el telefono de un residente sus propios mensajes salian del lado
            // equivocado. Y despues `de` valia "yo" para los propios.
            const mio = msg.esMio;
            const puedeRetirar = !msg.retiradoPor && (mio || puedeModerar);

            return (
              <View key={String(msg.id)}>
                {nuevoDia ? (
                  <View className="items-center my-3">
                    <View
                      className="rounded-full px-3 py-1"
                      style={{ backgroundColor: theme.colors.chatSeparador }}
                    >
                      <Text
                        className="text-xs font-medium"
                        style={{ color: theme.colors.textSecondary }}
                      >
                        {nombreDelDia(msg.fecha)}
                      </Text>
                    </View>
                  </View>
                ) : null}

                <View
                  className="flex-row items-end gap-2"
                  style={{
                    justifyContent: mio ? "flex-end" : "flex-start",
                    marginTop: mismoAutor ? 2 : 8,
                  }}
                >
                  {/* En un grupo, quién habla; en una de dos ya se sabe. */}
                  {isGrupo && !mio ? (
                    <View
                      className="w-8 h-8 rounded-full items-center justify-center"
                      style={{
                        backgroundColor: theme.colors.chatAcentoSuave,
                        opacity: mismoAutor ? 0 : 1,
                      }}
                    >
                      <Text style={{ fontSize: 15 }}>
                        {msg.avatarEmoji || "👤"}
                      </Text>
                    </View>
                  ) : null}

                  <View style={{ maxWidth: "80%" }}>
                    <View
                      className="px-3 py-2"
                      style={{
                        backgroundColor: mio
                          ? theme.colors.chatBurbujaMia
                          : theme.colors.bgCard,
                        borderRadius: 16,
                        borderBottomRightRadius: mio ? 4 : 16,
                        borderBottomLeftRadius: mio ? 16 : 4,
                        borderWidth: mio ? 0 : 1,
                        borderColor: theme.colors.borderLight,
                      }}
                    >
                      {isGrupo && !mio && !mismoAutor ? (
                        /*
                          El nombre y el depto, juntos. Lo pidio el cliente el
                          02/10/2026: con el alias encendido --«Vecino
                          Misterioso»-- un nombre a secas no identificaba a
                          nadie. La administracion y la porteria no tienen
                          depto, y entonces no se pinta etiqueta.
                        */
                        <View className="flex-row items-center gap-1.5 mb-0.5">
                          <Text
                            className="text-xs font-semibold"
                            style={{ color: theme.colors.secondaryDark }}
                          >
                            {msg.de}
                          </Text>
                          <EtiquetaVivienda codigo={msg.unidad} />
                        </View>
                      ) : null}
                      {/*
                        La lápida. Un mensaje retirado deja hueco en vez de
                        desaparecer (decisión del cliente, 07/10/2026): si no,
                        la conversación pierde mensajes en silencio. Quién lo
                        quitó se distingue: «me arrepentí» y «lo moderó la
                        administración» no son lo mismo para quien lee.
                      */}
                      {msg.retiradoPor ? (
                        <Text
                          className="text-sm italic"
                          style={{ color: theme.colors.textMuted }}
                        >
                          {msg.retiradoPor === "administracion"
                            ? "Mensaje retirado por la administración"
                            : "Mensaje retirado"}
                        </Text>
                      ) : (
                        <>
                          {msg.adjunto ? (
                            <AdjuntoDelMensaje adjunto={msg.adjunto} />
                          ) : null}
                          {/* Solo el nombre del archivo ya lo dice el adjunto. */}
                          {msg.adjunto && msg.texto === `📎 ${msg.adjunto.nombre}` ? null : (
                            <Text
                              className="text-base"
                              style={{ lineHeight: 21, color: theme.colors.text }}
                            >
                              {msg.texto}
                            </Text>
                          )}
                        </>
                      )}
                      <Text
                        className="text-[11px] mt-0.5"
                        style={{
                          color: theme.colors.textMuted,
                          alignSelf: "flex-end",
                        }}
                      >
                        {msg.hora}
                      </Text>
                    </View>

                    {/*
                      Retirar. Hasta el 07/10/2026 no habia ningun sitio desde
                      donde hacerlo: la funcion y la politica estaban, y faltaba
                      el ultimo eslabon de la cadena.
                    */}
                    {puedeRetirar ? (
                      confirmando === String(msg.id) ? (
                        <View
                          className="flex-row items-center gap-3 mt-1 flex-wrap"
                          style={{ alignSelf: mio ? "flex-end" : "flex-start" }}
                        >
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
                          style={{ alignSelf: mio ? "flex-end" : "flex-start" }}
                          hitSlop={6}
                        >
                          <Text
                            className="text-[11px] mt-0.5 px-1"
                            style={{ color: theme.colors.textMuted }}
                          >
                            Retirar
                          </Text>
                        </Pressable>
                      )
                    ) : null}
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

/** La franja de arriba que dice quién contesta en esta conversación. */
function Aviso({
  icono,
  fondo,
  color,
  children,
}: {
  icono: string;
  fondo: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <View
      className="px-4 py-2"
      style={{
        backgroundColor: fondo,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
      }}
    >
      <View
        className="flex-row items-center gap-2"
        style={{ width: "100%", maxWidth: ANCHO_DEL_CHAT, alignSelf: "center" }}
      >
        <Text>{icono}</Text>
        <Text className="text-xs flex-1" style={{ color }}>
          {children}
        </Text>
      </View>
    </View>
  );
}
