import { theme } from "@/config";
import { Image, Pressable, Text, View } from "react-native";
import { Badge } from "@/shared/components";
import { useLista } from "@/shared/hooks/useLista";
import { isAnuncioVotingClosed } from "../../helpers/anuncios.helpers";
import { Anuncio } from "../../types/anuncios";
const iconAnuncios = require("@/assets/icons/home/anuncios.png");
export function AnunciosList({
  anuncios,
  onPress,
}: {
  anuncios: Anuncio[];
  onPress: (anuncio: Anuncio) => void;
}) {
  const categorias = useLista("categorias_de_anuncio");
  return (
    <>
      {anuncios.map((item) => (
        <Pressable
          key={item.id}
          onPress={() => onPress(item)}
          className="rounded-2xl p-3.5 gap-2.5"
          style={{
            backgroundColor: theme.colors.bgCard,
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <View className="flex-row items-center gap-3">
            <View
              className="items-center justify-center rounded-full overflow-hidden"
              style={{
                width: 40,
                height: 40,
                backgroundColor: theme.colors.warningLight,
              }}
            >
              <Image
                source={iconAnuncios}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            </View>
            <Text className="flex-1 text-base font-bold text-gray-900">
              {categorias.etiquetaDe(item.categoria)}
            </Text>
          </View>
          {/*
            Qué es cada fila y si la encuesta sigue abierta, a simple vista
            (Para Claude, 21/10/2026). El cierre es el mismo que usa el detalle.
          */}
          <View className="flex-row flex-wrap gap-2">
            <Badge status={item.votacion ? "Encuesta" : "Anuncio"} />
            {item.votacion && (
              <Badge status={isAnuncioVotingClosed(item) ? "Cerrada" : "En curso"} />
            )}
          </View>
          <View className="flex-row items-center justify-between">
            <Text className="flex-1 text-base text-gray-500">
              {item.titulo}
            </Text>
            <Text
              className="text-sm font-semibold"
              style={{ color: theme.colors.warning }}
            >
              {item.fechaCorta}
            </Text>
          </View>
        </Pressable>
      ))}
    </>
  );
}
