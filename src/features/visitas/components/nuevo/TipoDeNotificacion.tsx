import React from "react";
import { Pressable, Text, View } from "react-native";
import { theme } from "@/config";
import type { AltaDeVisita } from "./tipos";

const OPCIONES = [
  { id: "solo_notificar" as const, label: "Solo notificar" },
  { id: "notificar_y_anunciar" as const, label: "Notificar y anunciar" },
];

/**
 * Cómo se avisa al residente de que alguien viene.
 *
 * **No aparece para el huésped temporal**, por decisión del cliente del
 * 02/10/2026: una estancia de varios días no se anuncia, se reserva. A la
 * portería se le dice que entra por anuncio.
 */
export function TipoDeNotificacion({ alta: v }: { alta: AltaDeVisita }) {
  if (v.tipoSeleccionado === "huesped-temporal") return null;

  if (v.esGuardia) {
    return (
      <View
        className="rounded-xl p-3"
        style={{ backgroundColor: theme.colors.borderLight, borderWidth: 1, borderColor: theme.colors.border }}
      >
        <Text className="text-sm text-gray-600 text-center">
          Ingreso mediante <Text className="font-bold">anuncio</Text> — se
          notificará y anunciará al residente. La opción "solo notificado"
          aplica únicamente cuando el residente pre-registró la visita.
        </Text>
      </View>
    );
  }

  return (
    <View
      className="rounded-2xl p-4 gap-3"
      style={{ backgroundColor: theme.colors.bgMuted, boxShadow: theme.shadows.card }}
    >
      <Text className="text-base font-semibold text-center text-gray-900">Tipo de notificación</Text>
      <View className="flex-row gap-2">
        {OPCIONES.map((op) => {
          const puesta = v.aviso === op.id;
          return (
            <Pressable
              key={op.id}
              onPress={() => v.setAviso(op.id)}
              /*
                Son dos opciones excluyentes y lo único que decía cuál estaba
                elegida era el color del fondo. `aria-checked` aparte porque
                react-native-web no traduce `accessibilityState`.
              */
              accessibilityRole="radio"
              accessibilityState={{ checked: puesta }}
              aria-checked={puesta}
              className="flex-1 items-center py-3 rounded-xl"
              style={{
                backgroundColor: puesta ? theme.colors.primary : theme.colors.borderLight,
                borderWidth: 1.5,
                borderColor: puesta ? theme.colors.primary : theme.colors.border,
              }}
            >
              <Text
                className="text-sm text-center"
                style={{
                  color: puesta ? theme.colors.textInverse : theme.colors.text,
                  fontWeight: puesta ? "600" : "400",
                }}
              >
                {op.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
