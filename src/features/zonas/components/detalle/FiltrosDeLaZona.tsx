import React from "react";
import { Pressable, Text, View } from "react-native";
import { theme } from "@/config";
import { Calendar, StatusTabs } from "@/shared/components";
import { formatDate } from "@/shared/utils";
import { comoFiltro } from "../../services/tiraDeDias";
import { TiraDeDias } from "../TiraDeDias";
import type { DetalleDeZona } from "./tipos";

/**
 * Qué día pinta la grilla, el rango de búsqueda de la portería y la
 * administración, y los estados que filtra la portería.
 *
 * Aqui habia una seccion «Lista de reservas · Buscar y filtrar» con un buscador
 * y seis chips de estado que **no filtraban nada**: alimentaban una lista que
 * la pantalla no pintaba. Lo vio el cliente, y pidió la tira de días directa.
 */
export function FiltrosDeLaZona({
  zona: z,
  dias,
}: {
  zona: DetalleDeZona;
  dias: number;
}) {
  return (
    <View
      className="bg-white rounded-2xl p-3 gap-2.5"
      style={{
        elevation: 3,
        shadowColor: theme.colors.shadow,
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      }}
    >
      <TiraDeDias
        seleccionado={z.diaDeLaGrilla}
        dias={dias}
        onSeleccionar={(dia) => {
          const filtro = comoFiltro(dia);
          z.setDayFilter(filtro.dayFilter);
          z.setSelectedDate(filtro.selectedDate);
          z.setFechaDesde(null);
          z.setFechaHasta(null);
        }}
      />
      {/*
        El rango es para **buscar** en la lista de todo el edificio, no para
        reservar. Un vecino solo ve sus propias reservas.
      */}
      {/*
        Un solo botón y un calendario pequeño en la misma tarjeta, que marca
        los dos extremos (hueco 40, 27/10/2026). Antes eran dos campos que
        abrían cada uno un calendario de pantalla completa.
      */}
      {z.esGuardiaAdmin && (
        <View className="gap-2">
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => {
                z.setDatePicker(z.datePicker ? null : "desde");
              }}
              accessibilityRole="button"
              aria-expanded={Boolean(z.datePicker)}
              accessibilityState={{ expanded: Boolean(z.datePicker) }}
              className="flex-1 rounded-xl px-3 py-2 border border-gray-200"
            >
              <Text className="text-[11px] text-gray-500">
                Buscar por fechas
              </Text>
              <Text className="text-sm text-gray-900">
                {z.fechaDesde
                  ? `${formatDate(z.fechaDesde)} – ${z.fechaHasta ? formatDate(z.fechaHasta) : "…"}`
                  : "Elegir desde y hasta"}
              </Text>
            </Pressable>
            {z.fechaDesde || z.fechaHasta ? (
              <Pressable
                onPress={() => {
                  z.setFechaDesde(null);
                  z.setFechaHasta(null);
                  z.setDatePicker(null);
                  z.setDayFilter("hoy");
                }}
              >
                <Text className="text-xs text-gray-500 underline">Limpiar</Text>
              </Pressable>
            ) : null}
          </View>
          {/* Pequeño de verdad: en una pantalla ancha no pasa del ancho de un teléfono. */}
          {z.datePicker ? (
            <View style={{ width: "100%", maxWidth: 340, alignSelf: "center" }}>
              <Calendar
                rango
                selected={z.fechaDesde}
                hasta={z.fechaHasta}
                onRango={(desde, hasta) => {
                  z.setDayFilter(null);
                  z.setFechaDesde(desde);
                  z.setFechaHasta(hasta);
                  if (hasta) z.setDatePicker(null);
                }}
              />
            </View>
          ) : null}
        </View>
      )}
      {/*
        Las pestañas de la portería en la maqueta. Las de un vecino --Reservado,
        Disponible, No disponible-- se quitaron porque no filtraban nada; estas
        sí: deciden qué reservas pinta la grilla.
      */}
      {z.esGuardia && (
        <StatusTabs
          tabs={[
            { value: "Todos", label: "Todos" },
            { value: "Aprobado", label: "Aprobada" },
            { value: "Pendiente", label: "Pendiente" },
            { value: "Cancelado", label: "Cancelada" },
          ]}
          active={z.filtroEstado ?? "Todos"}
          onChange={(valor) =>
            z.setFiltroEstado(
              valor === "Todos" || !valor
                ? null
                : (valor as "Aprobado" | "Pendiente" | "Cancelado"),
            )
          }
          centered
          statusColors={{
            Todos: { bg: theme.colors.success, color: theme.colors.bgCard },
            Aprobado: {
              bg: theme.colors.secondary,
              color: theme.colors.bgCard,
            },
            Pendiente: {
              bg: theme.colors.textMuted,
              color: theme.colors.bgCard,
            },
            Cancelado: { bg: theme.colors.danger, color: theme.colors.bgCard },
          }}
        />
      )}
    </View>
  );
}
