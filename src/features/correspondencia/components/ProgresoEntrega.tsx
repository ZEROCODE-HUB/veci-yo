import React from "react";
import { View, Text } from "react-native";
import { textoPaso } from "../helpers/correspondencia.helpers";
import type { CorrespondenciaItem } from "@/shared/types";

interface ProgresoEntregaProps {
  item: CorrespondenciaItem;
}

export function ProgresoEntrega({ item }: ProgresoEntregaProps) {
  const registro = item.fechaRegistro
    ? {
        fecha: item.fechaRegistro,
        hora: item.horaRegistro,
        por: item.registradoPor,
      }
    : undefined;
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
  const pasos = [
    { tipo: "registro", datos: registro },
    { tipo: "recibido", datos: recibido },
    { tipo: "entregado", datos: entregado },
  ];

  return (
    <View className="gap-2">
      {pasos.map((p, i) => {
        const pendiente = !p.datos || !p.datos.fecha;
        return (
          <View key={i} className="flex-row items-center gap-2">
            <Text style={{ fontSize: 15 }}>{pendiente ? "⏳" : "✅"}</Text>
            <Text
              className="text-xs"
              style={{ color: pendiente ? "#9CA3AF" : "#111827" }}
            >
              {textoPaso(p.tipo, p.datos)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
