import React from "react";
import { Pressable, Text, View } from "react-native";
import { theme } from "@/config";

type Parentesco = "padre" | "madre" | "tutor_legal" | "otro";

const PARENTESCOS: { valor: Parentesco; nombre: string }[] = [
  { valor: "padre", nombre: "Padre" },
  { valor: "madre", nombre: "Madre" },
  { valor: "tutor_legal", nombre: "Tutor legal" },
  { valor: "otro", nombre: "Otro adulto" },
];

/**
 * «¿Con quién viene?» para un menor de una visita corriente (hueco 36,
 * 27/10/2026). Antes no se preguntaba: la portería veía a un niño y no sabía
 * con qué adulto entraba. Se elige entre el titular y los adultos de la
 * visita, y qué es de él: la base pide las dos cosas juntas.
 */
export function ConQuienViene({
  adultos,
  elegido,
  onElegir,
  parentesco,
  onParentesco,
}: {
  /** `valor` -1 es el titular; si no, la posición del acompañante. */
  adultos: { valor: number; nombre: string }[];
  elegido: number;
  onElegir: (valor: number) => void;
  parentesco?: Parentesco;
  onParentesco: (valor: Parentesco) => void;
}) {
  return (
    <View className="gap-1.5">
      <Text className="text-xs text-gray-500">¿Con quién viene?</Text>
      <View className="flex-row flex-wrap gap-1.5">
        {adultos.map((adulto) => (
          <Opcion
            key={adulto.valor}
            nombre={adulto.nombre}
            etiqueta={`Viene con ${adulto.nombre}`}
            marcado={adulto.valor === elegido}
            onPress={() => onElegir(adulto.valor)}
          />
        ))}
      </View>
      <Text className="text-xs text-gray-500">Y es su…</Text>
      <View className="flex-row flex-wrap gap-1.5">
        {PARENTESCOS.map((p) => (
          <Opcion
            key={p.valor}
            nombre={p.nombre}
            etiqueta={`Es su ${p.nombre.toLowerCase()}`}
            marcado={p.valor === parentesco}
            onPress={() => onParentesco(p.valor)}
          />
        ))}
      </View>
    </View>
  );
}

function Opcion({
  nombre,
  etiqueta,
  marcado,
  onPress,
}: {
  nombre: string;
  etiqueta: string;
  marcado: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={etiqueta}
      // Los dos: react-native-web no traduce `accessibilityState`.
      aria-checked={marcado}
      accessibilityState={{ checked: marcado }}
      className="rounded-full border px-3 py-1.5"
      style={{
        borderColor: marcado ? theme.colors.primary : theme.colors.borderLight,
        backgroundColor: marcado ? theme.colors.primary : theme.colors.bgCard,
      }}
    >
      <Text
        className="text-sm font-semibold"
        style={{ color: marcado ? theme.colors.textInverse : theme.colors.textSecondary }}
      >
        {nombre}
      </Text>
    </Pressable>
  );
}
