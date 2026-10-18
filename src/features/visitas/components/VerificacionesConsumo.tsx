import React from "react";
import { View, Text, Pressable } from "react-native";
import { theme } from "@/config";
import { useParametrosDeLaBase } from "@/shared/hooks";

interface Verificaciones {
  incluidas?: number;
  suscritasUsadas?: number;
  suplementarias?: number;
  vencimientoSuplementarias?: string;
}

interface VerificacionesConsumoProps {
  verificaciones: Verificaciones | null;
  suscripcionActiva?: boolean;
  /**
   * Compra un paquete. Sin esto la barra decía cuántas quedaban y no había
   * forma de conseguir más: la tabla y el precio estaban, y el botón no.
   */
  onComprarPaquete?: (cantidad: number) => void;
  comprando?: boolean;
}

function Barra({
  label,
  disponibles,
  total,
}: {
  label: string;
  disponibles: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((disponibles / total) * 100) : 0;

  return (
    <View className="mb-2.5">
      <View className="flex-row justify-between mb-1">
        <Text className="text-xs text-gray-900 flex-1" numberOfLines={2}>
          {label}
        </Text>
        <Text className="text-xs font-semibold text-gray-500 ml-2 shrink-0 text-right">
          {disponibles} disponibles
        </Text>
      </View>
      <View className="h-2 rounded-full bg-gray-200 overflow-hidden">
        <View
          className="h-full rounded-full bg-primary"
          style={{ width: `${pct}%` }}
        />
      </View>
    </View>
  );
}

export function VerificacionesConsumo({
  verificaciones,
  suscripcionActiva = false,
  onComprarPaquete,
  comprando = false,
}: VerificacionesConsumoProps) {
  const parametros = useParametrosDeLaBase();

  if (!verificaciones) {
    return (
      <View className="mt-2.5 pt-2.5 border-t border-gray-200">
        <Text className="text-xs text-gray-400">
          Sin información de verificaciones para esta propiedad.
        </Text>
      </View>
    );
  }

  /*
    Las incluidas vienen de la base (`consumo_verificaciones.incluidas`). Antes
    se suponían 20 si no llegaban: sin el dato no se inventa el número, y la
    barra del paquete base no sale.
  */
  const incluidas = verificaciones.incluidas;
  const usadas = verificaciones.suscritasUsadas ?? 0;
  const baseDisponibles =
    incluidas === undefined ? null : Math.max(0, incluidas - usadas);
  const adicional = verificaciones.suplementarias ?? 0;
  const vencimiento = verificaciones.vencimientoSuplementarias;

  return (
    <View className="mt-2.5 pt-2.5 border-t border-gray-200">
      {!suscripcionActiva && (
        <Text className="text-2xs text-gray-400 mb-2">
          Sin suscripción activa
        </Text>
      )}
      {incluidas !== undefined && baseDisponibles !== null && (
        <Barra
          label="Verificaciones disponibles · Paquete base"
          disponibles={baseDisponibles}
          total={incluidas}
        />
      )}
      {adicional > 0 && (
        <Barra
          label={`Verificaciones disponibles · Paquete adicional${vencimiento ? ` (vence ${vencimiento})` : ""}`}
          disponibles={adicional}
          total={Math.max(adicional, 1)}
        />
      )}

      {/*
          Se ofrece cuando quedan pocas, que es cuando hace falta. Antes la
          barra decía cuántas quedaban y no había forma de conseguir más.
          Cuántas son «pocas» (`verificaciones_aviso_quedan`) y de cuántas es
          el paquete (`verificaciones_paquete_tamano`) son parámetros.
      */}
      {onComprarPaquete &&
        suscripcionActiva &&
        parametros.listo &&
        baseDisponibles !== null &&
        baseDisponibles <= parametros.numero("verificaciones_aviso_quedan") && (
        <Pressable
          onPress={() =>
            onComprarPaquete(parametros.numero("verificaciones_paquete_tamano"))
          }
          disabled={comprando}
          className="mt-1 items-center rounded-lg border border-dashed border-gray-300 px-3 py-2"
        >
          <Text
            className="text-xs font-semibold"
            style={{ color: theme.colors.primary }}
          >
            {comprando
              ? "Comprando…"
              : `Comprar paquete de ${parametros.numero("verificaciones_paquete_tamano")} verificaciones`}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
