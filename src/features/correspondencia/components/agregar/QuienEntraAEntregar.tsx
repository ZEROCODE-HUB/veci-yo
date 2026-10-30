import React from "react";
import { theme } from "@/config";
import { Text, View } from "react-native";
import { Input } from "@/shared/components";
import type { ArchivoElegido } from "@/shared/services/archivos";
import { FotosDelEnvio } from "./FotosDelEnvio";

/**
 * En una entrega en puerta entra alguien de fuera al edificio: su nombre y la
 * foto de su documento quedan con el envío (Para Claude 196, 30/10/2026).
 */
export function QuienEntraAEntregar({
  nombre,
  onNombre,
  fotos,
  onFotos,
}: {
  nombre: string;
  onNombre: (nombre: string) => void;
  fotos: ArchivoElegido[];
  onFotos: (actualizar: (previas: ArchivoElegido[]) => ArchivoElegido[]) => void;
}) {
  return (
    <View className="gap-3 rounded-2xl p-3" style={{ borderWidth: 1, borderColor: theme.colors.border }}>
      <Text className="text-sm font-bold text-gray-900">Quién entra a entregarla</Text>
      <Input
        label="Nombre completo *"
        soloLetras
        value={nombre}
        onChangeText={onNombre}
        placeholder="Como aparece en su documento"
      />
      <Text className="text-xs text-gray-500">Foto del documento de identidad *</Text>
      {/* Una sola: si se elige otra, reemplaza a la anterior. */}
      <FotosDelEnvio
        fotos={fotos}
        onCambiar={(actualizar) => onFotos((previas) => actualizar(previas).slice(-1))}
      />
    </View>
  );
}
