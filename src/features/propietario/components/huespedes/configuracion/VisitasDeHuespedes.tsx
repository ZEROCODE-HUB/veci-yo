import React from "react";
import { Pressable, Text, View } from "react-native";
import { theme } from "@/config";
import { VISITAS_DE_HUESPED } from "../../../services/visitasDeHuesped";
import { SeccionDeConfiguracion } from "./SeccionDeConfiguracion";
import type { RentaCorta } from "./tipos";

/** Si los huéspedes temporales de la vivienda pueden registrar visitas. */
export function VisitasDeHuespedes({ renta: r }: { renta: RentaCorta }) {
  const elegido = r.permiteVisitasHuespedes;
  return (
    <SeccionDeConfiguracion titulo="Visitas de huéspedes">
      <Text className="text-sm text-center mb-3" style={{ color: theme.colors.textSecondary }}>
        ¿Permites que tus huéspedes temporales registren visitas?
      </Text>
      <View className="flex-col gap-3">
        {/*
          Las tres opciones salen de `VISITAS_DE_HUESPED` y no de un literal:
          escritas aqui, la tercera decia `aprobar-por-huesped` donde el
          repositorio espera `aprobar-cada-uno`, y elegirla no guardaba nada.
        */}
        {VISITAS_DE_HUESPED.map((opcion) => {
          const puesta = elegido === opcion.valor;
          return (
            <Pressable
              key={opcion.valor}
              onPress={() => r.setPermiteVisitasHuespedes(opcion.valor)}
              accessibilityRole="radio"
              accessibilityState={{ checked: puesta }}
              aria-checked={puesta}
              className="flex-row items-center gap-3 p-3.5 rounded-xl"
              style={{
                borderWidth: 1.5,
                borderColor: puesta ? theme.colors.primary : theme.colors.border,
                backgroundColor: puesta ? theme.colors.primaryLight : theme.colors.bgMuted,
              }}
            >
              <View
                className="w-5 h-5 rounded-full items-center justify-center"
                style={{
                  borderWidth: 2,
                  borderColor: puesta ? theme.colors.primary : theme.colors.border,
                }}
              >
                {puesta && (
                  <View
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: theme.colors.primary }}
                  />
                )}
              </View>
              <Text className="text-sm text-gray-900">{opcion.etiqueta}</Text>
            </Pressable>
          );
        })}
        <View className="rounded-xl p-3" style={{ backgroundColor: theme.colors.bgMuted }}>
          <Text className="text-xs" style={{ color: theme.colors.textMuted, lineHeight: 18 }}>
            Esta configuración aplica a todos los huéspedes temporales de esta
            propiedad.
          </Text>
        </View>
      </View>
    </SeccionDeConfiguracion>
  );
}
