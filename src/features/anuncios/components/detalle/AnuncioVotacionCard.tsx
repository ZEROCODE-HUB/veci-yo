import { Pressable, Text, View } from "react-native";
import { Button } from "@/shared/components";
import type { Anuncio } from "../../types/anuncios";
export function AnuncioVotacionCard({ anuncio }: { anuncio: Anuncio }) {
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
      <Text className="text-base font-bold text-gray-900 text-center mb-3">
        Encuesta en curso
      </Text>
      <View className="mb-4">
        <View className="flex-row justify-between mb-1">
          <Text className="text-sm text-gray-500">Progreso</Text>
          <Text className="text-sm text-gray-500">
            {anuncio.progreso || 0}%
          </Text>
        </View>
        <View
          className="w-full h-2 rounded-full"
          style={{ backgroundColor: "#F3F4F6" }}
        >
          <View
            className="h-2 rounded-full"
            style={{
              width: `${anuncio.progreso || 0}%`,
              backgroundColor: "#F59E0B",
            }}
          />
        </View>
      </View>
      {anuncio.opcionesVotacion && anuncio.opcionesVotacion.length > 0 ? (
        <View className="gap-2 mb-3">
          {anuncio.opcionesVotacion.map((opcion, index) => (
            <Pressable
              key={index}
              className="items-center py-3 rounded-lg"
              style={{
                borderWidth: 1.5,
                borderColor: "#E5E7EB",
                backgroundColor: "#fff",
              }}
            >
              <Text className="text-base text-gray-900 text-center">
                {opcion}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <View className="flex-row gap-3 mb-3">
          <View className="flex-1">
            <Button variant="primary" fullWidth onPress={() => {}}>
              Sí
            </Button>
          </View>
          <View className="flex-1">
            <Button variant="danger" fullWidth onPress={() => {}}>
              No
            </Button>
          </View>
        </View>
      )}
      {anuncio.ocultarResultados ? (
        <Text className="text-sm text-gray-400 text-center mt-2">
          Los resultados se mostrarán al cierre de la encuesta.
        </Text>
      ) : (
        <View className="mt-3">
          <View className="flex-row justify-between">
            <Text className="text-sm text-gray-500">
              Sí: {anuncio.votosSi?.length || 0} votos
            </Text>
            <Text className="text-sm text-gray-500">
              No: {anuncio.votosNo?.length || 0} votos
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
