import { theme } from "@/config";
import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Modal } from "@/shared/components";
import { formatDate, formatTime } from "@/shared/utils";
import {
  ACTUALIZACION,
  CAMBIOS,
  COMMIT,
  PUBLICADA_EN,
  VERSION,
} from "@/shared/version/version.generado";

/** «21/10/2026» a partir de «2026-10-21», sin pasar por la zona horaria. */
const diaDe = (iso: string) => {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
};

/**
 * Qué versión de la app es, cuándo se publicó y qué cambió (pedido del
 * 21/10/2026). Sirve sobre todo para probar: quien reporta un fallo puede
 * mirar si ya tiene el arreglo, y decir con qué versión lo vio.
 */
export function VersionDeLaApp() {
  const [abierta, setAbierta] = useState(false);
  const publicada = new Date(PUBLICADA_EN);

  return (
    <View
      className="rounded-xl px-4 py-3 gap-1"
      style={{ backgroundColor: theme.colors.bgMuted }}
    >
      <Text className="text-sm font-semibold text-gray-900">
        Versión {VERSION}
        {ACTUALIZACION ? ` · actualización ${ACTUALIZACION}` : null}
        {COMMIT ? <Text className="font-normal text-gray-500">{` (${COMMIT})`}</Text> : null}
      </Text>
      <Text className="text-xs text-gray-500">
        Publicada el {formatDate(publicada)} a las {formatTime(publicada)}
      </Text>
      <Pressable
        onPress={() => setAbierta(true)}
        accessibilityRole="button"
        className="mt-1 self-start"
      >
        <Text className="text-sm font-semibold" style={{ color: theme.colors.secondary }}>
          Ver últimos cambios
        </Text>
      </Pressable>

      <Modal visible={abierta} onClose={() => setAbierta(false)} title="Últimos cambios">
        <View className="gap-4">
          {CAMBIOS.map((c) => (
            <View key={c.fecha} className="gap-1.5">
              <Text className="text-sm font-bold text-gray-900">{diaDe(c.fecha)}</Text>
              {c.puntos.map((p) => (
                <Text key={p} className="text-sm text-gray-700">
                  {`•  ${p}`}
                </Text>
              ))}
            </View>
          ))}
        </View>
      </Modal>
    </View>
  );
}
