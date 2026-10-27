import React from "react";
import { Text, View } from "react-native";
import { theme } from "@/config";
import { formatZonaDateParam, horasMaximas } from "../../helpers";
import { FranjaHoraria } from "../FranjaHoraria";
import type { DetalleDeZona } from "./tipos";

/**
 * Las franjas del día elegido, libres u ocupadas.
 *
 * La portería ve la misma grilla que la maqueta, con cada reserva como «depto ·
 * quien reservó», y reserva desde la franja libre eligiendo antes el
 * departamento (15/10/2026).
 */
export function GrillaDeHorarios({
  zona: z,
  usaSlots,
  duracionMaximaMin,
}: {
  zona: DetalleDeZona;
  usaSlots: boolean;
  duracionMaximaMin: number;
}) {
  return (
    <View
      className="bg-white rounded-2xl p-3"
      style={{
        elevation: 3,
        shadowColor: theme.colors.shadow,
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      }}
    >
      <Text className="text-sm font-semibold text-gray-900 mb-2">
        {usaSlots ? "Horarios disponibles" : `Horario libre (máx ${horasMaximas(duracionMaximaMin)} h)`}
      </Text>
      {/*
        `selectedDate` faltaba en la cuenta: elegir un dia que no sea hoy ni
        mañana dejaba `dayFilter` en nulo, la grilla desaparecia y pedia elegir
        un dia **que acababa de elegirse**.
      */}
      {!z.dayFilter && !z.selectedDate && !z.fechaDesde && !z.fechaHasta ? (
        <Text className="text-xs text-gray-500">
          Elige un día en la tira de arriba para ver los horarios.
        </Text>
      ) : z.motivoCerrado ? (
        <Text className="text-xs text-gray-500">{z.motivoCerrado}</Text>
      ) : z.freeHours.length === 0 ? (
        <Text className="text-xs text-gray-500">Ya no quedan horas para reservar ese día.</Text>
      ) : (
        z.freeHours.map(({ hour, reservations, ajenas, libres, cupos }) => (
          <FranjaHoraria
            key={hour}
            hora={hour}
            reservas={reservations}
            esGestion={z.esGuardiaAdmin}
            ajenas={ajenas}
            libres={libres}
            cupos={cupos}
            onSeleccionar={z.setMenuItem}
            onReservar={() =>
              z.abrirReserva(
                hour,
                /*
                  El día que la grilla está pintando. Era `fechaDesde ||
                  selectedDate || new Date()`, y con «mañana» elegido las dos
                  primeras van vacías: se miraba la grilla de mañana y **se
                  reservaba hoy** (13/10/2026).
                */
                formatZonaDateParam(z.diaDeLaGrilla),
              )
            }
          />
        ))
      )}
    </View>
  );
}
