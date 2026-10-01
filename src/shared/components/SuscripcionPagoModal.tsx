import { Text, View } from "react-native";
import { theme } from "@/config";
import { formatMoney } from "@/shared/utils";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";

/**
 * La suscripción a Huéspedes Temporales.
 *
 * Tenía un formulario de tarjeta —titular, número, vencimiento, CVV— dentro de
 * la aplicación, y el importe escrito a mano: `$15.00`, sin decir en qué
 * moneda, en un producto que opera en Colombia y en Perú.
 *
 * Las dos cosas estaban decididas y al revés:
 *
 *   * El KT del 17/07/2026 dice `[DECIDIDO]` que **el cobro se hace fuera de
 *     la app (web), no in-app**, para evitar la comisión del 15% que Apple y
 *     Google cobran sobre las compras in-app de productos digitales. Un
 *     formulario de tarjeta dentro de la app es justo lo que esa decisión
 *     descarta.
 *   * El precio vive ahora en `precio_plan`, con un importe por país y su
 *     moneda ISO.
 *
 * Todavía **no hay pasarela contratada**. Mientras no la haya, la pantalla
 * ofrece el paso simulado, etiquetado como tal, para poder recorrer el flujo
 * en pruebas; en cuanto exista, se define `EXPO_PUBLIC_URL_PAGO_SUSCRIPCION` y
 * este modal manda a la web sin tocar código.
 */
export interface PrecioSuscripcion {
  monto: number;
  moneda: string;
  periodicidad: "mensual" | "anual";
}

export function SuscripcionPagoModal({
  visible,
  precio,
  pagoSimulado,
  procesando,
  onIrAlPago,
  onConfirmarSimulado,
  onClose,
}: {
  visible: boolean;
  /** Nulo mientras se consulta, o si el plan no tiene precio para este país. */
  precio: PrecioSuscripcion | null;
  /** No hay pasarela configurada: se ofrece el paso de pruebas. */
  pagoSimulado: boolean;
  procesando: boolean;
  onIrAlPago: () => void;
  onConfirmarSimulado: () => void;
  onClose: () => void;
}) {
  const porPeriodo = precio?.periodicidad === "anual" ? "por año" : "por mes";

  return (
    <Modal
      visible={visible}
      onClose={() => {
        if (!procesando) onClose();
      }}
      title="Suscripción a Huéspedes Temporales"
    >
      <View className="flex-col gap-4 py-1">
        <View
          className="items-center py-3"
          style={{
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.borderLight,
          }}
        >
          <Text className="text-xl font-bold text-gray-900 text-center">
            {precio ? formatMoney(precio.monto, precio.moneda) : "—"}
          </Text>
          <Text
            className="text-sm text-center"
            style={{ color: theme.colors.textSecondary }}
          >
            {precio ? porPeriodo : "Consultando el precio…"}
          </Text>
        </View>

        {pagoSimulado ? (
          <>
            <View
              className="rounded-xl p-3"
              style={{ backgroundColor: theme.colors.warningSoft }}
            >
              <Text
                className="text-xs"
                style={{
                  color: theme.colors.badgeAmberText,
                  lineHeight: 18,
                }}
              >
                Modo de pruebas: todavía no hay pasarela de pago conectada. Al
                continuar se activa la suscripción sin cobrar nada y sin
                registrar ninguna referencia de pago.
              </Text>
            </View>
            <Button
              variant="primary"
              disabled={procesando || !precio}
              onPress={onConfirmarSimulado}
            >
              {procesando ? "Activando…" : "Activar sin cobro (pruebas)"}
            </Button>
          </>
        ) : (
          <>
            <Text
              className="text-sm text-center"
              style={{ color: theme.colors.textSecondary, lineHeight: 20 }}
            >
              El pago se completa en la web. Al terminar, vuelve a la aplicación
              y la suscripción quedará activa.
            </Text>
            <Button variant="primary" disabled={procesando} onPress={onIrAlPago}>
              Ir al pago
            </Button>
          </>
        )}
      </View>
    </Modal>
  );
}
