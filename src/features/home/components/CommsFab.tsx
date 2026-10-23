import { theme } from "@/config";
import React, { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { navigateToRoute } from "@/navigation/helpers/navigation.helpers";
import { useAuthStore } from "@/stores";
import { permisosDeComunicacion } from "./permisosComunicacion";
import { useNavegacion } from "@/shared/hooks";

const IMAGEN_MENSAJES = require("@/assets/avatars/messaging.png");
const IMAGEN_CHAT = require("@/assets/avatars/chat.png");
const IMAGEN_LLAMAR = require("@/assets/avatars/call.png");

/**
 * El boton flotante de comunicaciones, como el del prototipo
 * (`_prototipo-web/src/features/home/components/CommsFab.jsx`): dos opciones
 * redondas con su dibujo y su nombre al lado, «Llamar» arriba y «Chat» debajo.
 *
 * Hasta el 23/10/2026 tenia una tercera, «Intercomunicador: llamar a
 * portería», con pastillas de texto en vez de los dibujos. El cliente pidió
 * hacerlo como el prototipo: no hay intercomunicador aparte, es directo
 * «Llamar», y en esa pantalla la llamada a la portería sale por internet
 * (`useLlamada`).
 *
 * La porteria tiene chat y llamadas **si el administrador se lo habilita**
 * (KT, tabla de roles): son `permisoChat` y `permisoLlamadas`, dos
 * interruptores en la pantalla de Seguridad. Solo se aplica a la porteria:
 * para un residente estas dos vias no dependen de ningun permiso.
 */
export function CommsFab() {
  const navigation = useNavegacion();
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

  const ir = (ruta: "Llamada" | "Chat") => {
    setExpanded(false);
    navigateToRoute(navigation, ruta);
  };

  return (
    <>
      {expanded && (
        <Pressable
          style={{ position: "absolute", inset: 0, zIndex: 98 }}
          onPress={() => setExpanded(false)}
          accessibilityLabel="Cerrar el menú"
        />
      )}
      <View
        style={{
          position: "absolute",
          bottom: 80,
          right: 16,
          zIndex: 99,
          alignItems: "flex-end",
          gap: 12,
        }}
      >
        {expanded && (
          <>
            {puedeLlamar ? (
              <OpcionDelMenu
                nombre="Llamar"
                imagen={IMAGEN_LLAMAR}
                sombra={theme.shadows.fabLlamar}
                onPress={() => ir("Llamada")}
              />
            ) : null}
            {puedeChatear ? (
              <OpcionDelMenu
                nombre="Chat"
                imagen={IMAGEN_CHAT}
                sombra={theme.shadows.fab}
                onPress={() => ir("Chat")}
              />
            ) : null}
          </>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={expanded ? "Cerrar el menú" : "Chat y llamadas"}
          onPress={() => setExpanded(!expanded)}
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            overflow: "hidden",
            backgroundColor: expanded ? theme.colors.text : theme.colors.secondary,
            alignItems: "center",
            justifyContent: "center",
            boxShadow: theme.shadows.md,
          }}
        >
          {expanded ? (
            <Text style={{ color: theme.colors.textInverse, fontSize: 22 }}>✕</Text>
          ) : (
            <Image
              source={IMAGEN_MENSAJES}
              style={{ width: 56, height: 56 }}
              resizeMode="cover"
            />
          )}
        </Pressable>
      </View>
    </>
  );
}

function OpcionDelMenu({
  nombre,
  imagen,
  sombra,
  onPress,
}: {
  nombre: string;
  imagen: number;
  sombra: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={nombre}
      onPress={onPress}
      style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
    >
      <Text
        style={{
          backgroundColor: theme.colors.bgCard,
          borderRadius: theme.radius.lg,
          paddingHorizontal: 12,
          paddingVertical: 6,
          fontSize: 14,
          fontWeight: "500",
          color: theme.colors.text,
          boxShadow: theme.shadows.card,
          overflow: "hidden",
        }}
      >
        {nombre}
      </Text>
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          overflow: "hidden",
          boxShadow: sombra,
        }}
      >
        <Image source={imagen} style={{ width: 52, height: 52 }} resizeMode="cover" />
      </View>
    </Pressable>
  );
}
