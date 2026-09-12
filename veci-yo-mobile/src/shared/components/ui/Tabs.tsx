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
  "No Recibido": { bg: "#F5B800", color: "#111827" },
  "En Portería": { bg: "#E5E7EB", color: "#6B7280" },
  Entregado: { bg: "#2563EB", color: "#fff" },
  Pendiente: { bg: "#E5E7EB", color: "#6B7280" },
  "En curso": { bg: "#2563EB", color: "#fff" },
  Resuelto: { bg: "#16A34A", color: "#fff" },
  Aceptado: { bg: "#2563EB", color: "#fff" },
  Ingresado: { bg: "#16A34A", color: "#fff" },
  Rechazado: { bg: "#EF4444", color: "#fff" },
  Reservado: { bg: "#F5B800", color: "#111827" },
  "No disponible": { bg: "#E5E7EB", color: "#6B7280" },
  Disponible: { bg: "#2563EB", color: "#fff" },
  Todos: { bg: "#111827", color: "#fff" },
  Todas: { bg: "#111827", color: "#fff" },
  Atrasado: { bg: "#F5B800", color: "#111827" },
  Deudor: { bg: "#E5E7EB", color: "#6B7280" },
  "Al día": { bg: "#2563EB", color: "#fff" },
  Inscripto: { bg: "#F5B800", color: "#111827" },
  "No inscripto": { bg: "#E5E7EB", color: "#6B7280" },
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
            STATUS_COLORS[value] || { bg: "#F5B800", color: "#111827" };
          bg = colors.bg;
          color = colors.color;
          borderWidth = isActive ? 2.5 : 2.5;
          borderColorVal = isActive ? "#111827" : "transparent";
          opacity = isActive ? 1 : 0.6;
        } else {
          bg = isActive ? "#F5B800" : "#FFFFFF";
          color = "#111827";
          borderWidth = isActive ? 2 : 1.5;
          borderColorVal = isActive ? "#111827" : "#E5E7EB";
          opacity = 1;
        }

        return (
          <Pressable
            key={value}
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
