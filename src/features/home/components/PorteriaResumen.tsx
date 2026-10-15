import React, { useState } from "react";
import { Image, Pressable, Text, View, type ImageSourcePropType } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/config";
import { Modal, Button } from "@/shared/components";
import { useAuthStore } from "@/stores";
import { useVisitas } from "@/features/visitas/hooks";
import { navigateToRoute } from "@/navigation/helpers/navigation.helpers";
import { useCondominioActivo, useNavegacion } from "@/shared/hooks";
import { permisosDeComunicacion } from "./permisosComunicacion";
import { EstacionamientosDeVisitaModal } from "./EstacionamientosDeVisitaModal";
import { LlamarAVivienda } from "@/features/intercom/components/LlamarAVivienda";

const imagenPorteria = require("@/assets/icons/home/finales/visitas-porteria.png");
const imagenVisitas = require("@/assets/icons/home/finales/visitas-porteria.png");
const imagenCorrespondencia = require("@/assets/icons/home/correspondencia.png");
const imagenZonas = require("@/assets/icons/home/zonascomunes.png");
const imagenDirectorio = require("@/assets/icons/comunidad/paginas-amarillas.png");
const imagenLlamar = require("@/assets/icons/soporte/finales/contacto.png");

type Opcion = {
  clave: string;
  titulo: string;
  imagen?: ImageSourcePropType;
  icono?: keyof typeof Ionicons.glyphMap;
  /** Si la administración no se lo habilitó: se ve, apagada, y dice por qué. */
  bloqueo?: string;
  accion: () => void;
};

/**
 * La pestaña del medio de la portería.
 *
 * La pidió la responsable de producto el 14/10/2026: «en Guardia, añadir la
 * pantalla del medio, Vivienda: administrar las áreas comunes; los
 * estacionamientos de visita están en áreas comunes pero portería los asigna;
 * añadir el chat y el intercomunicador».
 *
 * El 15/10/2026 el cliente pidió que se vea **como la de los demás**: la misma
 * tarjeta de arriba y la misma cuadrícula de tarjetas con imagen, no una lista.
 * Y que el chat y las llamadas se vean aunque estén apagados: el KT dice que
 * son de la portería «si el Administrador se lo habilita», así que salen
 * apagados y dicen quién los enciende, en vez de desaparecer sin explicación.
 */
