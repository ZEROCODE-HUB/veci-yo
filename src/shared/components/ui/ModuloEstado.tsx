import { theme } from "@/config";
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
        <Ionicons name="lock-closed" size={20} color={theme.colors.textSecondary} />
      </View>
      <View className="flex-row items-center gap-1.5">
        <Text className="text-lg font-bold text-gray-900">{titulo}</Text>
        <InfoButton
          variant="bloqueado"
          titulo={titulo}
          descripcion={descripcion}
          motivo={motivo}
          accion={accion}
          accionLabel={onAgregar ? "Agregar propiedad" : undefined}
          onAccion={onAgregar}
        />
      </View>
      {/*
        La coletilla y el boton, solo cuando de verdad hay una propiedad que
        registrar. Estaban a fuego: la frase pegada a `descripcion` y el boton
        siempre pintado con `onPress={onAgregar || (() => {})}` --el ultimo
        boton muerto que quedaba en la marca--.

        Se vio con un huesped cuya estancia habia terminado: la pantalla le
        decia «Tu estadía terminó ... Esta función se habilita al registrar una
        propiedad» y le ofrecia un boton de «Agregar propiedad» que no hacia
        nada, en un edificio donde solo se alojo tres noches.
      */}
      <Text className="text-sm text-gray-500 text-center leading-5">
        {onAgregar
          ? `${descripcion} Esta función se habilita al registrar una propiedad.`
          : descripcion}
      </Text>
      {onAgregar && (
        <Button variant="primary" fullWidth onPress={onAgregar}>
          Agregar propiedad
        </Button>
      )}
    </View>
  );
}
