import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { InfoButton } from "./InfoButton";
import { Button } from "./Button";

interface ModuloBloqueadoProps {
  titulo: string;
  descripcion: string;
  motivo: string;
  accion: string;
  onAgregar?: () => void;
}

export function ModuloBloqueado({
  titulo,
  descripcion,
  motivo,
  accion,
  onAgregar,
}: ModuloBloqueadoProps) {
  return (
    <View className="bg-white rounded-xl shadow-card p-4 items-center gap-2">
      <View className="w-11 h-11 rounded-full bg-gray-100 items-center justify-center">
        <Ionicons name="lock-closed" size={20} color="#6B7280" />
      </View>
      <View className="flex-row items-center gap-1.5">
        <Text className="text-lg font-bold text-gray-900">{titulo}</Text>
        <InfoButton
          variant="bloqueado"
          titulo={titulo}
          descripcion={descripcion}
          motivo={motivo}
          accion={accion}
          accionLabel="Agregar propiedad"
          onAccion={onAgregar}
        />
      </View>
      <Text className="text-sm text-gray-500 text-center leading-5">
        {descripcion} Esta función se habilita al registrar una propiedad.
      </Text>
      <Button variant="primary" fullWidth onPress={onAgregar || (() => {})}>
        Agregar propiedad
      </Button>
    </View>
  );
}

interface IncognitoBannerProps {
  titulo: string;
  descripcion: string;
  help?: {
    titulo: string;
    descripcion: string;
    bullets?: string[];
    ejemplo?: string;
  };
}

export function IncognitoBanner({
  titulo,
  descripcion,
  help,
}: IncognitoBannerProps) {
  return (
    <View className="bg-secondary-light border border-secondary/20 rounded-xl p-3.5 flex-row items-center gap-2.5">
      <Ionicons name="eye-outline" size={20} color="#2563EB" />
      <View className="flex-1">
        <Text className="text-sm font-bold text-gray-900">{titulo}</Text>
        <Text className="text-xs text-gray-500" style={{ lineHeight: 18 }}>
          {descripcion}
        </Text>
      </View>
      {help && (
        <InfoButton
          variant="info"
          titulo={help.titulo}
          descripcion={help.descripcion}
          bullets={help.bullets}
          ejemplo={help.ejemplo}
        />
      )}
    </View>
  );
}