export function PorteriaResumen() {
  const navigation = useNavegacion();
  const rolActivo = useAuthStore((s) => s.rolActivo);
  const condominios = useAuthStore((s) => s.condominios);
  const condominioActivo = useCondominioActivo();
  // La de este edificio: un guardia puede tener portería en más de uno.
  const membresia =
    condominios.find((c) => c.rol === "guardia" && c.condominioId === condominioActivo) ??
    condominios.find((c) => c.rol === "guardia");
  const { items: visitas } = useVisitas();
  const [estacionamientos, setEstacionamientos] = useState(false);
  const [intercom, setIntercom] = useState(false);
  const [bloqueo, setBloqueo] = useState<{ titulo: string; texto: string } | null>(null);

  const { puedeChatear, puedeLlamar } = permisosDeComunicacion({
    rolActivo,
    permisos: membresia?.permisos,
  });
  const pideALaAdministracion = (que: string) =>
    `La administración no te ha habilitado ${que}. Pídeselo: lo enciende en Configuración › Seguridad.`;

  const opciones: Opcion[] = [
    {
      clave: "visitas",
      titulo: "Visitas",
      imagen: imagenVisitas,
      accion: () => navigateToRoute(navigation, "Visitas"),
    },
    {
      clave: "correspondencia",
      titulo: "Correspondencia",
      imagen: imagenCorrespondencia,
      accion: () => navigateToRoute(navigation, "Correspondencia"),
    },
    {
      clave: "zonas",
      titulo: "Zonas Comunes",
      imagen: imagenZonas,
      accion: () => navigateToRoute(navigation, "ZonasComunes"),
    },
    {
      clave: "estacionamientos",
      titulo: "Estacionamientos de visita",
      icono: "car-sport",
      accion: () => setEstacionamientos(true),
    },
    {
      clave: "directorio",
      titulo: "Directorio de propiedades",
      imagen: imagenDirectorio,
      accion: () => navigateToRoute(navigation, "DirectorioPropiedades"),
    },
    {
      clave: "chat",
      titulo: "Chat",
      icono: "chatbubbles",
      bloqueo: puedeChatear ? undefined : pideALaAdministracion("el chat"),
      accion: () => navigateToRoute(navigation, "Chat"),
    },
    {
      clave: "intercom",
      titulo: "Intercomunicador",
      icono: "radio",
      bloqueo: puedeLlamar ? undefined : pideALaAdministracion("las llamadas"),
      accion: () => setIntercom(true),
    },
    {
      clave: "llamadas",
      titulo: "Llamar a una vivienda",
      imagen: imagenLlamar,
      bloqueo: puedeLlamar ? undefined : pideALaAdministracion("las llamadas"),
      accion: () => navigateToRoute(navigation, "Llamada"),
    },
  ];

  return (
    <View className="px-4 gap-4 pt-5 pb-8">
      <View
        className="bg-white rounded-xl p-5 items-center gap-2.5"
        style={{ boxShadow: theme.shadows.card }}
      >
        <View
          className="items-center justify-center overflow-hidden"
          style={{
            width: 112,
            height: 112,
            borderRadius: 56,
            borderWidth: 3,
            borderColor: theme.colors.primary,
            backgroundColor: theme.colors.bgVivienda,
          }}
        >
          <Image source={imagenPorteria} style={{ width: "80%", height: "80%" }} resizeMode="contain" />
        </View>
        <Text className="text-xl font-bold text-gray-900">
          {membresia?.condominioNombre ?? "Portería"}
        </Text>
        <View
          className="flex-row items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-gray-200"
          style={{ backgroundColor: theme.colors.bgCampo }}
        >
          <Text style={{ fontSize: 12 }}>🛡️</Text>
          <Text className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
            Portería
          </Text>
        </View>
      </View>

      <View className="flex-row flex-wrap gap-3">
        {opciones.map((o) => (
          <Pressable
            key={o.clave}
            accessibilityRole="button"
            accessibilityLabel={o.bloqueo ? `${o.titulo}, no habilitado` : o.titulo}
            onPress={() =>
              o.bloqueo ? setBloqueo({ titulo: o.titulo, texto: o.bloqueo }) : o.accion()
            }
            className="bg-white rounded-xl p-3.5 items-center justify-center relative"
            style={{
              width: "48%",
              aspectRatio: 1,
              boxShadow: theme.shadows.card,
              opacity: o.bloqueo ? 0.55 : 1,
            }}
          >
            {o.bloqueo ? (
              <View style={{ position: "absolute", top: 10, right: 10 }}>
                <Ionicons name="lock-closed" size={16} color={theme.colors.textSecondary} />
              </View>
            ) : null}
            {o.imagen ? (
              <Image source={o.imagen} style={{ width: 88, height: 88 }} resizeMode="contain" />
            ) : (
              <View
                className="items-center justify-center"
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: 44,
                  backgroundColor: theme.colors.primaryLight,
                }}
              >
                <Ionicons name={o.icono ?? "apps"} size={44} color={theme.colors.primaryDark} />
              </View>
            )}
            <Text
              className="text-sm font-medium text-gray-500 text-center mt-1.5"
              numberOfLines={2}
            >
              {o.titulo}
            </Text>
          </Pressable>
        ))}
      </View>

      <Modal visible={!!bloqueo} onClose={() => setBloqueo(null)} title={bloqueo?.titulo ?? ""}>
        <View className="gap-4">
          <Text className="text-sm text-gray-700">{bloqueo?.texto}</Text>
          <Button fullWidth onPress={() => setBloqueo(null)}>
            Entendido
          </Button>
        </View>
      </Modal>
      <LlamarAVivienda visible={intercom} onClose={() => setIntercom(false)} />
      <EstacionamientosDeVisitaModal
        visible={estacionamientos}
        onClose={() => setEstacionamientos(false)}
        visitas={visitas}
      />
    </View>
  );
}
