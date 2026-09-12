import { Text, View } from "react-native";
import type { Anuncio } from "../../types/anuncios";
export function AnuncioResumenCard({ anuncio }: { anuncio: Anuncio }) {
  return (
    <View
      className="rounded-2xl p-4"
      style={{
        backgroundColor: "#fff",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      <View className="flex-row justify-between mb-3.5">
        <View>
          <Text className="text-xs font-bold text-gray-900">
            Fecha publicada
          </Text>
          <Text className="text-sm text-gray-500">
            {anuncio.fechaPublicada}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-xs font-bold text-gray-900">
            Fecha Finalización
          </Text>
          <Text className="text-sm text-gray-500">
            {anuncio.fechaFinalizacion}
          </Text>
        </View>
      </View>
      <View className="items-center mb-3">
        <Text className="text-sm font-bold text-gray-900 underline mb-1.5">
          Titulo:
        </Text>
        <Text className="text-lg font-bold text-gray-900 text-center">
          {anuncio.titulo}
        </Text>
      </View>
      <View className="items-center mb-3">
        <Text className="text-sm font-bold text-gray-900 underline mb-1.5">
          Descripción:
        </Text>
        <Text className="text-base text-gray-900 text-center">
          {anuncio.descripcion}
        </Text>
      </View>
      <Text className="text-sm text-gray-500">{anuncio.categoria}</Text>
    </View>
  );
}
