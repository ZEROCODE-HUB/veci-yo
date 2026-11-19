import { Pressable, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/config";
import { useUbicacionStore } from "@/stores";
import type { SharedStackParamList } from "@/shared/types";

type Nav = NativeStackNavigationProp<SharedStackParamList>;

/**
 * El Inicio del profesional permanente con cuenta (18/11/2026, pedido del
 * cliente). Antes solo tenía Perfil y el citófono. Ahora:
 *   · los anuncios del edificio que van para los profesionales permanentes;
 *   · registrar visitas y ver las suyas, si quien lo registró se lo permitió.
 * El citófono le suena encima de cualquier pantalla, como siempre.
 */
export function TrabajadorHome() {
  const navigation = useNavigation<Nav>();
  const ubicaciones = useUbicacionStore((s) => s.ubicaciones);
  const vivienda = ubicaciones.find((u) => u.favorito) ?? ubicaciones[0];
  const puedeCrearVisitas = vivienda?.rol === "trabajador" && vivienda.puedeCrearVisitas === true;

  const opciones: { texto: string; detalle: string; icono: keyof typeof Ionicons.glyphMap; ir: () => void }[] = [
    {
      texto: "Anuncios",
      detalle: "Lo que el edificio publica para los profesionales permanentes.",
      icono: "megaphone-outline",
      ir: () => navigation.navigate("Anuncios"),
    },
    ...(puedeCrearVisitas
      ? [
          {
            texto: "Registrar una visita",
            detalle: "Anuncia a un amigo o a un profesional que viene a la vivienda.",
            icono: "person-add-outline" as const,
            ir: () => navigation.navigate("VisitasNuevo"),
          },
          {
            texto: "Mis visitas",
            detalle: "Las visitas que registraste.",
            icono: "people-outline" as const,
            ir: () => navigation.navigate("Visitas"),
          },
        ]
      : []),
  ];

  return (
    <View className="p-4 gap-3">
      <View className="gap-1">
        <Text className="text-lg font-bold text-gray-900">Hola</Text>
        <Text className="text-sm text-gray-500">
          {vivienda?.alias ? `Profesional permanente · ${vivienda.alias}` : "Profesional permanente"}
        </Text>
      </View>
      {opciones.map((o) => (
        <Pressable
          key={o.texto}
          onPress={o.ir}
          accessibilityRole="button"
          accessibilityLabel={o.texto}
          className="flex-row items-center gap-3 rounded-2xl p-4"
          style={{ backgroundColor: theme.colors.bgCard, boxShadow: theme.shadows.card }}
        >
          <Ionicons name={o.icono} size={24} color={theme.colors.primaryDark} />
          <View className="flex-1 gap-0.5">
            <Text className="text-sm font-semibold text-gray-900">{o.texto}</Text>
            <Text className="text-xs leading-4 text-gray-500">{o.detalle}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
        </Pressable>
      ))}
      <Text className="text-xs leading-4 text-gray-500">
        Cuando la portería llame a la vivienda, te sonará aquí si te dieron permiso para contestar el citófono.
      </Text>
    </View>
  );
}
