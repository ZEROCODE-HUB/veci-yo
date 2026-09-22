import { theme } from "@/config";
import { View, Text } from "react-native";
import type { CorrespondenciaItem } from "@/shared/types";

const ESTADO_COLORES: Record<
  CorrespondenciaItem["estado"],
  { fondo: string; texto: string }
> = {
  Entregado: { fondo: theme.colors.secondary, texto: theme.colors.bgCard },
  "En Portería": { fondo: theme.colors.border, texto: theme.colors.textSecondary },
  "No Recibido": { fondo: theme.colors.primary, texto: theme.colors.text },
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
