import { theme } from "@/config";
import React from "react";
import { View, Text } from "react-native";
import { textoPaso } from "../helpers/correspondencia.helpers";
import type { CorrespondenciaItem } from "@/shared/types";

interface ProgresoEntregaProps {
  item: CorrespondenciaItem;
}

/*
  Sin «Registrado» (Para Claude 197, 30/10/2026): decía lo mismo que
  «Recibido». Y con «Notificado» cuando la portería avisó por otro medio
  (Para Claude 198), que no cambia el estado.
*/
export function ProgresoEntrega({ item }: ProgresoEntregaProps) {
  const recibido = item.fechaRecibido
    ? {
        fecha: item.fechaRecibido,
        hora: item.horaRecibido,
        por: item.recibidoPor,
      }
    : undefined;
  const entregado = item.fechaEntregado
    ? {
        fecha: item.fechaEntregado,
        hora: item.horaEntregado,
        a: item.entregadoA,
      }
    : undefined;
  const notificado = item.fechaNotificado
    ? {
        fecha: item.fechaNotificado,
        hora: item.horaNotificado,
        por: item.notificadoPor,
      }
    : undefined;
  const pasos = [
    { tipo: "recibido", datos: recibido },
    ...(notificado ? [{ tipo: "notificado", datos: notificado }] : []),
    { tipo: "entregado", datos: entregado },
  ];

  return (
    <View className="gap-2">
      {pasos.map((p, i) => {
        const pendiente = !p.datos || !p.datos.fecha;
        return (
          <View key={i} className="flex-row items-start gap-2">
            <Text style={{ fontSize: 15 }}>{pendiente ? "⏳" : "✅"}</Text>
            {/* Sin `flex-1` el texto de una fila no se parte y en el telefono
                se salía de la tarjeta (Para Claude 122, 28/10/2026). */}
            <Text
              className="flex-1 text-xs"
              style={{ color: pendiente ? theme.colors.textMuted : theme.colors.text }}
            >
              {textoPaso(p.tipo, p.datos)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
