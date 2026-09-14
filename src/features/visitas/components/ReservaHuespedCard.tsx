import React from "react";
import { Image, Pressable, Text, View } from "react-native";
import type { VisitaItem } from "@/shared/types";
import { TimelineReservaHuespedes } from "./TimelineReservaHuespedes";
import { TIPO_LABELS } from "@/data";
import { TIPO_VISITA_ASSETS } from "./tipoVisitaAssets";
import {
  normalizarTimelineInvitados,
  obtenerColorReserva,
  obtenerEstadoCheckin,
} from "../helpers/visitas.helpers";

interface ReservaHuespedCardProps {
  item: VisitaItem;
  onPress: () => void;
  onMenuPress: () => void;
  showParkingAction?: boolean;
  onParkingPress?: () => void;
  showDepartment?: boolean;
  assignedParking?: string;
  isGuardia?: boolean;
  showMenu?: boolean;
}

export function ReservaHuespedCard({
  item,
  onPress,
  onMenuPress,
  showParkingAction = false,
  onParkingPress,
  showDepartment = false,
  assignedParking,
  isGuardia = false,
  showMenu = true,
}: ReservaHuespedCardProps) {
  const dateStatus = obtenerEstadoCheckin(item.fechaDesde, item.fechaHasta);
  const timelineGuests = normalizarTimelineInvitados(item);

  return (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-2xl overflow-hidden"
      style={{
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        borderLeftWidth: 4,
        borderLeftColor: isGuardia
          ? "#EF4444"
          : obtenerColorReserva(item.fechaDesde, item.fechaHasta),
      }}
    >
      <View className="p-3.5 gap-1.5">
        <View className="flex-row items-start justify-between">
          <View className="flex-row items-center gap-2.5 flex-1">
            <Image
              source={TIPO_VISITA_ASSETS["huesped-temporal"]}
              style={{ width: 44, height: 44, borderRadius: 9999 }}
              resizeMode="cover"
            />
            <View className="flex-1">
              <Text className="text-base font-bold text-gray-900" numberOfLines={1}>
                Reserva de {item.nombre}
              </Text>
              <Text className="text-sm text-gray-500" numberOfLines={1}>
                {showDepartment && item.torre && item.depto
                  ? `${item.torre} - ${item.depto} · ${TIPO_LABELS[item.tipo]}`
                  : TIPO_LABELS[item.tipo]}
              </Text>
            </View>
          </View>
          {showParkingAction && (
            <Pressable onPress={onParkingPress} className="p-1.5">
              <Text style={{ fontSize: 16 }}>🅿️</Text>
            </Pressable>
          )}
          {showMenu && (
            <Pressable onPress={onMenuPress} className="p-1">
              <Text style={{ fontSize: 20, color: "#6B7280" }}>⋮</Text>
            </Pressable>
          )}
        </View>

        <View className="flex-row flex-wrap items-center gap-2 mt-0.5">
          <MetaText
            value={`${item.fechaDesde || ""}${item.fechaHasta ? ` a ${item.fechaHasta}` : ""}`}
          />
          <MetaText value={`👤 ${item.invitados.length}`} />
          {item.vehiculos.length > 0 && (
            <MetaText value={`🚗 ${item.vehiculos.length}`} />
          )}
          {assignedParking && <MetaText value={`🅿️ ${assignedParking}`} />}
        </View>

        {dateStatus && (
          <View
            className="mt-2 py-1.5 px-2.5 rounded-full"
            style={{ backgroundColor: dateStatus.background }}
          >
            <Text
              className="text-xs font-semibold text-center"
              style={{ color: dateStatus.color }}
            >
              {dateStatus.label}
            </Text>
          </View>
        )}

        {timelineGuests.length > 0 && (
          <View
            className="mt-2 pt-2.5"
            style={{ borderTopWidth: 1, borderTopColor: "#F3F4F6" }}
          >
            <TimelineReservaHuespedes invitados={timelineGuests} />
          </View>
        )}
      </View>
    </Pressable>
  );
}

function MetaText({ value }: { value: string }) {
  return <Text className="text-xs text-gray-500">{value}</Text>;
}
