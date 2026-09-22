import { theme } from "@/config";
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
import { InfoButton } from "@/shared/components";
import { HELP } from "@/shared/content/helpContent";
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
    navigation.setOptions({
      headerRight: () => (
        <View className="flex-row items-center gap-2 mr-1">
          <InfoButton
            titulo={HELP.anuncios.info.titulo}
            descripcion={HELP.anuncios.info.descripcion}
            bullets={HELP.anuncios.info.bullets}
            ejemplo={HELP.anuncios.info.ejemplo}
          />
          {esAdmin && (
            <Pressable
              onPress={() => setCrearOpen(true)}
              className="items-center justify-center"
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: theme.colors.warning,
              }}
            >
              <Text className="text-lg font-bold" style={{ color: theme.colors.text }}>
                +
              </Text>
            </Pressable>
          )}
        </View>
      ),
    });
  }, [esAdmin, navigation]);


  const handlePublish = (values: AnuncioFormValues) => {
    publicarAnuncio(
      {
        tipo: values.tipo === "Encuesta" ? "encuesta" : "anuncio",
        categoria: values.categoria,
        titulo: values.titulo,
        descripcion: values.descripcion,
        urlVideo: values.urlVideo,
        publicadaDesde: values.fechaPublicada,
        publicadaHasta: values.fechaFinalizacion,
        paraPropietarios: values.paraPropietarios,
        paraResidentes: values.paraResidentes,
        paraHuespedes: values.paraHuespedes,
        votoMultiple: values.votacionMultiple,
        ocultarResultados: values.ocultarResultados,
        umbral: values.umbral ? Number(values.umbral) : undefined,
        opciones: values.opcionesVotacion.map((o) => o.valor),
      },
      {
        onSuccess: () => {
          setCrearOpen(false);
          setExitoOpen(true);
        },
      },
    );
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
          // Se navega con el uuid real, no con el id numerico derivado.
          navigation.navigate("AnuncioDetalle", { id: anuncio.uuid ?? "" })
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
