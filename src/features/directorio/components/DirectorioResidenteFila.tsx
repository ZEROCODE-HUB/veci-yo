import { theme } from "@/config";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import type { ResidenteDelDirectorio } from "../helpers/filtrosDelDirectorio";

/**
 * Una persona en la pestaña «Residentes» (16/11/2026): su nombre, su papel en
 * la vivienda y dónde vive. Al tocarla se abre el detalle de su vivienda.
 */
export function DirectorioResidenteFila({
  item,
  onPress,
}: {
  item: ResidenteDelDirectorio;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="active:opacity-80"
      accessibilityRole="button"
      accessibilityLabel={`${item.nombre}, ${item.papel}, Torre ${item.torreNumero} · Depto ${item.codigo}`}
      style={{
        backgroundColor: theme.colors.bgCard,
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 16,
        boxShadow: theme.shadows.card,
      }}
    >
      <View className="flex-row items-center" style={{ gap: 8 }}>
        <View className="flex-1" style={{ gap: 2 }}>
          <Text className="text-sm font-bold text-gray-900">{item.nombre}</Text>
          <Text className="text-xs text-gray-500">
            {`${item.papel} · Torre ${item.torreNumero} · Depto ${item.codigo}`}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
      </View>
    </Pressable>
  );
}
