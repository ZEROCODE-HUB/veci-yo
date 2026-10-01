import { theme } from "@/config";
import { Text, View } from "react-native";
import type { Anuncio } from "../../types/anuncios";

/**
 * La cabecera de un anuncio.
 *
 * Pintaba las etiquetas siempre, tuvieran algo debajo o no: un anuncio sin
 * fecha de cierre mostraba "Fecha Finalización" sobre un hueco, y uno sin
 * cuerpo mostraba "Descripción:" sobre nada, con la categoría justo debajo
 * pareciendo el texto del anuncio. Una etiqueta que señala un hueco se lee
 * como un dato que falta, no como un dato que no existe.
 */
export function AnuncioResumenCard({ anuncio }: { anuncio: Anuncio }) {
  return (
    <View
      className="rounded-2xl p-4"
      style={{
        backgroundColor: theme.colors.bgCard,
        shadowColor: theme.colors.shadow,
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
        {anuncio.fechaFinalizacion ? (
          <View className="items-end">
            <Text className="text-xs font-bold text-gray-900">
              Fecha de cierre
            </Text>
            <Text className="text-sm text-gray-500">
              {anuncio.fechaFinalizacion}
            </Text>
          </View>
        ) : null}
      </View>

      <View className="items-center mb-3">
        <Text className="text-sm font-bold text-gray-900 underline mb-1.5">
          Título:
        </Text>
        <Text className="text-lg font-bold text-gray-900 text-center">
          {anuncio.titulo}
        </Text>
      </View>

      {anuncio.descripcion ? (
        <View className="items-center mb-3">
          <Text className="text-sm font-bold text-gray-900 underline mb-1.5">
            Descripción:
          </Text>
          <Text className="text-base text-gray-900 text-center">
            {anuncio.descripcion}
          </Text>
        </View>
      ) : null}

      {anuncio.categoria ? (
        <Text className="text-sm text-gray-500">{anuncio.categoria}</Text>
      ) : null}
    </View>
  );
}
