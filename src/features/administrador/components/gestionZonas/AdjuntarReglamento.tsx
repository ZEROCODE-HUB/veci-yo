import React from "react";
import { Pressable, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useUIStore } from "@/stores";
import { mensajeDeError } from "@/shared/utils";
import { elegirDocumento } from "@/shared/services/elegir-archivo";
import { formatoDeArchivo, type ArchivoElegido } from "@/shared/services/archivos";
import { FORMATOS_DE_RESPALDO } from "@/shared/constants/formatosDeArchivo";

interface AdjuntarReglamentoProps {
  /** El que ya está guardado en la zona. */
  nombreGuardado?: string | null;
  /** `undefined`: sin cambios; `null`: se quita; un archivo: se sube al guardar. */
  elegido: ArchivoElegido | null | undefined;
  onCambiar: (archivo: ArchivoElegido | null | undefined) => void;
}

/**
 * El reglamento de la zona como documento, PDF o Word (Para Claude 201,
 * 01/11/2026). Se sube al guardar la zona, con el resto del formulario.
 */
export function AdjuntarReglamento({ nombreGuardado, elegido, onCambiar }: AdjuntarReglamentoProps) {
  const addToast = useUIStore((s) => s.addToast);
  const { data: formato } = useQuery({
    queryKey: ["formato-de-archivo", "reglamento"],
    queryFn: () => formatoDeArchivo("reglamento"),
  });
  const tipos = formato ?? FORMATOS_DE_RESPALDO.reglamento;

  const nombre = elegido === undefined ? nombreGuardado : elegido?.nombre;

  const elegir = async () => {
    try {
      const archivo = await elegirDocumento(tipos.tiposMime);
      if (archivo) onCambiar(archivo);
    } catch (e) {
      addToast(mensajeDeError(e, "No se pudo elegir el archivo"), "error");
    }
  };

  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold text-gray-900">Documento del reglamento (opcional)</Text>
      <Text className="text-xs leading-4 text-gray-500">
        {nombre
          ? `${nombre}${elegido ? " · se sube al guardar" : ""}`
          : `Sin documento. Puedes adjuntar un ${tipos.extensiones}.`}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        <Pressable
          onPress={() => void elegir()}
          accessibilityRole="button"
          className="rounded-full border border-primary px-3 py-1.5 active:opacity-70"
        >
          <Text className="text-xs font-semibold text-primary">
            {nombre ? "Cambiar documento" : "Adjuntar documento"}
          </Text>
        </Pressable>
        {nombre ? (
          <Pressable
            onPress={() => onCambiar(null)}
            accessibilityRole="button"
            className="rounded-full border border-gray-200 px-3 py-1.5 active:opacity-70"
          >
            <Text className="text-xs text-gray-600">Quitar</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
