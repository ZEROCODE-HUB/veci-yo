import { theme } from "@/config";
import React from "react";
import { Text, View } from "react-native";
import type { ZonaComun } from "@/shared/types";
import { FotoDeZona } from "./FotoDeZona";

export function ZonaBanner({ zona }: { zona: ZonaComun }) {
  return (
    <View
      className="w-full h-44 rounded-2xl overflow-hidden"
      style={{ backgroundColor: theme.colors.zonaSinFoto }}
    >
      <FotoDeZona
        imagen={zona.imagen}
        icono={zona.emoji}
        nombre={zona.nombre}
        alto={176}
      />
      <View
        className="absolute bottom-0 left-0 right-0 px-4 py-3"
        style={{ backgroundColor: theme.colors.veloPieImagen }}
      >
        <Text className="text-xl font-bold text-white">{zona.nombre}</Text>
      </View>
    </View>
  );
}
