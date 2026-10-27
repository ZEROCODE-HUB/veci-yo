import React from "react";
import { Text, View } from "react-native";
import { theme } from "@/config";
import { Toggle } from "@/shared/components";
import { SeccionDeConfiguracion } from "./SeccionDeConfiguracion";
import type { RentaCorta } from "./tipos";

const EQUIPAMIENTO = [
  { key: "antirruido", label: "Dispositivo antirruido" },
  { key: "noFumar", label: 'Señalética de "no fumar"' },
  { key: "sensor", label: "Sensor de incendio / gas / CO2" },
] as const;

/**
 * Lo que el anfitrión declara que tiene el departamento.
 *
 * Aquí estaban «Ocultar número de departamento en la lista pública» y «Ocultar
 * mi teléfono». Se quitaron el 16/10/2026: la lista de renta corta pasó a ser
 * solo de la portería y la administración, que ven siempre el número y el
 * teléfono, así que las dos casillas ya no cambiaban nada. Las columnas se
 * quedan.
 */
export function ConfianzaDelDepartamento({ renta: r }: { renta: RentaCorta }) {
  return (
    <SeccionDeConfiguracion titulo="Confianza del departamento">
      {/*
        Dice qué significa marcarlas, porque hasta hoy no lo decía y lo que
        salía al otro lado era un icono verde indistinguible de una
        comprobación del edificio (REVISAR-A-OJO 174).
      */}
      <Text className="text-xs text-center mb-3" style={{ color: theme.colors.textSecondary }}>
        Marca lo que tu departamento tiene. Se muestra en la lista de renta corta
        como declarado por ti, hasta que la administración suba a comprobarlo.
        Si cambias alguna después, la comprobación se borra y hay que repetirla.
      </Text>
      {EQUIPAMIENTO.map((op) => (
        <View
          key={op.key}
          className="flex-row items-center justify-between py-2.5"
          style={{ borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight }}
        >
          <Text className="shrink text-sm text-gray-900">{op.label}</Text>
          <Toggle
            value={!!r.cumplimiento[op.key]}
            onChange={(v) => r.setCumplimiento((c) => ({ ...c, [op.key]: v }))}
          />
        </View>
      ))}
    </SeccionDeConfiguracion>
  );
}
