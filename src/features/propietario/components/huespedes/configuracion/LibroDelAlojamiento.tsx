import React from "react";
import { View } from "react-native";
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
          label="Nombre del Wi-Fi (opcional)"
          value={g.wifiName}
          onChangeText={campo("wifiName")}
          placeholder="Nombre de red"
        />
        <Input
          label="Contraseña del Wi-Fi (opcional)"
          value={g.wifiPassword}
          onChangeText={campo("wifiPassword")}
          placeholder="Contraseña"
        />
        <Input
          label="Contraseña de la puerta (opcional)"
          explicacion="El huésped la ve en «Mi alojamiento» solo mientras dura su estancia. Se guarda cifrada."
          value={g.doorPassword}
          onChangeText={campo("doorPassword")}
          placeholder="Código / contraseña"
        />
        <Input
          label="Instrucciones adicionales (opcional)"
          value={g.instructions}
          onChangeText={campo("instructions")}
          placeholder="Instrucciones de acceso..."
          multiline
        />
        <Input
          label="Notas del alojamiento (opcional)"
          value={g.notes}
          onChangeText={campo("notes")}
          placeholder="Notas adicionales..."
          multiline
        />
      </View>
    </SeccionDeConfiguracion>
  );
}
