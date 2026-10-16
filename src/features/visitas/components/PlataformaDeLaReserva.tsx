import { theme } from "@/config";
import React from "react";
import { Pressable, Text, View } from "react-native";
import type { PlataformaReserva } from "@/shared/types";

/**
 * De dónde viene una reserva y cómo entró el dato.
 *
 * La responsable de producto (16/10/2026): «logo de Airbnb o Booking si vienen
 * del calendario, o Directo si es nuestro», y «fuente y método de ingreso del
 * dato». La fuente es `plataforma`; el método, `origen` (calendario o a mano).
 *
 * El «logo» es la marca escrita en su color: no tenemos los archivos de las
 * marcas y una imagen de otra empresa necesita su permiso (REVISAR-A-OJO).
 */
export const NOMBRE_DE_PLATAFORMA: Record<PlataformaReserva, string> = {
  airbnb: "Airbnb",
  booking: "Booking",
  directo: "Directo",
  otra: "Otra plataforma",
};

const COLOR: Record<PlataformaReserva, string> = {
  airbnb: theme.colors.marcaAirbnb,
  booking: theme.colors.marcaBooking,
  directo: theme.colors.primary,
  otra: theme.colors.textMuted,
};

interface DistintivoProps {
  plataforma?: PlataformaReserva;
  /** `calendario` o `veciyo` (a mano). */
  origen?: "veciyo" | "calendario";
  /** Con la línea de «fuente y método», para la ficha. */
  conDetalle?: boolean;
}

export function DistintivoDePlataforma({ plataforma, origen, conDetalle }: DistintivoProps) {
  if (!plataforma) return null;
  const metodo = origen === "calendario" ? "Calendario (automático)" : "A mano";
  return (
    <View className="flex-row flex-wrap items-center gap-2">
      <View
        className="rounded-full px-2.5 py-0.5"
        style={{ backgroundColor: COLOR[plataforma] }}
      >
        <Text
          className="text-2xs font-bold"
          style={{ color: plataforma === "directo" ? theme.colors.text : theme.colors.textInverse }}
        >
          {NOMBRE_DE_PLATAFORMA[plataforma]}
        </Text>
      </View>
      {conDetalle ? (
        <Text className="text-2xs text-gray-500">
          Fuente: {NOMBRE_DE_PLATAFORMA[plataforma]} · Ingreso: {metodo}
        </Text>
      ) : null}
    </View>
  );
}

interface SelectorProps {
  valor: PlataformaReserva;
  onCambiar: (valor: PlataformaReserva) => void;
}

const OPCIONES: PlataformaReserva[] = ["airbnb", "booking", "directo"];

/** Al crear una reserva a mano: de qué plataforma viene. */
export function SelectorDePlataforma({ valor, onCambiar }: SelectorProps) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold text-gray-900">
        ¿De dónde viene la reserva?
      </Text>
      <View className="flex-row gap-2" accessibilityRole="radiogroup">
        {OPCIONES.map((opcion) => {
          const elegida = valor === opcion;
          return (
            <Pressable
              key={opcion}
              onPress={() => onCambiar(opcion)}
              accessibilityRole="radio"
              accessibilityLabel={NOMBRE_DE_PLATAFORMA[opcion]}
              accessibilityState={{ checked: elegida }}
              aria-checked={elegida}
              className="flex-1 items-center rounded-full border py-2"
              style={{
                borderColor: elegida ? COLOR[opcion] : theme.colors.borderStrong,
                backgroundColor: elegida ? COLOR[opcion] : theme.colors.bgCard,
              }}
            >
              <Text
                className="text-sm font-semibold"
                style={{
                  color: !elegida
                    ? theme.colors.textMuted
                    : opcion === "directo"
                      ? theme.colors.text
                      : theme.colors.textInverse,
                }}
              >
                {NOMBRE_DE_PLATAFORMA[opcion]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
