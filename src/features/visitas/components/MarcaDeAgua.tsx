import { theme } from "@/config";
import React from "react";
import { Text, View } from "react-native";

/**
 * Una marca de agua sobre la foto del documento de un huésped (23/10/2026).
 *
 * Dice qué guardia la está mirando y cuándo, repetida en diagonal, para que
 * una captura de pantalla lleve el nombre de quien la hizo. Se dibuja en la
 * pantalla: la foto guardada no cambia.
 */
export function MarcaDeAgua({ texto }: { texto: string }) {
  return (
    <View
      pointerEvents="none"
      accessibilityLabel={`Marca de agua: ${texto}`}
      style={{
        position: "absolute",
        inset: 0,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <View style={{ transform: [{ rotate: "-24deg" }], gap: 14 }}>
        {[0, 1, 2, 3].map((fila) => (
          <Text
            key={fila}
            numberOfLines={1}
            style={{
              fontSize: 10,
              fontWeight: "700",
              color: theme.colors.marcaDeAgua,
              width: 420,
              textAlign: "center",
            }}
          >
            {`${texto}   ·   ${texto}`}
          </Text>
        ))}
      </View>
    </View>
  );
}
