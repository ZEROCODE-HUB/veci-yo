import React from "react";
import { Text, View } from "react-native";
import { theme } from "@/config";
import { Input } from "@/shared/components";
import { SeccionDeConfiguracion } from "./SeccionDeConfiguracion";
import type { RentaCorta } from "./tipos";

/** El libro del huésped: wifi, clave de la puerta, instrucciones y notas. */
export function LibroDelAlojamiento({ renta: r }: { renta: RentaCorta }) {
  const { guestbook: g, setGuestbook } = r;
  const campo = (clave: keyof typeof g) => (v: string) =>
    setGuestbook((p) => ({ ...p, [clave]: v }));
  return (
    <SeccionDeConfiguracion titulo="Información del alojamiento — Guestbook">
      <View className="flex-col gap-3">
        <Input
          label="Wi-Fi (nombre)"
          value={g.wifiName}
          onChangeText={campo("wifiName")}
          placeholder="Nombre de red"
        />
        <Input
          label="Contraseña Wi-Fi"
          value={g.wifiPassword}
          onChangeText={campo("wifiPassword")}
          placeholder="Contraseña"
        />
        <Input
          label="Contraseña de la puerta"
          value={g.doorPassword}
          onChangeText={campo("doorPassword")}
          placeholder="Código / contraseña"
        />
        <View>
          <Text className="text-sm mb-1" style={{ color: theme.colors.textSecondary }}>
            Instrucciones adicionales
          </Text>
          <Input
            value={g.instructions}
            onChangeText={campo("instructions")}
            placeholder="Instrucciones de acceso..."
            multiline
          />
        </View>
        <View>
          <Text className="text-sm mb-1" style={{ color: theme.colors.textSecondary }}>
            Notas del alojamiento
          </Text>
          <Input
            value={g.notes}
            onChangeText={campo("notes")}
            placeholder="Notas adicionales..."
            multiline
          />
        </View>
      </View>
    </SeccionDeConfiguracion>
  );
}
