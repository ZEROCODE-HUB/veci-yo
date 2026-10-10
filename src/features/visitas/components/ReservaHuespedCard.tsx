import { theme } from "@/config";
import React from "react";
import { Image, Pressable, Text, View } from "react-native";
import type { VisitaItem } from "@/shared/types";
import { TimelineReservaHuespedes } from "./TimelineReservaHuespedes";
import { TIPO_LABELS } from "../constants";
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
        boxShadow: theme.shadows.card,
        borderLeftWidth: 4,
        borderLeftColor: isGuardia
          ? theme.colors.danger
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
              <Text
                className="text-base font-bold text-gray-900"
                numberOfLines={1}
              >
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
            <Pressable
              accessibilityLabel="Asignar estacionamiento"
              onPress={onParkingPress} className="p-1.5">
              <Text style={{ fontSize: 16 }}>🅿️</Text>
            </Pressable>
          )}
          {showMenu && (
            <Pressable
              accessibilityLabel="Opciones de esta reserva"
              onPress={onMenuPress} className="p-1">
              <Text style={{ fontSize: 20, color: theme.colors.textSecondary }}>
                ⋮
              </Text>
            </Pressable>
          )}
        </View>

        <View className="flex-row flex-wrap items-center gap-2 mt-0.5">
          <MetaText
            value={`${item.fechaDesde || ""}${item.fechaHasta ? ` a ${item.fechaHasta}` : ""}`}
          />
          {/*
            «1 de 2» cuando el anfitrion dijo cuantas vienen y todavia no
            estan todas. Decia solo `invitados.length`, que son las fichas que
            existen: una estancia nace con el titular y nada mas --los
            acompañantes los rellena el huesped desde su enlace-- asi que una
            reserva para dos personas se leia como «1 persona» y parecia que
            se habia perdido lo que el anfitrion configuro.
          */}
          <MetaText
            value={
              item.huespedesPrevistos &&
              item.huespedesPrevistos > item.invitados.length
                ? `👤 ${item.invitados.length} de ${item.huespedesPrevistos}`
                : `👤 ${item.invitados.length}`
            }
          />
          {/*
            Los menores que el anfitrion dijo que vienen. No se cuentan las
            fichas: la de un menor sin nombre no se crea --la rellena el
            huesped desde su enlace-- asi que contar daria cero justo cuando
            este aviso hace falta.
          */}
          {Boolean(item.menoresPrevistos) && (
            <MetaText value={`👶 ${item.menoresPrevistos}`} />
          )}
          {item.vehiculos.length > 0 && (
            <MetaText value={`🚗 ${item.vehiculos.length}`} />
          )}
          {Boolean(assignedParking) && <MetaText value={`🅿️ ${assignedParking}`} />}
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
            style={{
              borderTopWidth: 1,
              borderTopColor: theme.colors.borderLight,
            }}
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
