import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/config";

interface Props {
  label: string;
  /** Debajo del nombre, para lo que el numero no dice por si solo. */
  ayuda?: string;
  valor: number;
  onCambiar: (valor: number) => void;
  minimo?: number;
  maximo?: number;
  /** Delante del nombre. Un icono decorativo, no informacion. */
  emoji?: string;
}

/**
 * Un numero pequeño que se sube y se baja con dos botones.
 *
 * Reemplaza a los campos de texto de 60 px de ancho con los que se pedian
 * «personas» y «menores». Un teclado para un numero de un digito es trabajo de
 * mas, se puede teclear cualquier cosa --«03», un espacio, letras en algunos
 * teclados-- y el tope se aplicaba al perder el foco, asi que el campo
 * enseñaba un rato un valor que no se iba a guardar.
 *
 * Los dos botones no pueden escribir nada que no sea valido, y cuando se llega
 * al tope se apagan **diciendolo** --`disabled` ademas de la opacidad-- en vez
 * de dejar de responder sin explicacion.
 */
export function Contador({
  label,
  ayuda,
  valor,
  onCambiar,
  minimo = 0,
  maximo = 99,
  emoji,
}: Props) {
  const enElMinimo = valor <= minimo;
  const enElMaximo = valor >= maximo;

  const Boton = ({
    icono,
    nombre,
    apagado,
    alPulsar,
  }: {
    icono: "remove" | "add";
    nombre: string;
    apagado: boolean;
    alPulsar: () => void;
  }) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={nombre}
      accessibilityState={{ disabled: apagado }}
      aria-disabled={apagado}
      disabled={apagado}
      onPress={alPulsar}
      className="w-9 h-9 rounded-full items-center justify-center"
      style={{
        backgroundColor: apagado
          ? theme.colors.borderLight
          : theme.colors.secondaryLight,
        borderWidth: 1,
        borderColor: apagado ? theme.colors.border : theme.colors.secondary,
      }}
    >
      <Ionicons
        name={icono}
        size={18}
        color={apagado ? theme.colors.borderStrong : theme.colors.secondary}
      />
    </Pressable>
  );

  return (
    <View className="flex-row items-center justify-between gap-3">
      <View className="flex-1">
        <Text className="text-sm font-medium text-gray-900">
          {emoji ? `${emoji} ` : ""}
          {label}
        </Text>
        {ayuda ? (
          <Text className="text-xs text-gray-500 mt-0.5">{ayuda}</Text>
        ) : null}
      </View>

      <View className="flex-row items-center gap-3">
        <Boton
          icono="remove"
          nombre={`Quitar uno a ${label}`}
          apagado={enElMinimo}
          alPulsar={() => onCambiar(Math.max(minimo, valor - 1))}
        />
        <Text
          className="text-base font-bold text-gray-900 text-center"
          style={{ minWidth: 24 }}
          accessibilityLabel={`${label}: ${valor}`}
        >
          {valor}
        </Text>
        <Boton
          icono="add"
          nombre={`Añadir uno a ${label}`}
          apagado={enElMaximo}
          alPulsar={() => onCambiar(Math.min(maximo, valor + 1))}
        />
      </View>
    </View>
  );
}
