import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Button, Input } from "@/shared/components";
import { useUIStore } from "@/stores";
import { mensajeDeError } from "@/shared/utils/error.util";
import { useClavePuertaEstancia } from "../hooks/useClavePuertaEstancia";

interface Props {
  visitaId: string;
}

/**
 * La clave de la puerta de esta reserva (16/10/2026).
 *
 * La responsable de producto: «en cada reserva, un campo para la clave de la
 * puerta; solo el anfitrión la pone y solo la ve el huésped, en Alojamiento».
 * Si se deja vacía, el huésped ve la clave de la vivienda, la de siempre.
 */
export function ClaveDePuertaDeLaReserva({ visitaId }: Props) {
  const { addToast } = useUIStore();
  const { clave, cargando, guardar } = useClavePuertaEstancia(visitaId);
  const [texto, setTexto] = useState("");

  useEffect(() => {
    setTexto(clave ?? "");
  }, [clave]);

  const cambiada = texto.trim() !== (clave ?? "");

  const alGuardar = async () => {
    try {
      await guardar.mutateAsync(texto);
      addToast(texto.trim() ? "Clave de la puerta guardada" : "Clave quitada", "success");
    } catch (e) {
      addToast(mensajeDeError(e, "No se pudo guardar la clave"), "error");
    }
  };

  return (
    <View className="rounded-2xl bg-white p-4 gap-2 shadow-sm">
      <Text className="text-base font-bold text-gray-900">Clave de la puerta</Text>
      <Text className="text-xs text-gray-500">
        Solo para esta reserva. La ve únicamente tu huésped, en Mi alojamiento,
        desde el día de llegada. Vacía, verá la clave de la vivienda.
      </Text>
      <Input
        label="Clave de la puerta de esta reserva"
        value={texto}
        onChangeText={setTexto}
        placeholder="Ej.: 4821#"
        editable={!cargando}
        showEditIcon={false}
      />
      <Button size="sm" disabled={!cambiada} loading={guardar.isPending} onPress={alGuardar}>
        Guardar clave
      </Button>
    </View>
  );
}
