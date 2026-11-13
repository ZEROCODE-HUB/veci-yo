import React from "react";
import { View, Text, Pressable } from "react-native";
import { theme } from "@/config";
import { Bloque, Cargando, Checkbox } from "@/shared/components";

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
  /**
   * Todavía no se sabe quién tiene cuenta. Mientras tanto se leía «el
   * propietario tiene que tener cuenta» en todas las viviendas (13/11/2026).
   */
  comiteCargando?: boolean;
  onRegistrarPago: () => void;
  /**
   * Cuánto falta, ya con la moneda, para la casilla «Pagado». Null si no hay
   * nada que marcar (sin mes, o sin importe).
   */
  falta: string | null;
  /** La casilla «Pagado» de la lista: registra de una vez todo lo que falta. */
  onMarcarPagado: () => void;
  onCambiarImporte: () => void;
  onComite: (enComite: boolean) => void;
  /** Deshace lo registrado del mes, para un pago marcado por error (13/11/2026). */
  onDeshacerPago: () => void;
  deshaciendo: boolean;
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
 *
 * 09/11/2026 (Para Claude, «el checkbox debe estar directo en la lista»): la
 * casilla vuelve, al lado de «Registrar pago». Marcarla registra lo que falta
 * y la vivienda queda Pagado; un pago parcial sigue yendo por «Registrar
 * pago».
 *
 * 13/11/2026 (tester: «si lo marco por error no me deja cancelarlo»): un pago
 * registrado se puede deshacer con «Deshacer pago», que pide un segundo toque
 * para confirmar y deja la vivienda en «No pagado».
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
  comiteCargando = false,
  onRegistrarPago,
  falta,
  onMarcarPagado,
  onCambiarImporte,
  onComite,
  onDeshacerPago,
  deshaciendo,
}: PagoDeUnidadFilaProps) {
  const color = COLOR[estado];
  const [confirmandoDeshacer, setConfirmandoDeshacer] = React.useState(false);
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

      <Checkbox
        checked={estado === "Pagado"}
        onChange={(marcado) => {
          if (marcado) onMarcarPagado();
        }}
        disabled={estado === "Pagado" || sinMes || guardando || falta === null}
        label={
          estado === "Pagado"
            ? "Pagado"
            : falta
              ? `Pagado (pagó todo lo que falta: ${falta})`
              : "Pagado"
        }
      />

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
        {estado !== "No pagado" ? (
          <Pressable
            onPress={() => {
              if (!confirmandoDeshacer) {
                setConfirmandoDeshacer(true);
                return;
              }
              setConfirmandoDeshacer(false);
              onDeshacerPago();
            }}
            disabled={sinMes || guardando || deshaciendo}
            accessibilityRole="button"
            accessibilityState={{ busy: deshaciendo, disabled: sinMes || guardando || deshaciendo }}
            aria-busy={deshaciendo}
            accessibilityLabel={
              confirmandoDeshacer
                ? `Confirmar: deshacer el pago de ${codigo}`
                : `Deshacer el pago de ${codigo}`
            }
            className={`flex-row items-center gap-1.5 rounded-full border px-2.5 py-1 active:opacity-70 ${confirmandoDeshacer ? "border-red-300 bg-red-50" : "border-gray-200"}`}
            style={{ opacity: sinMes || guardando || deshaciendo ? 0.5 : 1 }}
          >
            {/* Mientras se deshace, gira: antes solo se apagaba (13/11/2026). */}
            {deshaciendo ? <Cargando variante="control" texto="deshaciendo el pago" /> : null}
            <Text className={`text-xs ${confirmandoDeshacer ? "font-semibold text-red-700" : "text-gray-600"}`}>
              {confirmandoDeshacer ? "Confirmar: volver a «No pagado»" : "Deshacer pago"}
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

      {comiteCargando ? (
        <View
          className="items-center py-1"
          accessibilityRole="progressbar"
          aria-busy
          role="status"
          accessibilityLabel="Cargando el comité"
        >
          <Bloque ancho="60%" alto={22} redondo={11} />
        </View>
      ) : propietarioConCuenta ? (
        <Pressable
          disabled={cambiandoComite}
          onPress={() => onComite(!enComite)}
          accessibilityRole="button"
          accessibilityState={{ busy: cambiandoComite, disabled: cambiandoComite }}
          aria-busy={cambiandoComite}
          className="w-full flex-row items-center justify-center gap-1.5 self-start rounded-full border border-gray-200 px-2.5 py-1 active:opacity-70"
          style={{ opacity: cambiandoComite ? 0.5 : 1 }}
        >
          {cambiandoComite ? <Cargando variante="control" texto="el comité" /> : null}
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
