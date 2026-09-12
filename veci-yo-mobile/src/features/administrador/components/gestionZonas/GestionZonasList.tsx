import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Badge, Button } from "@/shared/components";
import zonaIcons, { zonaBanners } from "@/assets/icons/zonas";
import type { GestionZona } from "@/stores/zonas-store";

const TIPO_LABELS: Record<string, string> = {
  Barbecue: "Barbecue",
  "Swimming Pool": "Swimming Pool",
  "Children's Park": "Children's Park",
  Gym: "Gym",
  "Coworking Space": "Coworking Space",
  "Tennis Court": "Tennis Court",
  "Game Room": "Game Room",
  "Laundry Room": "Laundry Room",
};

const icons = zonaIcons as Record<string, number>;
const banners = zonaBanners as Record<string, number>;

export function GestionZonasList({
  zonas,
  onEdit,
  onDelete,
}: {
  zonas: GestionZona[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const navigation = useNavigation<any>();
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  return (
    <View className="gap-3.5">
      {zonas.map((zona) => {
        const banner = banners[zona.id];
        const icon = icons[zona.id];

        return (
          <Pressable
            key={zona.id}
            onPress={() => {
              setMenuOpen(null);
              onEdit(zona.id);
            }}
            className="bg-white rounded-xl overflow-hidden"
            style={{
              shadowColor: "#000",
              shadowOpacity: 0.08,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 2 },
              elevation: 3,
            }}
          >
            <View
              className="w-full h-[140px] items-center justify-center overflow-hidden"
              style={{ backgroundColor: "#B8A98C" }}
            >
              {banner ? (
                <Image
                  source={banner}
                  accessibilityLabel={zona.nombre}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : icon ? (
                <Image
                  source={icon}
                  accessibilityLabel={zona.nombre}
                  className="w-16 h-16"
                  style={{ opacity: 0.7 }}
                  resizeMode="contain"
                />
              ) : null}
            </View>

            <View className="px-4 py-3.5 gap-2">
              <View className="flex-row items-start justify-between">
                <View className="flex-1">
                  <Text className="text-base font-bold text-gray-900">
                    {zona.nombre}
                  </Text>
                  <Text className="text-sm text-gray-500 mt-0.5">
                    {TIPO_LABELS[zona.tipo] || zona.tipo}
                  </Text>
                </View>

                <View className="flex-row items-center gap-1">
                  <Badge status={zona.activa ? "Activa" : "Inactiva"} />
                  <View className="relative">
                    <Pressable
                      onPress={(event) => {
                        event.stopPropagation();
                        setMenuOpen((current) =>
                          current === zona.id ? null : zona.id,
                        );
                      }}
                      className="px-1.5 py-1 rounded-lg"
                      accessibilityLabel="Más opciones"
                    >
                      <Text className="text-xl leading-4 text-gray-500">⋯</Text>
                    </Pressable>
                    {menuOpen === zona.id && (
                      <View
                        className="absolute right-0 top-8 z-10 rounded-xl bg-white p-1"
                        style={{
                          minWidth: 160,
                          shadowColor: "#000",
                          shadowOpacity: 0.12,
                          shadowRadius: 10,
                          shadowOffset: { width: 0, height: 4 },
                          elevation: 8,
                        }}
                      >
                        <Pressable
                          onPress={(event) => {
                            event.stopPropagation();
                            navigation.navigate("GestionZonaReservas", {
                              id: zona.id,
                            });
                            setMenuOpen(null);
                          }}
                          className="flex-row items-center gap-2 rounded-lg px-3.5 py-2.5"
                        >
                          <Text className="text-sm font-medium text-gray-900">
                            📋 Ver Reservas
                          </Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              <View className="flex-row flex-wrap items-center gap-3">
                <Text className="text-xs text-gray-400">
                  🕐 {zona.horarioApertura} - {zona.horarioCierre}
                </Text>
                {zona.montoGarantia > 0 && (
                  <Text className="text-xs text-gray-400">
                    💰 {zona.moneda} {zona.montoGarantia.toLocaleString()}
                  </Text>
                )}
              </View>

              <View className="flex-row items-center gap-2 mt-1">
                <Button
                  variant="primary"
                  size="sm"
                  style={{ flex: 1 }}
                  onPress={() => onEdit(zona.id)}
                >
                  Editar
                </Button>
                <Pressable
                  onPress={(event) => {
                    event.stopPropagation();
                    onDelete(zona.id);
                  }}
                  className="p-2 rounded-full items-center justify-center"
                  accessibilityLabel="Eliminar"
                >
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </Pressable>
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
