import React from "react";
import { Image, Text, View } from "react-native";
import { Button } from "@/shared/components";
import { TimelineReservaHuespedes } from "./TimelineReservaHuespedes";
import type { VisitaItem } from "@/shared/types";
import { isPastVisit } from "../utils";
import { TIPO_VISITA_ASSETS } from "./tipoVisitaAssets";

interface VisitaDetailModalProps {
  item: VisitaItem;
  personIndex?: number | null;
  showAssignParking?: boolean;
  onAssignParking?: () => void;
  assignedSpots?: string[];
}

export function VisitaDetailModal({
  item,
  personIndex = null,
  showAssignParking = false,
  onAssignParking,
  assignedSpots = [],
}: VisitaDetailModalProps) {
  const esHT = item.tipo === "huesped-temporal";
  const selectedPerson =
    personIndex === -1
      ? {
          nombre: item.nombre,
          ci: item.ci,
          horaIngreso: item.horaIngreso,
          horaSalida: item.horaSalida,
        }
      : personIndex !== null && personIndex !== undefined
        ? item.invitados?.[personIndex]
        : undefined;
  const title = selectedPerson?.nombre || item.nombre;
  const spots = assignedSpots.length;
  const totalSpots = Math.max(item.estacionamientosAsignados || 0, spots);
  const people = selectedPerson
    ? [selectedPerson]
    : item.invitados?.length
      ? item.invitados
      : [
          {
            nombre: item.nombre,
            horaIngreso: item.horaIngreso,
            horaSalida: item.horaSalida,
          },
        ];

  return (
    <View className="gap-4">
      <View className="flex-row items-center gap-2.5">
        <Image
          source={TIPO_VISITA_ASSETS[item.tipo]}
          className="h-10 w-10 rounded-full"
          resizeMode="cover"
        />
        <View className="flex-1">
          <Text className="text-base font-bold text-gray-900">{title}</Text>
          <Text className="text-sm text-gray-500">
            {item.torre} - {item.depto}
          </Text>
        </View>
      </View>

      {!esHT && (
        <View className="rounded-xl bg-gray-50 p-3 gap-2">
          <Text className="text-sm font-semibold text-gray-900">
            Datos de la visita
          </Text>
          {item.profesion && (
            <Text className="text-xs text-gray-500">
              Profesión: {item.profesion}
              {item.profesionOtro ? ` (${item.profesionOtro})` : ""}
            </Text>
          )}
          {item.ci && (
            <Text className="text-xs text-gray-500">
              Identificación: {item.ci}
            </Text>
          )}
          {(item.autorizadoPor || item.registradoPor) && (
            <View className="rounded-lg bg-blue-50 p-2">
              <Text className="text-xs font-semibold text-gray-900">
                🛡️{" "}
                {item.autorizadoPor
                  ? `Autorizado por: ${item.autorizadoPor}${item.autorizadoPorRol ? ` (${item.autorizadoPorRol})` : ""}`
                  : `Registrado por: ${item.registradoPor}`}
              </Text>
            </View>
          )}
          {item.anotacionesIngreso && (
            <Text className="text-xs text-gray-500">
              <Text className="font-semibold">Anotaciones ingreso:</Text>{" "}
              {item.anotacionesIngreso}
            </Text>
          )}
          {item.anotacionesSalida && (
            <Text className="text-xs text-gray-500">
              <Text className="font-semibold">Anotaciones salida:</Text>{" "}
              {item.anotacionesSalida}
            </Text>
          )}
          {item.fotosIngreso?.length || item.fotosSalida?.length ? (
            <View className="gap-1">
              <Text className="text-xs font-semibold text-gray-500">
                📷 Fotos de ingreso / salida
              </Text>
              <View className="flex-row flex-wrap gap-1.5">
                {[
                  ...(item.fotosIngreso || []),
                  ...(item.fotosSalida || []),
                ].map((photo, index) => (
                  <Image
                    key={`${photo}-${index}`}
                    source={{ uri: photo }}
                    className="h-14 w-14 rounded-lg border border-gray-200"
                    resizeMode="cover"
                  />
                ))}
              </View>
            </View>
          ) : null}
        </View>
      )}

      {totalSpots > 0 && (
        <View className="rounded-xl bg-gray-50 p-3 gap-2">
          <Text className="text-sm font-semibold text-gray-900">
            🚗 Estacionamientos asignados: {totalSpots}
          </Text>
          {spots > 0 && (
            <View className="flex-row flex-wrap gap-1.5">
              {assignedSpots.map((spot) => (
                <View key={spot} className="rounded-full bg-green-50 px-2 py-1">
                  <Text className="text-[10px] font-semibold text-green-700">
                    🅿️ {spot}
                  </Text>
                </View>
              ))}
            </View>
          )}
          {item.vehiculos?.map((vehicle, index) => (
            <Text key={index} className="text-xs text-gray-500">
              🅿️ Vehículo {index + 1}:{" "}
              <Text className="font-medium text-gray-900">
                {vehicle.placa || "Sin placa"}
              </Text>
            </Text>
          ))}
        </View>
      )}
      {showAssignParking && !esHT && (
        <Button
          variant="secondary"
          fullWidth
          onPress={onAssignParking || (() => {})}
        >
          🅿️ Asignar estacionamiento
        </Button>
      )}

      {!esHT && (
        <View className="gap-2.5">
          {item.tipo === "permanente" && (
            <View className="rounded-xl bg-gray-50 p-3 gap-1">
              <Text className="text-xs font-semibold text-gray-500">
                Registro permanente
              </Text>
              <Text className="text-sm text-gray-900">
                {item.diasLaborales || "Sin días laborales asignados"}
              </Text>
            </View>
          )}
          {people.map((person, index) => (
            <View
              key={`${person.nombre}-${index}`}
              className="rounded-xl bg-gray-50 p-3 gap-2"
            >
              <Text className="text-base font-semibold text-gray-900">
                {person.nombre}
              </Text>
              <Text className="text-xs text-gray-500">
                📅 {item.fechaDesde}
                {item.fechaHasta ? ` a ${item.fechaHasta}` : ""}
              </Text>
              <View className="flex-row flex-wrap gap-1.5">
                <View className="rounded-full bg-gray-100 px-2 py-0.5">
                  <Text className="text-[10px] text-gray-500">
                    🔔{" "}
                    {item.tipoNotificacion === "notificar-y-anunciar"
                      ? "Notificar y anunciar"
                      : "Notificar"}
                  </Text>
                </View>
                {item.tieneVehiculo && (
                  <View className="rounded-full bg-white px-2 py-0.5">
                    <Text className="text-[10px] text-gray-500">
                      🚗{" "}
                      {item.vehiculos?.length
                        ? item.vehiculos
                            .map((vehicle) => vehicle.placa)
                            .filter(Boolean)
                            .join(", ")
                        : "Con vehículo"}
                    </Text>
                  </View>
                )}
                {item.tipo === "temporal" && item.ci && (
                  <View className="rounded-full bg-white px-2 py-0.5">
                    <Text className="text-[10px] text-gray-500">
                      🆔 DNI: {item.ci}
                    </Text>
                  </View>
                )}
              </View>
              {item.tipo !== "permanente" && person.horaIngreso && (
                <View className="flex-row flex-wrap items-center gap-2.5">
                  <Text className="text-xs text-gray-500">
                    🕐{" "}
                    {isPastVisit(item.fechaHasta || item.fechaDesde)
                      ? "Ingresó"
                      : "Ingreso"}{" "}
                    el {item.fechaDesde} a las {person.horaIngreso}
                  </Text>
                  {person.horaSalida ? (
                    <View className="rounded-full bg-amber-100 px-1.5 py-0.5">
                      <Text className="text-xs text-amber-800">
                        ⚠ Salida el {item.fechaHasta || item.fechaDesde} a las{" "}
                        {person.horaSalida}
                      </Text>
                    </View>
                  ) : null}
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {esHT && item.invitados?.length > 0 && (
        <View className="gap-2">
          <Text className="text-base font-bold text-gray-900 underline">
            Huéspedes:
          </Text>
          {item.invitados.map((guest, index) => (
            <View key={index} className="rounded-xl bg-gray-50 p-3 gap-2">
              <Text className="text-sm font-semibold text-gray-900">
                {guest.nombre}
              </Text>
              <TimelineReservaHuespedes
                invitados={[
                  {
                    nombre: guest.nombre,
                    esMenor: guest.esMenor,
                    timeline: guest.timeline as
                      | Record<string, boolean | string>
                      | undefined,
                  },
                ]}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
