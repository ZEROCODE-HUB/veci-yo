import { theme } from "@/config";
import React from "react";
import { Text, View } from "react-native";
import { Input, LogoDePlataforma } from "@/shared/components";
import type { EstadoCalendario } from "../../services/suscripcion.repo";

interface Props {
  nombre: string;
  /** Airbnb y Booking van con su logo (hueco 5); otra, con un enlace. */
  plataforma: "airbnb" | "booking" | "otra";
  /** Cómo empieza el enlace en esa plataforma, para que se reconozca. */
  ejemplo: string;
  valor: string;
  onCambiar: (valor: string) => void;
  /** Lo guardado y cómo le fue a su última lectura. */
  estado?: EstadoCalendario;
}

/**
 * El calendario (iCal) de una plataforma: el enlace y cómo le fue a su última
 * lectura (21/10/2026). Uno por plataforma porque cada una da el suyo, y un
 * calendario deja de funcionar **en silencio**: lo único que lo delata es la
 * fecha de la última lectura.
 */
export function CalendarioDePlataforma({
  nombre,
  plataforma,
  ejemplo,
  valor,
  onCambiar,
  estado,
}: Props) {
  return (
    <View className="gap-1.5">
      <View
        className="flex-row items-center gap-2.5 p-3 rounded-xl"
        style={{
          backgroundColor: theme.colors.bgMuted,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}
      >
        {plataforma === "otra" ? (
          <>
            <Text style={{ fontSize: 24 }}>🔗</Text>
            <Text className="text-sm font-medium text-gray-900">{nombre}</Text>
          </>
        ) : (
          <LogoDePlataforma plataforma={plataforma} alto={22} />
        )}
      </View>
      <Text className="text-sm font-medium" style={{ color: theme.colors.textSecondary }}>
        {`Enlace de iCal de ${nombre}`}
      </Text>
      <Input value={valor} onChangeText={onCambiar} placeholder={ejemplo} />
      {estado ? (
        <Text className="text-xs text-gray-500">
          {estado.sincronizadoEn
            ? `Última lectura: ${estado.sincronizadoEn}`
            : "Todavía no se ha leído ninguna vez."}
        </Text>
      ) : null}
      {estado?.error ? (
        <Text className="text-xs text-danger">{estado.error}</Text>
      ) : null}
    </View>
  );
}
