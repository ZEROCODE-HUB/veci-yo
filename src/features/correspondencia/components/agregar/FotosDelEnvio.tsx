import React, { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { theme } from "@/config";
import { BottomSheet, BottomSheetOption } from "@/shared/components";
import type { ArchivoElegido } from "@/shared/services/archivos";

/** Las fotos de un envío: se suben de la galería o de la cámara, y se pueden quitar. */
export function FotosDelEnvio({
  fotos,
  onCambiar,
}: {
  fotos: ArchivoElegido[];
  onCambiar: (actualizar: (previas: ArchivoElegido[]) => ArchivoElegido[]) => void;
}) {
  const [elegirOrigen, setElegirOrigen] = useState(false);

  const subir = async (conCamara: boolean) => {
    setElegirOrigen(false);
    const opciones = { mediaTypes: ["images"] as ImagePicker.MediaType[], quality: 0.8, allowsMultipleSelection: true };
    const result = conCamara
      ? await ImagePicker.launchCameraAsync(opciones)
      : await ImagePicker.launchImageLibraryAsync(opciones);
    if (!result.canceled && result.assets.length > 0) {
      const nuevas = result.assets.map((a) => ({
        uri: a.uri,
        nombre: a.fileName ?? "foto.jpg",
        tipoMime: a.mimeType ?? "image/jpeg",
      }));
      onCambiar((prev) => [...prev, ...nuevas]);
    }
  };

  return (
    <View>
      <Pressable
        onPress={() => setElegirOrigen(true)}
        className="items-center justify-center rounded-2xl py-3.5"
        style={{
          borderWidth: 1.5,
          borderStyle: "dashed",
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.bgCard,
        }}
      >
        <Text className="text-base font-medium text-gray-900">Sube una o varias fotos</Text>
      </Pressable>

      {fotos.length > 0 ? (
        <View className="flex-row flex-wrap gap-2 mt-2.5">
          {fotos.map((foto, i) => (
            <View key={foto.uri} style={{ width: 64, height: 64, position: "relative" }}>
              <Image
                source={{ uri: foto.uri }}
                style={{ width: 64, height: 64, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border }}
                resizeMode="cover"
              />
              <Pressable
                accessibilityLabel="Quitar esta foto"
                onPress={() => onCambiar((prev) => prev.filter((_, j) => j !== i))}
                style={{
                  position: "absolute",
                  top: -6,
                  right: -6,
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: theme.colors.text,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 2,
                  borderColor: theme.colors.bgCard,
                }}
              >
                <Text style={{ color: theme.colors.textInverse, fontSize: 11, fontWeight: "bold" }}>✕</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
        <Text className="text-xs text-gray-500 text-right mt-1.5">Ningún archivo seleccionado</Text>
      )}

      <BottomSheet visible={elegirOrigen} onClose={() => setElegirOrigen(false)}>
        <BottomSheetOption label="Galería" onPress={() => subir(false)} />
        <BottomSheetOption label="Cámara" onPress={() => subir(true)} />
      </BottomSheet>
    </View>
  );
}
