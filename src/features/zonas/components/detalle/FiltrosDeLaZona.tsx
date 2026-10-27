import React from "react";
import { Pressable, Text, View } from "react-native";
import { theme } from "@/config";
import { StatusTabs } from "@/shared/components";
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
export function FiltrosDeLaZona({ zona: z, dias }: { zona: DetalleDeZona; dias: number }) {
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
      {z.esGuardiaAdmin && (
        <View className="flex-row items-center gap-2">
          {(["desde", "hasta"] as const).map((extremo) => {
            const fecha = extremo === "desde" ? z.fechaDesde : z.fechaHasta;
            return (
              <Pressable
                key={extremo}
                onPress={() => {
                  z.setDatePicker(extremo);
                  z.setDayFilter(null);
                }}
                className="flex-1 rounded-xl px-3 py-2 border border-gray-200"
              >
                <Text className="text-[11px] text-gray-500">
                  {extremo === "desde" ? "Desde" : "Hasta"}
                </Text>
                <Text className="text-sm text-gray-900">
                  {fecha ? formatDate(fecha) : "Seleccionar fecha"}
                </Text>
              </Pressable>
            );
          })}
          {(z.fechaDesde || z.fechaHasta) && (
            <Pressable
              onPress={() => {
                z.setFechaDesde(null);
                z.setFechaHasta(null);
                z.setDayFilter("hoy");
              }}
            >
              <Text className="text-xs text-gray-500 underline">Limpiar</Text>
            </Pressable>
          )}
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
              valor === "Todos" || !valor ? null : (valor as "Aprobado" | "Pendiente" | "Cancelado"),
            )
          }
          centered
          statusColors={{
            Todos: { bg: theme.colors.success, color: theme.colors.bgCard },
            Aprobado: { bg: theme.colors.secondary, color: theme.colors.bgCard },
            Pendiente: { bg: theme.colors.textMuted, color: theme.colors.bgCard },
            Cancelado: { bg: theme.colors.danger, color: theme.colors.bgCard },
          }}
        />
      )}
    </View>
  );
}
