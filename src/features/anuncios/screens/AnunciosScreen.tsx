import { useLayoutEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  AnuncioFormModal,
  AnunciosFilters,
  AnunciosList,
  AnuncioSuccessModal,
} from "../components/anuncios";
import { useAnuncios } from "../hooks/useAnuncios";
import type { AnuncioFormValues } from "../types/anuncios";
import type { ViviendaStackParamList } from "@/shared/types";
import { useAuthStore } from "@/stores";

type Nav = NativeStackNavigationProp<ViviendaStackParamList>;

export function AnunciosScreen() {
  const navigation = useNavigation<Nav>();
  const rolActivo = useAuthStore((state) => state.rolActivo);
  const { anuncios, filtros, updateFiltro, publicarAnuncio } = useAnuncios();
  const [crearOpen, setCrearOpen] = useState(false);
  const [exitoOpen, setExitoOpen] = useState(false);
  const esAdmin = rolActivo === "administrador";

  useLayoutEffect(() => {
    if (esAdmin)
      navigation.setOptions({
        headerRight: () => (
          <Pressable
            onPress={() => setCrearOpen(true)}
            className="items-center justify-center mr-1"
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              backgroundColor: "#F59E0B",
            }}
          >
            <Text className="text-lg font-bold" style={{ color: "#111827" }}>
              +
            </Text>
          </Pressable>
        ),
      });
  }, [esAdmin, navigation]);


  const handlePublish = (values: AnuncioFormValues) => {
    publicarAnuncio(values, {
      onSuccess: () => {
        setCrearOpen(false);
        setExitoOpen(true);
      },
    });
  };

  
  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerClassName="p-4 gap-3.5"
    >
      <AnunciosFilters
        filtros={filtros}
        onChange={updateFiltro}
        mostrarEncuesta={
          rolActivo !== "guardia" && rolActivo !== "huesped-temporal"
        }
      />
      <AnunciosList
        anuncios={anuncios}
        onPress={(anuncio) =>
          navigation.navigate("AnuncioDetalle", { id: String(anuncio.id) })
        }
      />
      <View className="h-6" />
      <AnuncioFormModal
        visible={crearOpen}
        onClose={() => setCrearOpen(false)}
        onSave={handlePublish}
      />
      <AnuncioSuccessModal
        visible={exitoOpen}
        onClose={() => setExitoOpen(false)}
      />
    </ScrollView>
  );
}
