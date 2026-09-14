import React from "react";
import { View, Text, Pressable, Image } from "react-native";
import type { VisitaItem } from "@/shared/types";
import { TIPO_VISITA_ASSETS } from "./tipoVisitaAssets";
import {
  authorizationLabel,
  isPastVisit,
  peopleWithHours,
  visitTypeLabel,
} from "../helpers/visitas.helpers";
import { TimelineReservaHuespedes } from "./TimelineReservaHuespedes";

interface VisitaCardProps {
  item: VisitaItem;
  onPress: () => void;
  onMenuPress: () => void;
  showParkingAction?: boolean;
  onParkingPress?: () => void;
  showHuespedDetails?: boolean;
  showDepartment?: boolean;
  assignedParking?: string;
}

function esPasada(fechaStr?: string): boolean {
  return isPastVisit(fechaStr);
}

function textoFechaChip(item: VisitaItem): string {
  const pasada = esPasada(item.fechaHasta || item.fechaDesde);
  const personas = personasConHoras(item);
  if (pasada) {
    const conHora = personas.find((p) => p.horaIngreso);
    if (conHora && item.fechaDesde)
      return `Ingresó el ${item.fechaDesde} a las ${conHora.horaIngreso}`;
    return item.fechaDesde ? `Visitó el ${item.fechaDesde}` : "";
  }
  return `${item.fechaDesde || ""}${item.fechaHasta ? ` a ${item.fechaHasta}` : ""}`;
}

function textoAutorizo(item: VisitaItem): string | null {
  if (item.autorizadoPor) {
    if (item.autorizadoPorRol === "guardia")
      return `Autorizado por guardia de seguridad ${item.autorizadoPor}`;
    if (item.autorizadoPorRol === "administrador")
      return `Autorizado por administrador ${item.autorizadoPor}`;
    return `Autorizado por ${item.autorizadoPor}`;
  }
  if (item.registradoPor) return `Registrado por ${item.registradoPor}`;
  return null;
}

function personasConHoras(
  item: VisitaItem,
): Array<{ nombre?: string; horaIngreso?: string; horaSalida?: string }> {
  if (item.invitados && item.invitados.length > 0) {
    return item.invitados.filter((inv) => inv.horaIngreso || inv.horaSalida);
  }
  if (item.horaIngreso || item.horaSalida) {
    return [
      {
        nombre: item.nombre,
        horaIngreso: item.horaIngreso,
        horaSalida: item.horaSalida,
      },
    ];
  }
  return [];
}

function colorReserva(item: VisitaItem): string {
  const dias = diasRestantes(item.fechaDesde);
  const diasOut = item.fechaHasta ? diasRestantes(item.fechaHasta) : Infinity;
  if (dias > 0) return dias <= 3 ? "#EF4444" : "#2563EB";
  if (diasOut < 0) return "#6B7280";
  return "#2563EB";
}

function diasRestantes(fechaStr?: string): number {
  if (!fechaStr) return 999;
  const parts = fechaStr.split("/");
  if (parts.length !== 3) return 999;
  const target = new Date(
    Number(parts[2]),
    Number(parts[1]) - 1,
    Number(parts[0]),
  );
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
}

function textoDiasParaCheckin(
  fechaDesde?: string,
  fechaHasta?: string,
): string | null {
  if (!fechaDesde) return null;
  const d = diasRestantes(fechaDesde);
  const dOut = fechaHasta ? diasRestantes(fechaHasta) : Infinity;
  if (d > 0)
    return d === 1 ? "Check-in mañana" : `Faltan ${d} días para check-in`;
  if (d === 0) return "Hoy es check-in";
  if (dOut >= 0) return `Check-in fue hace ${Math.abs(d)} días`;
  return null;
}

function colorDiasCheckin(
  fechaDesde?: string,
  fechaHasta?: string,
): { color: string; bg: string } {
  const d = diasRestantes(fechaDesde);
  const dOut = fechaHasta ? diasRestantes(fechaHasta) : Infinity;
  if (d > 0)
    return d <= 3
      ? { color: "#EF4444", bg: "#FEE2E2" }
      : { color: "#2563EB", bg: "#EFF6FF" };
  if (dOut < 0) return { color: "#6B7280", bg: "#F9FAFB" };
  return { color: "#2563EB", bg: "#EFF6FF" };
}

