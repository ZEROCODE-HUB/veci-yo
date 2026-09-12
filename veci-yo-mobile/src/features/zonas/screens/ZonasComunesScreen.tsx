import React, { useEffect, useState } from "react";
import { ScrollView, View, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Button, Modal } from "@/shared/components";
import { PageHeader } from "@/shared/layouts";
import { useAuthStore, useUbicacionStore } from "@/stores";
import { zonasComunes } from "@/data";
import { MisReservas, ZonaCard } from "@/features/zonas/components";
import { useZonas } from "@/features/zonas/hooks";

export function ZonasComunesScreen() {
  const navigation = useNavigation<any>();
  useZonas();
  const rol = useAuthStore((state) => state.rolActivo);
  const ubicaciones = useUbicacionStore((state) => state.ubicaciones);
  const esHuesped = rol === "huesped-temporal";
  const accesoBloqueado = rol === "propietario" && ubicaciones.length === 0;
  const [zonaRestringida, setZonaRestringida] = useState<
    (typeof zonasComunes)[number] | null
  >(null);
  const [avisoHuesped, setAvisoHuesped] = useState(false);

  useEffect(() => {
    if (esHuesped) setAvisoHuesped(true);
  }, [esHuesped]);

  if (accesoBloqueado)
    return (
      <View className="flex-1 bg-white">
        <PageHeader title="Zonas Comunes" />
        <View className="flex-1 items-center justify-center px-6 gap-4">
        <Text className="text-5xl">🚫</Text>
        <Text className="text-base text-gray-500 text-center">
          No tienes acceso a Zonas Comunes. Solo los Residentes pueden usar esta
          función.
        </Text>
        </View>
      </View>
    );

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1" contentContainerClassName="pb-5">
      <View className="px-4 pt-3">
        <MisReservas collapsible />
      </View>
      <View className="p-4">
        <View className="flex-row flex-wrap gap-3">
          {zonasComunes.map((zona) => (
            <View key={zona.id} style={{ width: "47%" }}>
              <ZonaCard
                zona={zona}
                restringida={esHuesped && zona.restringidaHuesped}
                onPress={() =>
                  esHuesped && zona.restringidaHuesped
                    ? setZonaRestringida(zona)
                    : navigation.navigate("ZonaDetalles", { zonaId: zona.id })
                }
              />
            </View>
          ))}
        </View>
      </View>

      <Modal
        visible={avisoHuesped}
        onClose={() => setAvisoHuesped(false)}
        title="Aviso importante"
      >
        <View className="items-center gap-3.5">
          <Text className="text-5xl">ℹ️</Text>
          <Text className="text-sm text-gray-700 text-center leading-6">
            Algunas zonas comunes pueden estar restringidas para huéspedes de
            renta corta por la administración.
          </Text>
          <Button fullWidth onPress={() => setAvisoHuesped(false)}>
            Aceptar
          </Button>
        </View>
      </Modal>
      <Modal
        visible={!!zonaRestringida}
        onClose={() => setZonaRestringida(null)}
        title="Zona restringida"
      >
        <View className="items-center gap-3.5">
          <Text className="text-5xl">🚫</Text>
          <Text className="text-sm text-gray-700 text-center leading-6">
            La zona <Text className="font-bold">{zonaRestringida?.nombre}</Text>{" "}
            no está disponible para Huéspedes Temporales. Es una regla del
            edificio que restringe el acceso a esta zona común para estancias
            temporales.
          </Text>
          <Button fullWidth onPress={() => setZonaRestringida(null)}>
            Entendido
          </Button>
        </View>
      </Modal>
      </ScrollView>
    </View>
  );
}
