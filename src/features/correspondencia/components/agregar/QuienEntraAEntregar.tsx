import React from "react";
import { theme } from "@/config";
import { Text, View } from "react-native";
import { EtiquetaDelCampo, Input } from "@/shared/components";
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
  errorNombre,
  errorFoto,
}: {
  nombre: string;
  onNombre: (nombre: string) => void;
  fotos: ArchivoElegido[];
  onFotos: (actualizar: (previas: ArchivoElegido[]) => ArchivoElegido[]) => void;
  errorNombre?: string;
  errorFoto?: string;
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
        error={errorNombre}
      />
      <EtiquetaDelCampo label="Foto del documento de identidad *" />
      {/* Una sola: si se elige otra, reemplaza a la anterior. */}
      <FotosDelEnvio
        fotos={fotos}
        onCambiar={(actualizar) => onFotos((previas) => actualizar(previas).slice(-1))}
      />
      {errorFoto ? <Text className="-mt-2 text-xs text-red-600">{errorFoto}</Text> : null}
    </View>
  );
}
