import { Image, Pressable, Text, View } from "react-native";
import type { ZonaComunConfig } from "@/stores/zonas-store";
import zonaIcons from "@/assets/icons/zonas";

export function ZonasComunesAdminList({
  items,
  onEdit,
  onDelete,
}: {
  items: ZonaComunConfig[];
  onEdit: (item: ZonaComunConfig) => void;
  onDelete: (id: string) => void;
}) {
  const icons = zonaIcons as Record<string, any>;

  return (
    <View className="gap-3">
      {items.map((zona) => (
        <View
          key={zona.id}
          className="rounded-xl bg-white p-5"
          style={{
            shadowColor: "#000",
            shadowOpacity: 0.08,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 2 },
            elevation: 3,
          }}
        >
          <View className="flex-row items-start gap-3">
            <View className="w-12 items-center shrink-0">
              {icons[zona.id] ? (
                <Image
                  source={icons[zona.id]}
                  accessibilityLabel={zona.nombre}
                  className="w-10 h-10 rounded-full"
                  resizeMode="cover"
                />
              ) : (
                <Text className="text-3xl">{zona.emoji}</Text>
              )}
            </View>

            <View className="flex-1 min-w-0">
              <Text className="text-base font-bold text-gray-900">
                {zona.nombre}
              </Text>
              <Text className="text-sm text-gray-500 mt-1">
                {zona.descripcion}
              </Text>
              <View className="flex-row flex-wrap gap-2 mt-2">
                <Text className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-900">
                  Cap: {zona.capacidadMaxima}
                </Text>
                <Text className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-900">
                  Duracion: {zona.duracionPermitida}h
                </Text>
                <Text
                  className="text-xs px-2.5 py-1 rounded-full"
                  style={{
                    backgroundColor: zona.requiereAprobacion
                      ? "#FEF3C7"
                      : "#DCFCE7",
                    color: zona.requiereAprobacion ? "#D97706" : "#16A34A",
                  }}
                >
                  {zona.requiereAprobacion
                    ? "Requiere aprobacion"
                    : "Aprobacion automatica"}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => onDelete(zona.id)}
              className="p-1 shrink-0"
              accessibilityRole="button"
              accessibilityLabel={`Eliminar ${zona.nombre}`}
            >
              <Text className="text-base text-red-500">✕</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => onEdit(zona)}
            className="w-full mt-3 py-2 rounded-lg border border-gray-200 bg-gray-100 items-center"
          >
            <Text className="text-xs text-gray-500">Editar configuracion</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}
