import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/config";
import { useAuthStore } from "@/stores";
import { useVisitas } from "@/features/visitas/hooks";
import { navigateToRoute } from "@/navigation/helpers/navigation.helpers";
import { useNavegacion } from "@/shared/hooks";
import { permisosDeComunicacion } from "./permisosComunicacion";
import { EstacionamientosDeVisitaModal } from "./EstacionamientosDeVisitaModal";

/**
 * La pestaña del medio de la portería (14/10/2026).
 *
 * La responsable de producto la pidió: «en Guardia, añadir la pantalla del
 * medio, Vivienda: administrar las áreas comunes; los estacionamientos de
 * visita están en áreas comunes pero portería los asigna; añadir el chat y el
 * intercomunicador». Antes el guardia no tenía esta pestaña (R-2: no tiene
 * vivienda) y las zonas comunes, aunque la pantalla ya le dejaba gestionar
 * reservas, no tenían ninguna entrada.
 *
 * Chat y llamadas, solo si la administración se los habilitó.
 */
export function PorteriaResumen() {
  const navigation = useNavegacion();
  const rolActivo = useAuthStore((s) => s.rolActivo);
  const condominios = useAuthStore((s) => s.condominios);
  const { items: visitas } = useVisitas();
  const [estacionamientos, setEstacionamientos] = useState(false);

  const { puedeChatear, puedeLlamar } = permisosDeComunicacion({
    rolActivo,
    permisos: condominios.find((c) => c.rol === "guardia")?.permisos,
  });

  const opciones: { clave: string; titulo: string; detalle: string; icono: keyof typeof Ionicons.glyphMap; accion: () => void }[] = [
    {
      clave: "zonas",
      titulo: "Zonas comunes",
      detalle: "Reservas de hoy, reservar por una vivienda e incidencias",
      icono: "people-outline",
      accion: () => navigateToRoute(navigation, "ZonasComunes"),
    },
    {
      clave: "estacionamientos",
      titulo: "Estacionamientos de visita",
      detalle: "Asignar y liberar los puestos de visita",
      icono: "car-outline",
      accion: () => setEstacionamientos(true),
    },
    {
      clave: "directorio",
      titulo: "Directorio de propiedades",
      detalle: "Quién vive en cada vivienda y cómo llamarle",
      icono: "home-outline",
      accion: () => navigateToRoute(navigation, "DirectorioPropiedades"),
    },
  ];
  if (puedeChatear) {
    opciones.push({
      clave: "chat",
      titulo: "Chat",
      detalle: "Conversaciones con las viviendas y la administración",
      icono: "chatbubbles-outline",
      accion: () => navigateToRoute(navigation, "Chat"),
    });
  }
  if (puedeLlamar) {
    opciones.push({
      clave: "llamadas",
      titulo: "Llamar a una vivienda",
      detalle: "Marca al residente de la vivienda que elijas",
      icono: "call-outline",
      accion: () => navigateToRoute(navigation, "Llamada"),
    });
  }

  return (
    <ScrollView className="flex-1 bg-bg-app" contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text className="text-lg font-bold text-gray-900">Portería</Text>
      {opciones.map((o) => (
        <Pressable
          key={o.clave}
          onPress={o.accion}
          accessibilityRole="button"
          accessibilityLabel={o.titulo}
          className="flex-row items-center gap-3 rounded-xl bg-white p-4"
          style={{ boxShadow: theme.shadows.card }}
        >
          <Ionicons name={o.icono} size={24} color={theme.colors.primary} />
          <View className="flex-1">
            <Text className="text-base font-semibold text-gray-900">{o.titulo}</Text>
            <Text className="text-xs text-gray-500">{o.detalle}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
        </Pressable>
      ))}
      <EstacionamientosDeVisitaModal
        visible={estacionamientos}
        onClose={() => setEstacionamientos(false)}
        visitas={visitas}
      />
    </ScrollView>
  );
}
