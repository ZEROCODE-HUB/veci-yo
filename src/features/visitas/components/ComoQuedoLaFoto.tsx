import React from "react";
import { Image, Text, View } from "react-native";
import { theme } from "@/config";
import { Button } from "@/shared/components";

/**
 * Cómo quedó la foto del documento que acaba de tomar la portería, ya con su
 * marca de agua (Para Claude 108, 27/10/2026).
 *
 * Se enseña una vez, al tomarla, para confirmarla o repetirla. Después no se
 * vuelve a abrir desde la portería: lo decidió el cliente.
 */
export function ComoQuedoLaFoto({
  url,
  onBien,
  onOtra,
}: {
  url: string;
  onBien: () => void;
  onOtra: () => void;
}) {
  return (
    <View className="gap-2">
      <Text className="text-sm text-gray-700">
        Así quedó. ¿Se lee bien el documento?
      </Text>
      {/* El tamaño va en `style`: con clases, React Native Web pinta el archivo a su tamaño. */}
      <Image
        source={{ uri: url }}
        accessibilityLabel="La foto del documento que acabas de tomar"
        resizeMode="contain"
        style={{
          width: "100%",
          height: 240,
          borderRadius: 12,
          backgroundColor: theme.colors.bgMuted,
        }}
      />
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Button variant="secondary" size="sm" fullWidth onPress={onOtra}>
            Volver a tomarla
          </Button>
        </View>
        <View className="flex-1">
          <Button size="sm" fullWidth onPress={onBien}>
            Está bien
          </Button>
        </View>
      </View>
    </View>
  );
}
