import { theme } from "@/config";
import React from "react";
import { Text, View } from "react-native";
import { Input } from "@/shared/components";
import type { EstadoCalendario } from "../../services/suscripcion.repo";

interface Props {
  nombre: string;
  emoji: string;
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
  emoji,
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
        <Text style={{ fontSize: 24 }}>{emoji}</Text>
        <Text className="text-sm font-medium text-gray-900">{nombre}</Text>
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
