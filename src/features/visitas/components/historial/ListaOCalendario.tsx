import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/config";

type Vista = "lista" | "calendario";

const OPCIONES = [
  { value: "lista" as const, label: "Lista", icon: "list" as const },
  { value: "calendario" as const, label: "Calendario", icon: "calendar" as const },
];

/**
 * El interruptor entre la lista y el calendario del historial de visitas.
 *
 * Salió de `VisitasHistorialScreen` el 26/10/2026; hace lo mismo que hacía allí.
 */
export function ListaOCalendario({
  valor,
  onChange,
}: {
  valor: Vista;
  onChange: (v: Vista) => void;
}) {
  return (
    <View
      className="flex-row self-center rounded-full p-0.5"
      style={{ backgroundColor: theme.colors.bgMuted, gap: 2 }}
    >
      {OPCIONES.map((op) => {
        const active = valor === op.value;
        return (
          <Pressable
            key={op.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            aria-selected={active}
            onPress={() => onChange(op.value)}
            className="flex-row items-center gap-1.5 rounded-full px-4 py-1.5"
            style={{
              backgroundColor: active ? theme.colors.bgCard : "transparent",
              boxShadow: active ? theme.shadows.pestanaActiva : "none",
            }}
          >
            <Ionicons
              name={op.icon}
              size={14}
              color={active ? theme.colors.text : theme.colors.textSecondary}
            />
            <Text
              className="text-xs"
              style={{
                color: active ? theme.colors.text : theme.colors.textSecondary,
                fontWeight: active ? "700" : "500",
              }}
            >
              {op.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
