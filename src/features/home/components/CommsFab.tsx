import { theme } from "@/config";
import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { navigateToRoute } from "@/navigation/helpers/navigation.helpers";
import { useAuthStore } from "@/stores";
import { permisosDeComunicacion } from "./permisosComunicacion";
import { useNavegacion } from "@/shared/hooks";


/**
 * El boton flotante de comunicaciones, como el del prototipo
 * (`_prototipo-web/src/features/home/components/CommsFab.jsx`): dos opciones
 * redondas con su nombre al lado, «Llamar» arriba y «Chat» debajo.
 *
 * Los dibujos son íconos y no las imágenes del prototipo: esas miden unos 50
 * px, y recortadas en círculo se veían pixeladas y pegadas al borde (el
 * cliente, 23/10/2026). Se conservan sus colores: amarillo con el teléfono y el
 * globo, verde para llamar, azul para el chat.
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
                icono="call"
                fondo={theme.colors.success}
                sombra={theme.shadows.fabLlamar}
                onPress={() => ir("Llamada")}
              />
            ) : null}
            {puedeChatear ? (
              <OpcionDelMenu
                nombre="Chat"
                icono="chatbubble-ellipses"
                fondo={theme.colors.secondary}
                sombra={theme.shadows.md}
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
            backgroundColor: expanded ? theme.colors.text : theme.colors.primary,
            alignItems: "center",
            justifyContent: "center",
            boxShadow: expanded ? theme.shadows.md : theme.shadows.fab,
          }}
        >
          {expanded ? (
            <Ionicons name="close" size={26} color={theme.colors.textInverse} />
          ) : (
            // El teléfono con su globo, como el dibujo del prototipo.
            <View style={{ width: 30, height: 30 }}>
              <Ionicons
                name="call"
                size={22}
                color={theme.colors.text}
                style={{ position: "absolute", left: 0, bottom: 0 }}
              />
              <Ionicons
                name="chatbubble-ellipses"
                size={15}
                color={theme.colors.text}
                style={{ position: "absolute", right: 0, top: 0 }}
              />
            </View>
          )}
        </Pressable>
      </View>
    </>
  );
}

function OpcionDelMenu({
  nombre,
  icono,
  fondo,
  sombra,
  onPress,
}: {
  nombre: string;
  icono: React.ComponentProps<typeof Ionicons>["name"];
  fondo: string;
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
          backgroundColor: fondo,
          alignItems: "center",
          justifyContent: "center",
          boxShadow: sombra,
        }}
      >
        <Ionicons name={icono} size={24} color={theme.colors.textInverse} />
      </View>
    </Pressable>
  );
}
