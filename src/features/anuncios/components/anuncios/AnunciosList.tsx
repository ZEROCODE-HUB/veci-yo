import { Image, Pressable, Text, View } from "react-native";
import { Anuncio } from "../../types/anuncios";
const iconAnuncios = require("@/assets/icons/home/anuncios.png");
export function AnunciosList({
  anuncios,
  onPress,
}: {
  anuncios: Anuncio[];
  onPress: (anuncio: Anuncio) => void;
}) {
  return (
    <>
      {anuncios.map((item) => (
        <Pressable
          key={item.id}
          onPress={() => onPress(item)}
          className="rounded-2xl p-3.5 gap-2.5"
          style={{
            backgroundColor: "#fff",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <View className="flex-row items-center gap-3">
            <View
              className="items-center justify-center rounded-full overflow-hidden"
              style={{ width: 40, height: 40, backgroundColor: "#FEF3C7" }}
            >
              <Image
                source={iconAnuncios}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            </View>
            <Text className="flex-1 text-base font-bold text-gray-900">
              {item.categoria}
            </Text>
          </View>
          <View className="flex-row items-center justify-between">
            <Text className="flex-1 text-base text-gray-500">
              Titulo: {item.titulo}
            </Text>
            <Text
              className="text-sm font-semibold"
              style={{ color: "#F59E0B" }}
            >
              {item.fechaCorta}
            </Text>
          </View>
        </Pressable>
      ))}
    </>
  );
}
