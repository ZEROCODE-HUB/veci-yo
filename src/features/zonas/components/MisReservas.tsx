import { theme } from "@/config";
import React, { useMemo, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { useAuthStore } from "@/stores";
import { zonaIcons2 } from "@/assets/icons/zonas";
import { useZonas } from "../hooks";

const icons = zonaIcons2 as Record<string, any>;

export function MisReservas({
  collapsible = false,
  hideIfEmpty = false,
}: {
  collapsible?: boolean;
  hideIfEmpty?: boolean;
}) {
  const [open, setOpen] = useState(!collapsible);
  const rol = useAuthStore((state) => state.rolActivo);
  const { reservas, zonasComunesConfig } = useZonas();
  if (rol === "guardia" || rol === "administrador") return null;

  const propias = useMemo(
    () =>
      reservas
        .filter(
          (reserva) =>
            reserva.esMia &&
            !["Cancelado", "Rechazado"].includes(reserva.estado),
        )
        // Por la fecha ISO: `fecha` esta en dd/MM/yyyy y ordenarla como texto
        // pondria el 15/11 antes que el 23/09.
        .sort((a, b) =>
          String(a.fechaIso || "").localeCompare(String(b.fechaIso || "")),
        ),
    [reservas],
  );

  if (hideIfEmpty && propias.length === 0) return null;

  return (
    <View
      className="bg-white rounded-2xl p-4 gap-2.5"
      style={{
        elevation: 3,
        shadowColor: theme.colors.shadow,
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      }}
    >
      <Pressable
        onPress={collapsible ? () => setOpen((value) => !value) : undefined}
        className="flex-row items-center justify-between"
      >
        <Text className="text-lg font-bold text-gray-900">Mis reservas</Text>
        <View className="flex-row items-center gap-2">
          <Text
            className="rounded-full px-2 py-0.5 text-xs font-bold text-white"
            style={{ backgroundColor: theme.colors.primary }}
          >
            {propias.length}
          </Text>
          {collapsible && (
            <Text className="text-gray-500">{open ? "▲" : "▼"}</Text>
          )}
        </View>
      </Pressable>
      {open &&
        (propias.length === 0 ? (
          <Text className="text-sm text-gray-500">
            No tienes reservas activas.
          </Text>
        ) : (
          propias.map((reserva) => {
            const zona = zonasComunesConfig[reserva.zonaId];
            return (
              <View
                key={reserva.id}
                className="flex-row items-center gap-3 py-2.5 border-t border-gray-100"
              >
                <View className="h-10 w-10 items-center justify-center overflow-hidden rounded-full">
                  {icons[reserva.zonaId] ? (
                    <Image
                      style={{ height: 40, width: 40 }}
                      source={icons[reserva.zonaId]}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text className="text-2xl">{zona?.emoji}</Text>
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-gray-900">
                    {zona?.nombre}
                  </Text>
                  {/*
                    Y que puesto toco. Aqui es donde se viene a mirarlo --es
                    «Mis reservas»-- y era justo donde no salia: la 102 tiene
                    tres reservas de lavanderia el mismo dia a la misma hora, y
                    sin el numero son tres renglones identicos.
                  */}
                  <Text className="text-xs text-gray-500">
                    {reserva.numeroRecurso
                      ? `${reserva.horario} · N°${reserva.numeroRecurso}`
                      : reserva.horario}
                  </Text>
                </View>
                <View className="items-end gap-1">
                  <Text
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      color:
                        reserva.estado === "Aprobado"
                          ? theme.colors.success
                          : theme.colors.secondary,
                      backgroundColor:
                        reserva.estado === "Aprobado"
                          ? theme.colors.successLight
                          : theme.colors.infoBg,
                    }}
                  >
                    {reserva.estado}
                  </Text>
                  <Text className="text-xs text-gray-500">
                    {reserva.fecha || "Sin fecha"}
                  </Text>
                </View>
              </View>
            );
          })
        ))}
    </View>
  );
}
