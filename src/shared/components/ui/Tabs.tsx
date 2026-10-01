import { theme } from "@/config";
import React, { useRef } from "react";
import { ScrollView, Pressable, Text } from "react-native";

const SHORT_LABELS: Record<string, string> = {
  "No Recibido": "No recib.",
  "En Portería": "Portería",
  "No disponible": "No disp.",
  "No inscripto": "No inscr.",
  "Amigos Familiares": "Amigos",
  "Profesional Temporal": "Prof. Temp.",
  "Profesional Permanente": "Prof. Perm.",
  "Huésped Temporal": "Huésped",
  "Residente Permanente": "Residente",
};

export const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  "No Recibido": { bg: theme.colors.primary, color: theme.colors.text },
  "En Portería": { bg: theme.colors.border, color: theme.colors.textSecondary },
  Entregado: { bg: theme.colors.secondary, color: theme.colors.textInverse },
  Pendiente: { bg: theme.colors.border, color: theme.colors.textSecondary },
  "En curso": { bg: theme.colors.secondary, color: theme.colors.textInverse },
  Resuelto: { bg: theme.colors.success, color: theme.colors.textInverse },
  Aceptado: { bg: theme.colors.secondary, color: theme.colors.textInverse },
  Ingresado: { bg: theme.colors.success, color: theme.colors.textInverse },
  Rechazado: { bg: theme.colors.danger, color: theme.colors.textInverse },
  Reservado: { bg: theme.colors.primary, color: theme.colors.text },
  "No disponible": {
    bg: theme.colors.border,
    color: theme.colors.textSecondary,
  },
  Disponible: { bg: theme.colors.secondary, color: theme.colors.textInverse },
  Todos: { bg: theme.colors.text, color: theme.colors.textInverse },
  Todas: { bg: theme.colors.text, color: theme.colors.textInverse },
  Atrasado: { bg: theme.colors.primary, color: theme.colors.text },
  Deudor: { bg: theme.colors.border, color: theme.colors.textSecondary },
  "Al día": { bg: theme.colors.secondary, color: theme.colors.textInverse },
  Inscripto: { bg: theme.colors.primary, color: theme.colors.text },
  "No inscripto": {
    bg: theme.colors.border,
    color: theme.colors.textSecondary,
  },
};

interface TabItem {
  value: string;
  label: string;
}

interface TabsProps {
  tabs: (string | TabItem)[];
  active: string | null;
  onChange: (val: string | null) => void;
  variant?: "chip" | "status";
  statusColors?: Record<string, { bg: string; color: string }>;
  centered?: boolean;
  allowDeselect?: boolean;
  shortLabels?: Record<string, string>;
}

export function Tabs({
  tabs,
  active,
  onChange,
  variant = "chip",
  statusColors = {},
  centered = false,
  allowDeselect = true,
  shortLabels = {},
}: TabsProps) {
  const scrollRef = useRef<ScrollView>(null);

  const items: TabItem[] = tabs.map((t) =>
    typeof t === "string"
      ? { value: t, label: shortLabels[t] || SHORT_LABELS[t] || t }
      : t,
  );

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        gap: 8,
        paddingVertical: 2,
        paddingHorizontal: 2,
        ...(centered
          ? {
              minWidth: "100%",
              justifyContent: "center" as const,
            }
          : {
              justifyContent: "flex-start" as const,
            }),
      }}
    >
      {items.map(({ value, label }) => {
        const isActive = active === value;

        let bg: string;
        let color: string;
        let borderWidth: number;
        let borderColorVal: string;
        let opacity: number;

        if (variant === "status") {
          const colors = statusColors[value] ||
            STATUS_COLORS[value] || {
              bg: theme.colors.primary,
              color: theme.colors.text,
            };
          bg = colors.bg;
          color = colors.color;
          borderWidth = isActive ? 2.5 : 2.5;
          borderColorVal = isActive ? theme.colors.text : "transparent";
          opacity = isActive ? 1 : 0.6;
        } else {
          bg = isActive ? theme.colors.primary : theme.colors.bgCard;
          color = theme.colors.text;
          borderWidth = isActive ? 2 : 1.5;
          borderColorVal = isActive ? theme.colors.text : theme.colors.border;
          opacity = 1;
        }

        return (
          <Pressable
            key={value}
            /*
              Cuál está elegida se veía **solo** en el borde y la opacidad, así
              que un lector de pantalla anunciaba las cuatro igual y quien no ve
              la interfaz no sabía por qué estaba filtrando. El «✓» que algunas
              listas ponen delante de la activa se lee como un símbolo suelto, no
              como «seleccionado».

              `aria-selected` va aparte de `accessibilityState` porque
              react-native-web 0.21 no lo traduce: es lo mismo que pasó con
              `aria-checked` en `Toggle` y `Checkbox`.
            */
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            aria-selected={isActive}
            onPress={() => onChange(isActive && allowDeselect ? null : value)}
            className="h-[34px] flex-row items-center justify-center rounded-full px-3.5"
            style={{
              backgroundColor: bg,
              borderWidth,
              borderColor: borderColorVal,
              opacity,
            }}
          >
            <Text className="text-sm font-semibold" style={{ color }}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
