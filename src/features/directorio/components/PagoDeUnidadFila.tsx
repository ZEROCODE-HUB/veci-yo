import React from "react";
import { View, Text, Pressable } from "react-native";
import { theme } from "@/config";
import { Checkbox } from "@/shared/components/ui";

interface PagoDeUnidadFilaProps {
  codigo: string;
  propietario: string;
  /** Lo que paga esta vivienda, ya con su moneda. Vacío si aún no se sabe. */
  importe: string;
  /** Paga un importe distinto del general. */
  importePropio: boolean;
  pagada: boolean;
  /** No hay mes elegido: no hay nada que marcar todavía. */
  sinMes: boolean;
  guardando: boolean;
  enComite: boolean;
  /** El propietario tiene cuenta: sin cuenta no puede estar en el comité. */
  propietarioConCuenta: boolean;
  cambiandoComite: boolean;
  onPagada: (pagada: boolean) => void;
  onCambiarImporte: () => void;
  onComite: (enComite: boolean) => void;
}

/** Una vivienda en la lista de pagos: si pagó, cuánto paga y si es del comité. */
export function PagoDeUnidadFila({
  codigo,
  propietario,
  importe,
  importePropio,
  pagada,
  sinMes,
  guardando,
  enComite,
  propietarioConCuenta,
  cambiandoComite,
  onPagada,
  onCambiarImporte,
  onComite,
}: PagoDeUnidadFilaProps) {
  return (
    <View
      className="rounded-[20px] bg-white p-3"
      style={{ gap: 6, boxShadow: theme.shadows.card }}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 flex-row flex-wrap items-center pr-1">
          <Text className="text-sm font-semibold text-gray-900">
            {codigo} — {propietario}
          </Text>
          {enComite ? (
            <View className="ml-1 rounded-full bg-blue-100 px-1.5 py-0.5">
              <Text className="text-[10px] font-semibold text-blue-800">
                Comité de Propietarios
              </Text>
            </View>
          ) : null}
        </View>
        <View style={{ width: 90 }}>
          <Checkbox
            checked={pagada}
            disabled={sinMes || guardando}
            onChange={onPagada}
            label="Pagado"
            /*
              Con la vivienda dentro. Son cuatro casillas iguales, una por
              depto, y la etiqueta visible no las distingue porque eso lo
              dice la fila --que se ve--. Quien no la ve oía «Pagado,
              casilla, marcada» cuatro veces seguidas.
            */
            nombreAccesible={`Pagado · ${codigo}`}
          />
        </View>
      </View>

      <View className="flex-row items-center justify-between gap-3">
        <Text className="flex-1 text-xs text-gray-500">
          {importe
            ? `Paga ${importe}${importePropio ? " · importe propio" : ""}`
            : "Sin importe configurado"}
        </Text>
        <Pressable
          onPress={onCambiarImporte}
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
        /*
          El botón salía apagado y sin explicación. El comité es de personas
          con cuenta: mientras el propietario no acepte su invitación, no hay
          a quién apuntar.
        */
        <Text className="text-center text-[11px] leading-4 text-gray-400">
          Para el comité, el propietario tiene que tener cuenta en Veciyo.
        </Text>
      )}
    </View>
  );
}
