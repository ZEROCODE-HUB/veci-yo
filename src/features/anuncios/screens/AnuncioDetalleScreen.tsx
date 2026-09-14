import { useLayoutEffect, useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { useAuthStore } from "@/stores";
import type { ViviendaStackParamList } from "@/shared/types";
import {
  AnuncioResultadosFinales,
  AnuncioResumenCard,
  AnuncioVotacionCard,
} from "../components/detalle";
import { useAnuncioDetalle } from "../hooks/useAnuncios";
import {
  getDepartamentosNoVotaron,
  isAnuncioVotingClosed,
} from "../helpers/anuncios.helpers";

type RouteProps = RouteProp<ViviendaStackParamList, "AnuncioDetalle">;

export function AnuncioDetalleScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProps>();
  const { id } = route.params;
  const rolActivo = useAuthStore((state) => state.rolActivo);
  const { data: anuncio } = useAnuncioDetalle(id);
  useLayoutEffect(() => {
    if (anuncio) {
      navigation.setOptions({ title: `Anuncio N°: ${anuncio.id}` });
    }
  }, [anuncio, navigation]);
  const votacionCerrada = useMemo(
    () => isAnuncioVotingClosed(anuncio),
    [anuncio],
  );

  
  const deptosNoVotaron = useMemo(
    () => getDepartamentosNoVotaron(anuncio),
    [anuncio],
  );
  if (!anuncio)
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center p-4">
        <Text className="text-base text-gray-500">
          No se encontró el anuncio.
        </Text>
      </View>
    );
  
    const puedeVotar =
    anuncio.votacion &&
    !votacionCerrada &&
    rolActivo !== "guardia" &&
    rolActivo !== "huesped-temporal";
  
    const mostrarResultadosFinales =
    anuncio.votacion &&
    votacionCerrada &&
    rolActivo !== "guardia" &&
    rolActivo !== "huesped-temporal";


  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerClassName="p-4 gap-4"
    >
      <AnuncioResumenCard anuncio={anuncio} />
      {puedeVotar && <AnuncioVotacionCard anuncio={anuncio} />}
      {mostrarResultadosFinales && (
        <AnuncioResultadosFinales
          anuncio={anuncio}
          noVotaron={deptosNoVotaron}
        />
      )}
      <View className="h-6" />
    </ScrollView>
  );
}
