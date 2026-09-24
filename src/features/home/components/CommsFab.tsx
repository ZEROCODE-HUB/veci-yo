import { theme } from "@/config";
import React, { useState } from "react";
import { View, Pressable, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { navigateToRoute } from "@/navigation/helpers/navigation.helpers";
import { useAuthStore } from "@/stores";
import { permisosDeComunicacion } from "./permisosComunicacion";

/**
 * El boton flotante de comunicaciones.
 *
 * La porteria tiene chat y llamadas **si el administrador se lo habilita**
 * (KT, tabla de roles): son `permisoChat` y `permisoLlamadas`, dos
 * interruptores en la pantalla de Seguridad.
 *
 * No los miraba nadie. Este boton se pintaba igual para todos los roles, asi
 * que un guardia con los dos apagados seguia teniendo chat y llamadas, y los
 * interruptores del administrador eran decoracion --el septimo y el octavo
 * caso de lo mismo en este proyecto--. La consulta de sesion ni siquiera
 * cargaba la columna.
 *
 * Solo se aplica a la porteria: para un residente estas dos vias no dependen de
 * ningun permiso, y recortarselas seria inventar una regla que nadie pidio.
 */
export function CommsFab() {
  const navigation = useNavigation<any>();
  const [expanded, setExpanded] = useState(false);
  const rolActivo = useAuthStore((s) => s.rolActivo);
  const condominios = useAuthStore((s) => s.condominios);

  // La regla vive en `permisosDeComunicacion`, aparte, para poder invertirla en
  // una prueba: si no, sería otra casilla que nadie comprueba.
  const { puedeChatear, puedeLlamar } = permisosDeComunicacion({
    rolActivo,
    permisos: condominios.find((c) => c.rol === "guardia")?.permisos,
  });

  // Sin ninguna de las dos, el boton no tiene nada que ofrecer.
  if (!puedeChatear && !puedeLlamar) return null;

  return (
    <>
      {expanded && (
        <Pressable
          style={{ position: "absolute", inset: 0, zIndex: 98 }}
          onPress={() => setExpanded(false)}
        />
      )}
      <View
        style={{
          position: "absolute",
          bottom: 80,
          right: 16,
          zIndex: 99,
          alignItems: "flex-end",
          gap: 10,
        }}
      >
        {expanded && (
          <>
            {puedeChatear && (
              <Pressable
                onPress={() => {
                  setExpanded(false);
                  navigateToRoute(navigation, "Chat");
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  backgroundColor: theme.colors.bgCard,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 20,
                  boxShadow: theme.shadows.cardFuerte,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: theme.colors.text,
                  }}
                >
                  Chat
                </Text>
                <Ionicons
                  name="chatbubble-outline"
                  size={18}
                  color={theme.colors.secondary}
                />
              </Pressable>
            )}
            {puedeLlamar && (
              <Pressable
                onPress={() => {
                  setExpanded(false);
                  navigateToRoute(navigation, "Llamada");
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  backgroundColor: theme.colors.bgCard,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 20,
                  boxShadow: theme.shadows.cardFuerte,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: theme.colors.text,
                  }}
                >
                  Llamar
                </Text>
                <Ionicons
                  name="call-outline"
                  size={18}
                  color={theme.colors.success}
                />
              </Pressable>
            )}
          </>
        )}
        <Pressable
          onPress={() => setExpanded(!expanded)}
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: theme.colors.primary,
            alignItems: "center",
            justifyContent: "center",
            boxShadow: theme.shadows.fab,
          }}
        >
          <Ionicons
            name={expanded ? "close" : "chatbubbles"}
            size={24}
            color={theme.colors.text}
          />
        </Pressable>
      </View>
    </>
  );
}
