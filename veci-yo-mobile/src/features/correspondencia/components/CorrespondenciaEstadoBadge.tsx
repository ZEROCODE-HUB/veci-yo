import { View, Text } from "react-native";
import type { CorrespondenciaItem } from "@/shared/types";

const ESTADO_COLORES: Record<
  CorrespondenciaItem["estado"],
  { fondo: string; texto: string }
> = {
  Entregado: { fondo: "#2563EB", texto: "#FFFFFF" },
  "En Portería": { fondo: "#E5E7EB", texto: "#6B7280" },
  "No Recibido": { fondo: "#F5B800", texto: "#111827" },
};

interface CorrespondenciaEstadoBadgeProps {
  estado: CorrespondenciaItem["estado"];
}

export function CorrespondenciaEstadoBadge({
  estado,
}: CorrespondenciaEstadoBadgeProps) {
  const colores = ESTADO_COLORES[estado];

  return (
    <View
      className="flex-row items-center rounded-full px-3 py-1"
      style={{ backgroundColor: colores.fondo }}
    >
      <Text className="text-sm font-semibold" style={{ color: colores.texto }}>
        {estado}
      </Text>
    </View>
  );
}
