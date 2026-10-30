import React from "react";
import { View, Text, Pressable } from "react-native";
import { theme } from "@/config";

interface PagoDeUnidadFilaProps {
  codigo: string;
  propietario: string;
  /** «Pagado», «Pago parcial» o «No pagado» (Para Claude 188, 30/10/2026). */
  estado: "Pagado" | "Pago parcial" | "No pagado";
  /** Cuánto debe, cuánto pagó y cuánto falta, ya con la moneda. Vacío sin mes. */
  resumen: string;
  /** Paga un importe distinto del general o tiene importes variables. */
  importePropio: boolean;
  /** No hay mes elegido: no hay nada que registrar todavía. */
  sinMes: boolean;
  guardando: boolean;
  enComite: boolean;
  /** El propietario tiene cuenta: sin cuenta no puede estar en el comité. */
  propietarioConCuenta: boolean;
  cambiandoComite: boolean;
  onRegistrarPago: () => void;
  onCambiarImporte: () => void;
  onComite: (enComite: boolean) => void;
}

const COLOR: Record<PagoDeUnidadFilaProps["estado"], { fondo: string; texto: string }> = {
  Pagado: { fondo: theme.colors.successSoft, texto: theme.colors.badgeGreenText },
  "Pago parcial": { fondo: theme.colors.warningSoft, texto: theme.colors.badgeAmberText },
  "No pagado": { fondo: theme.colors.bgMuted, texto: theme.colors.textSecondary },
};

/**
 * Una vivienda en la lista de pagos: en qué estado está, cuánto paga, y el
 * comité. La casilla «Pagado» se cambió por «Registrar pago», que pide cuánto
 * pagó (Para Claude 188, 30/10/2026).
 */
export function PagoDeUnidadFila({
  codigo,
  propietario,
  estado,
  resumen,
  importePropio,
  sinMes,
  guardando,
  enComite,
  propietarioConCuenta,
  cambiandoComite,
  onRegistrarPago,
  onCambiarImporte,
  onComite,
}: PagoDeUnidadFilaProps) {
  const color = COLOR[estado];
  return (
    <View className="rounded-[20px] bg-white p-3" style={{ gap: 6, boxShadow: theme.shadows.card }}>
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 flex-row flex-wrap items-center pr-1">
          <Text className="text-sm font-semibold text-gray-900">
            {codigo} — {propietario}
          </Text>
          {enComite ? (
            <View className="ml-1 rounded-full bg-blue-100 px-1.5 py-0.5">
              <Text className="text-2xs font-semibold text-blue-800">Comité de Propietarios</Text>
            </View>
          ) : null}
        </View>
        <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: color.fondo }}>
          <Text className="text-2xs font-semibold" style={{ color: color.texto }}>
            {estado}
          </Text>
        </View>
      </View>

      <Text className="text-xs text-gray-500">
        {resumen ? `${resumen}${importePropio ? " · importe propio" : ""}` : "Sin importe configurado"}
      </Text>

      <View className="flex-row flex-wrap items-center gap-2">
        {estado !== "Pagado" ? (
          <Pressable
            onPress={onRegistrarPago}
            disabled={sinMes || guardando}
            accessibilityRole="button"
            accessibilityLabel={`Registrar pago de ${codigo}`}
            className="rounded-full bg-primary px-3 py-1 active:opacity-70"
            style={{ opacity: sinMes || guardando ? 0.5 : 1 }}
          >
            <Text className="text-xs font-semibold text-white">
              {estado === "Pago parcial" ? "Registrar otro pago" : "Registrar pago"}
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={onCambiarImporte}
          disabled={sinMes}
          accessibilityRole="button"
          accessibilityLabel={`Cambiar el importe de ${codigo}`}
          className="rounded-full border border-gray-200 px-2.5 py-1 active:opacity-70"
        >
          <Text className="text-xs text-gray-600">Cambiar importe</Text>
        </Pressable>
      </View>

      {propietarioConCuenta ? (
        <Pressable
          disabled={cambiandoComite}
          onPress={() => onComite(!enComite)}
          accessibilityRole="button"
          className="w-full self-start rounded-full border border-gray-200 px-2.5 py-1 active:opacity-70"
          style={{ opacity: cambiandoComite ? 0.5 : 1 }}
        >
          <Text className="text-xs text-gray-600 text-center">
            {enComite ? "Quitar de Comité" : "Marcar Comité de Propietarios"}
          </Text>
        </Pressable>
      ) : (
        <Text className="text-center text-[11px] leading-4 text-gray-400">
          Para el comité, el propietario tiene que tener cuenta en Veciyo.
        </Text>
      )}
    </View>
  );
}