export function VisitaCard({
  item,
  onPress,
  onMenuPress,
  showParkingAction = false,
  onParkingPress,
  showHuespedDetails = false,
  showDepartment = true,
  assignedParking,
}: VisitaCardProps) {
  const tipoLabel = visitTypeLabel(item.tipo);
  const tipoIcon = TIPO_VISITA_ASSETS[item.tipo] || TIPO_VISITA_ASSETS.amigos;
  const esHT = item.tipo === "huesped-temporal";

  const diasCheckin = textoDiasParaCheckin(item.fechaDesde, item.fechaHasta);
  const colorCheckin = colorDiasCheckin(item.fechaDesde, item.fechaHasta);
  const autorizo = authorizationLabel(item);
  const conHoras = peopleWithHours(item);

  return (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-2xl overflow-hidden"
      style={{
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        borderLeftWidth: esHT ? 4 : 0,
        borderLeftColor: esHT ? colorReserva(item) : "transparent",
      }}
    >
      <View className="p-3.5 gap-1.5">
        {/* Header */}
        <View className="flex-row items-start justify-between">
          <View
            className="flex-row items-center gap-2.5 flex-1"
            style={{ minWidth: 0 }}
          >
            <View
              className="w-11 h-11 rounded-full items-center justify-center"
              style={{ backgroundColor: "#F3F4F6" }}
            >
              <Image
                source={tipoIcon}
                style={{ width: 44, height: 44, borderRadius: 9999 }}
                resizeMode="cover"
              />
            </View>
            <View className="flex-1" style={{ minWidth: 0 }}>
              <Text
                className="text-base font-bold text-gray-900"
                numberOfLines={1}
              >
                {esHT
                  ? `Reserva de ${item.nombre}`
                  : item.esEvento
                    ? item.nombreEvento || item.nombre
                    : item.nombre}
              </Text>
              <Text className="text-sm text-gray-500" numberOfLines={1}>
                {showDepartment && item.torre && item.depto
                  ? `${item.torre} - ${item.depto} · ${tipoLabel}`
                  : tipoLabel}
              </Text>
              {/* DNI for temporal */}
              {item.tipo === "temporal" && item.ci ? (
                <Text className="text-xs text-gray-500 mt-0.5">
                  DNI: {item.ci}
                </Text>
              ) : null}
              {/* Permanente info */}
              {item.tipo === "permanente" && (
                <Text className="text-xs text-gray-400 mt-0.5">
                  Registro permanente · {item.diasLaborales || "Lun – Vie"} ·
                  Vigencia: {item.fechaDesde}
                  {item.fechaHasta ? ` a ${item.fechaHasta}` : ""}
                </Text>
              )}
              {/* Profesion */}
              {(item.tipo === "temporal" || item.tipo === "permanente") &&
                item.profesion && (
                  <Text className="text-xs text-gray-500 mt-0.5">
                    Profesión: {item.profesion}
                    {item.profesionOtro ? ` (${item.profesionOtro})` : ""}
                  </Text>
                )}
            </View>
          </View>
          {showParkingAction && (
            <Pressable onPress={onParkingPress} className="p-1.5">
              <Text style={{ fontSize: 16 }}>🅿️</Text>
            </Pressable>
          )}
          <Pressable onPress={onMenuPress} className="p-1">
            <Text style={{ fontSize: 20, color: "#6B7280" }}>⋮</Text>
          </Pressable>
        </View>

        {esHT && showHuespedDetails ? (
          <View className="flex-row flex-wrap items-center gap-2 mt-0.5">
            <MetaChip
              label={`${item.fechaDesde || ""}${item.fechaHasta ? ` a ${item.fechaHasta}` : ""}`}
            />
            <MetaChip label={`👤 ${item.invitados?.length || 0}`} />
            {(item.vehiculos?.length || 0) > 0 && (
              <MetaChip label={`🚗 ${item.vehiculos.length}`} />
            )}
            {assignedParking && <MetaChip label={`🅿️ ${assignedParking}`} />}
          </View>
        ) : (
          <View className="flex-row flex-wrap gap-1.5 mt-2">
            {item.tipoNotificacion && (
              <View
                className="rounded-full px-2 py-0.5"
                style={{ backgroundColor: "#F3F4F6" }}
              >
                <Text className="text-xs" style={{ color: "#6B7280" }}>
                  🔔{" "}
                  {item.tipoNotificacion === "notificar-y-anunciar"
                    ? "Notificar y anunciar"
                    : "Notificar"}
                </Text>
              </View>
            )}
            {item.tieneVehiculo && (
              <View
                className="rounded-full px-2 py-0.5"
                style={{ backgroundColor: "#F3F4F6" }}
              >
                <Text className="text-xs" style={{ color: "#6B7280" }}>
                  🚗{" "}
                  {item.vehiculos?.length > 0
                    ? item.vehiculos
                        .map((v) => v.placa)
                        .filter(Boolean)
                        .join(", ")
                    : "Con vehículo"}
                </Text>
              </View>
            )}
            <View
              className="rounded-full px-2 py-0.5"
              style={{ backgroundColor: "#F3F4F6" }}
            >
              <Text className="text-xs" style={{ color: "#6B7280" }}>
                📅 {textoFechaChip(item)}
              </Text>
            </View>
          </View>
        )}

        {/* HT: days-to-checkin message */}
        {esHT && diasCheckin && (
          <View
            className="mt-2 py-1.5 px-2.5 rounded-full"
            style={{ backgroundColor: colorCheckin.bg }}
          >
            <Text
              className="text-xs font-semibold text-center"
              style={{ color: colorCheckin.color }}
            >
              {diasCheckin}
            </Text>
          </View>
        )}

        {/* HT: timeline dots */}
        {esHT && item.invitados && item.invitados.length > 0 && (
          <View
            className="mt-2 pt-2.5"
            style={{ borderTopWidth: 1, borderTopColor: "#F3F4F6" }}
          >
            {showHuespedDetails ? (
              <TimelineReservaHuespedes
                invitados={item.invitados.map((guest) => ({
                  ...guest,
                  timeline: guest.timeline
                    ? (Object.fromEntries(
                        Object.entries(guest.timeline).filter(
                          ([, value]) => value !== null,
                        ),
                      ) as Record<string, string | boolean>)
                    : undefined,
                }))}
              />
            ) : (
              <TimelineDotRow item={item} />
            )}
          </View>
        )}

        {!esHT && (autorizo || conHoras.length > 0) && (
          <View
            className="mt-2 pt-2.5"
            style={{ borderTopWidth: 1, borderTopColor: "#F3F4F6", gap: 4 }}
          >
            {autorizo ? (
              <Text
                className="text-xs"
                style={{ color: "#111827", fontWeight: "600" }}
              >
                🛡️ {autorizo}
              </Text>
            ) : null}
            {conHoras.map((inv, i) => (
              <View key={i} className="flex-row flex-wrap items-start gap-1">
                <Text className="text-xs text-gray-500">🕐</Text>
                {inv.horaIngreso ? (
                  <Text className="text-xs text-gray-500">
                    {esPasada(item.fechaHasta || item.fechaDesde)
                      ? "Ingresó"
                      : "Ingreso"}{" "}
                    {inv.nombre && (item.invitados?.length || 0) > 1
                      ? `${inv.nombre}: `
                      : ""}
                    el {item.fechaDesde} a las {inv.horaIngreso}
                  </Text>
                ) : null}
                {inv.horaSalida ? (
                  <View className="rounded-full bg-amber-100 px-1.5 py-0.5">
                    <Text className="text-xs font-semibold text-amber-800">
                      · Salida el {item.fechaHasta || item.fechaDesde} a las{" "}
                      {inv.horaSalida}
                    </Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <View className="hidden">
          {null}
          <Text className="text-xs text-gray-400">
            👤 {item.invitados?.length || item.personas || 0}
            {(item.vehiculos?.length || 0) > 0
              ? ` · 🚗 ${item.vehiculos.length}`
              : ""}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function MetaChip({ label }: { label: string }) {
  return <Text className="text-xs text-gray-500">{label}</Text>;
}

function TimelineDotRow({ item }: { item: VisitaItem }) {
  const steps = [
    "preregistroEnviado",
    "documentacionCompleta",
    "terminosAceptados",
    "verificacionPasada",
    "trasideEntrada",
    "trasideSalida",
  ];

  return (
    <View className="gap-1.5">
      {item.invitados.slice(0, 3).map((inv, i) => (
        <View key={i} className="flex-row items-center gap-1.5">
          <Text className="text-xs text-gray-500 w-20" numberOfLines={1}>
            {inv.nombre}
          </Text>
          <View className="flex-row items-center flex-1 gap-0">
            {steps.map((step, si) => {
              const t = inv.timeline || {};
              const done =
                step === "verificacionPasada"
                  ? t.verificacionAprobada === true || !!t[step]
                  : !!t[step];
              const isLast = si === steps.length - 1;
              return (
                <View key={step} className="flex-row items-center flex-1">
                  <View
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: done ? "#16A34A" : "#D1D5DB" }}
                  />
                  {!isLast && (
                    <View
                      className="flex-1 h-0.5"
                      style={{ backgroundColor: done ? "#16A34A" : "#E5E7EB" }}
                    />
                  )}
                </View>
              );
            })}
          </View>
        </View>
      ))}
      {item.invitados.length > 3 && (
        <Text className="text-xs text-gray-400">
          +{item.invitados.length - 3} más
        </Text>
      )}
    </View>
  );
}
