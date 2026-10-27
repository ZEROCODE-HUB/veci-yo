import React from "react";
import { Text, View } from "react-native";
import { InfoButton, Toggle } from "@/shared/components";
import { AdminSectionCard } from "./AdminSectionCard";

/**
 * Una sección de los permisos del edificio con un solo interruptor: su título,
 * el rótulo del interruptor y, si la lleva, la ayuda que explica qué cambia.
 */
export function PermisoConInterruptor({
  seccion,
  etiqueta,
  ayuda,
  valor,
  onCambiar,
  deshabilitado,
}: {
  seccion: string;
  etiqueta: string;
  ayuda?: { titulo: string; descripcion: string };
  valor: boolean;
  onCambiar: (valor: boolean) => void;
  deshabilitado?: boolean;
}) {
  return (
    <View className="gap-3">
      <Text className="text-base font-bold text-gray-900">{seccion}</Text>
      <AdminSectionCard>
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1 flex-row items-center gap-1">
            <Text className="text-base font-semibold text-gray-900">{etiqueta}</Text>
            {ayuda ? <InfoButton titulo={ayuda.titulo} descripcion={ayuda.descripcion} size={16} /> : null}
          </View>
          <Toggle
            value={valor}
            onChange={onCambiar}
            disabled={deshabilitado}
            accessibilityLabel={etiqueta}
          />
        </View>
      </AdminSectionCard>
    </View>
  );
}
