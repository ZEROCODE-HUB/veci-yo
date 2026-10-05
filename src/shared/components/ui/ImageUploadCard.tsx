import { theme } from "@/config";
import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  type ImageSourcePropType,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

/**
 * El tope por defecto, para quien no diga otro.
 *
 * Era 8 y **no lo respaldaba nadie**: ningún bucket tenía límite declarado, así
 * que la comprobación vivía solo aquí y una subida por otra vía pasaba
 * cualquier cosa. Quien pase `topeMb` debería pasar el del bucket que la va a
 * recibir.
 */
const MAX_SIZE_MB = 8;

interface ImageUploadCardProps {
  label?: string;
  helperText?: string;
  value: string | null;
  onChange: (uri: string) => void;
  placeholder?: string;
  circular?: boolean;
  height?: number;
  error?: string;
  defaultSource?: ImageSourcePropType;
  /**
   * Los tipos que acepta quien la va a guardar. Sin esto, `expo-image-picker`
   * deja elegir un HEIC del carrete y la subida falla después con un error del
   * servidor que no dice nada.
   */
  tiposAceptados?: readonly string[];
  /** El tope de verdad, el del bucket. Por defecto, 8 MB. */
  topeMb?: number;
}

export function ImageUploadCard({
  label,
  helperText,
  value,
  onChange,
  placeholder = "Subir imagen",
  circular = false,
  height = 160,
  error = "",
  defaultSource,
  tiposAceptados,
  topeMb = MAX_SIZE_MB,
}: ImageUploadCardProps) {
  const [localError, setLocalError] = useState("");

  const openPicker = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];

      if (asset.fileSize && asset.fileSize > topeMb * 1024 * 1024) {
        const pesa = (asset.fileSize / 1024 / 1024).toFixed(1);
        // Con el peso real dentro: «no debe superar los 5MB» a secas obliga a
        // adivinar cuánto hay que recortar.
        setLocalError(`Esa imagen pesa ${pesa} MB y el tope son ${topeMb} MB.`);
        return;
      }

      /*
        Y el formato. `expo-image-picker` con `mediaTypes: ["images"]` deja
        elegir un HEIC del carrete de un iPhone, y eso lo rechaza el bucket
        después con un error del servidor que no explica nada.
      */
      if (tiposAceptados && asset.mimeType && !tiposAceptados.includes(asset.mimeType)) {
        setLocalError(
          `Ese archivo es ${asset.mimeType.split("/")[1]?.toUpperCase() ?? "de otro tipo"}. ` +
            `Hace falta ${tiposAceptados
              .map((t) => t.split("/")[1].toUpperCase())
              .join(", ")}.`,
        );
        return;
      }

      setLocalError("");
      onChange(asset.uri);
    }
  };

  const shownError = error || localError;
  const borderColor = shownError ? theme.colors.danger : theme.colors.border;

  return (
    <View>
      {Boolean(label) && (
        <Text className="text-sm text-gray-500 font-medium mb-2">{label}</Text>
      )}

      <Pressable
        onPress={openPicker}
        style={{
          width: circular ? height : "100%",
          height,
          borderRadius: circular ? 9999 : 20,
          borderWidth: 1.5,
          borderStyle: value ? "solid" : "dashed",
          borderColor,
          overflow: "hidden",
        }}
        className="items-center justify-center"
      >
        {value || defaultSource ? (
          <Image
            source={value ? { uri: value } : defaultSource}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        ) : (
          <View className="items-center gap-2">
            <Ionicons name="camera" size={28} color={theme.colors.textMuted} />
            <Text className="text-sm text-gray-500 font-medium">
              {placeholder}
            </Text>
          </View>
        )}
      </Pressable>

      <View
        className="flex-row items-center mt-2"
        style={{ justifyContent: circular ? "center" : "space-between" }}
      >
        {Boolean(helperText && !shownError) && (
          <Text className="text-xs text-gray-400">{helperText}</Text>
        )}
        {shownError ? (
          <Text className="text-xs text-danger font-medium">{shownError}</Text>
        ) : null}
        {value ? (
          <Pressable onPress={openPicker}>
            <Text className="text-xs font-semibold text-secondary">
              Reemplazar imagen
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
