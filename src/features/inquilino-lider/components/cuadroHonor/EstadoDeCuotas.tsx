import React from "react";
import { Text, View } from "react-native";
import { theme } from "@/config";
import { formatDateIso, formatMoney } from "@/shared/utils";
import type {
  MiCuota,
  UnidadConCuota,
  VisibilidadCuotas,
} from "../../services/cuadroHonor.repo";

/**
 * Debajo del carrusel: la cuota propia y lo que el edificio publica
 * (15/10/2026, hueco 13).
 *
 * La maqueta pone aquí «pagaron / no pagaron». Se cuenta y se nombra solo
 * hasta donde la administración decidió publicar: con «solo el porcentaje» no
 * sale ninguna lista --ya lo dice el carrusel--; con «quién está al día», los
 * que pagaron; con «quién debe», las dos. Esa decisión ya la cumplía la base
 * (`detalle_cuotas`), pero ninguna pantalla la pedía.
 */
export function EstadoDeCuotas({
  miCuota,
  detalle,
  visibilidad,
  esAdmin,
}: {
  miCuota: MiCuota | null;
  detalle: UnidadConCuota[];
  visibilidad: VisibilidadCuotas;
  esAdmin: boolean;
}) {
  const alDia = detalle.filter((u) => u.pagado);
  const pendientes = detalle.filter((u) => !u.pagado);
  const mostrarPendientes = esAdmin || visibilidad === "quien_debe";
  const mostrarAlDia = esAdmin || visibilidad !== "porcentaje";

  if (!miCuota && !mostrarAlDia) return null;

  return (
    <View className="bg-white rounded-xl p-4 gap-3" style={{ boxShadow: theme.shadows.card }}>
      {miCuota ? (
        <View className="gap-1">
          <Text className="text-xs text-gray-500">Tu cuota de {miCuota.mes}</Text>
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-bold text-gray-900">
              {formatMoney(miCuota.monto, miCuota.moneda)}
            </Text>
            <View
              className="px-2.5 py-0.5 rounded-full"
              style={{ backgroundColor: miCuota.pagado ? theme.colors.successLight : theme.colors.warningLight }}
            >
              <Text
                className="text-xs font-semibold"
                style={{ color: miCuota.pagado ? theme.colors.success : theme.colors.iconAmberDark }}
              >
                {miCuota.pagado ? "Pagada" : "Pendiente"}
              </Text>
            </View>
          </View>
          {!miCuota.pagado && miCuota.venceEn ? (
            <Text className="text-xs text-gray-500">Vence el {formatDateIso(miCuota.venceEn)}</Text>
          ) : null}
        </View>
      ) : null}

      {mostrarAlDia ? (
        <View className="gap-1.5">
          <Text className="text-sm font-semibold text-gray-900">Al día ({alDia.length})</Text>
          <Text className="text-xs text-gray-600">
            {alDia.length ? alDia.map(etiqueta).join(" · ") : "Todavía nadie."}
          </Text>
        </View>
      ) : null}

      {mostrarPendientes ? (
        <View className="gap-1.5">
          <Text className="text-sm font-semibold text-gray-900">Pendientes ({pendientes.length})</Text>
          <Text className="text-xs text-gray-600">
            {pendientes.length ? pendientes.map(etiqueta).join(" · ") : "Ninguna."}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const etiqueta = (u: UnidadConCuota) =>
  [u.codigo, u.responsable].filter(Boolean).join(" ");
