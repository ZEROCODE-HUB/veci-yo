import React, { useMemo, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { SvgUri } from "react-native-svg";
import { useAuthStore } from "@/stores";
import { zonasComunes } from "@/data";
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
  const usuario = useAuthStore((state) => state.usuario);
  const { reservas } = useZonas();
  if (rol === "guardia" || rol === "administrador") return null;

  const propias = useMemo(
    () =>
      reservas
        .filter(
          (reserva) =>
            (reserva.esMia ||
              (usuario?.nombre &&
                reserva.nombre
                  .toLowerCase()
                  .includes(usuario.nombre.toLowerCase()))) &&
            !["Cancelado", "Rechazado"].includes(reserva.estado),
        )
        .sort((a, b) =>
          String(a.fecha || "").localeCompare(String(b.fecha || "")),
        ),
    [reservas, usuario?.nombre],
  );

  if (hideIfEmpty && propias.length === 0) return null;

  return (
    <View
      className="bg-white rounded-2xl p-4 gap-2.5"
      style={{
        elevation: 3,
        shadowColor: "#000",
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
            style={{ backgroundColor: "#F5B800" }}
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
            const zona = zonasComunes.find(
              (item) => item.id === reserva.zonaId,
            );
            return (
              <View
                key={reserva.id}
                className="flex-row items-center gap-3 py-2.5 border-t border-gray-100"
              >
                <View className="h-10 w-10 items-center justify-center overflow-hidden rounded-full">
                  {icons[reserva.zonaId] ? (
                    <SvgUri
                      uri={Image.resolveAssetSource(icons[reserva.zonaId]).uri}
                      width={40}
                      height={40}
                    />
                  ) : (
                    <Text className="text-2xl">{zona?.emoji}</Text>
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-gray-900">
                    {zona?.nombre}
                  </Text>
                  <Text className="text-xs text-gray-500">
                    {reserva.horario}
                  </Text>
                </View>
                <View className="items-end gap-1">
                  <Text
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      color:
                        reserva.estado === "Aprobado" ? "#16A34A" : "#2563EB",
                      backgroundColor:
                        reserva.estado === "Aprobado" ? "#DCFCE7" : "#DBEAFE",
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
