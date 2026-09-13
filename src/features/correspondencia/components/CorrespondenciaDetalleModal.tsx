import React from "react";
import { View, Text, Image } from "react-native";
import { getIcon } from "../helpers/correspondencia.helpers";
import { ProgresoEntrega } from "./ProgresoEntrega";
import { CorrespondenciaEstadoBadge } from "./CorrespondenciaEstadoBadge";
import type { CorrespondenciaItem } from "@/shared/types";

interface CorrespondenciaDetalleModalProps {
  item: CorrespondenciaItem;
}

export function CorrespondenciaDetalleModal({
  item,
}: CorrespondenciaDetalleModalProps) {
  return (
    <View className="gap-3.5">
      <View
        className="rounded-xl p-3.5 gap-1.5"
        style={{ borderWidth: 1.5, borderColor: "#F5B800" }}
      >
        <View className="flex-row items-center gap-1.5">
          <Text style={{ fontSize: 20 }}>{getIcon(item.empresa)}</Text>
          <Text className="text-base font-bold">{item.empresa}</Text>
        </View>
        <Text className="text-sm text-gray-500">Unidad: {item.unidad}</Text>
        {item.nombre ? (
          <Text className="text-sm text-gray-500">
            Destinatario: {item.nombre}
          </Text>
        ) : null}
        {item.ci ? (
          <Text className="text-sm text-gray-500">CI: {item.ci}</Text>
        ) : null}
        <Text className="text-sm text-gray-500">
          Categoría: {item.categoria}
        </Text>
        <Text className="text-sm text-gray-500">
          Logística: {item.logistica}
        </Text>
        {item.descripcion ? (
          <Text className="text-sm text-gray-500">
            Descripción: {item.descripcion}
          </Text>
        ) : null}
        <Text className="text-sm text-gray-500">
          Torre: {item.torre || "-"}
        </Text>
        <Text className="text-sm text-gray-500">Piso: {item.piso || "-"}</Text>
        <Text className="text-sm text-gray-500">
          Estado encomienda: {item.estadoEncomienda || "-"}
        </Text>
        <Text className="text-sm text-gray-500">
          Entrega en puerta: {item.entregaEnPuerta ? "Sí" : "No"}
        </Text>
        <View className="flex-row justify-between items-center mt-1">
          <CorrespondenciaEstadoBadge estado={item.estado} />
          <Text className="text-sm text-gray-500">{item.fecha}</Text>
        </View>
      </View>

      {/* Progreso de entrega */}
      <View
        className="rounded-xl p-3.5 gap-1.5"
        style={{ backgroundColor: "#F9FAFB" }}
      >
        <Text className="text-sm font-bold text-gray-900 mb-0.5">
          Progreso de entrega
        </Text>
        <ProgresoEntrega item={item} />
      </View>

      {/* Informe de recepción */}
      {item.informarInfo && (
        <View
          className="rounded-xl p-3.5 gap-2"
          style={{ backgroundColor: "#EFF6FF" }}
        >
          <Text className="text-sm font-bold" style={{ color: "#2563EB" }}>
            Informe de recepción
          </Text>
          {item.informarInfo.descripcion ? (
            <Text className="text-sm text-gray-900 leading-5">
              {item.informarInfo.descripcion}
            </Text>
          ) : null}
          {item.informarInfo.fechaReporte ? (
            <Text className="text-xs text-gray-500">
              Fecha del reporte: {item.informarInfo.fechaReporte}
            </Text>
          ) : null}
          {item.informarInfo.usuarioReporte ? (
            <Text className="text-xs text-gray-500">
              Registrado por: {item.informarInfo.usuarioReporte}
            </Text>
          ) : null}
          {item.informarInfo.fotos && item.informarInfo.fotos.length > 0 && (
            <View className="flex-row flex-wrap gap-2 mt-1">
              {item.informarInfo.fotos.map((foto: string, i: number) => (
                <View
                  key={i}
                  style={{ width: 64, height: 64, position: "relative" }}
                >
                  <Image
                    source={{ uri: foto }}
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                    }}
                    resizeMode="cover"
                  />
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}
