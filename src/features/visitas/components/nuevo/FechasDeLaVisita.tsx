import React from "react";
import { Text, View } from "react-native";
import { theme } from "@/config";
import { Calendar } from "@/shared/components";
import { formatDate } from "@/shared/utils";
import { useUIStore } from "@/stores/ui-store";
import { SelectorDePlataforma } from "../PlataformaDeLaReserva";
import { FechasEscritas } from "./FechasEscritas";
import { ResumenDeEstancia } from "./ResumenDeEstancia";
import type { AltaDeVisita } from "./tipos";

/**
 * Cuándo es la visita: hoy para la portería, un rango para una estancia y un
 * día para las demás.
 */
export function FechasDeLaVisita({ alta: v }: { alta: AltaDeVisita }) {
  const addToast = useUIStore((s) => s.addToast);

  if (v.esGuardia) {
    return (
      <View
        className="rounded-2xl p-4 items-center gap-2"
        style={{ backgroundColor: theme.colors.bgMuted, boxShadow: theme.shadows.card }}
      >
        <Text className="text-sm text-gray-500">Fecha de la visita</Text>
        <Text className="text-lg font-bold text-gray-900">Hoy — {formatDate(new Date())}</Text>
        <Text className="text-xs text-gray-400">
          El Guardia solo puede registrar visitas del mismo día
        </Text>
      </View>
    );
  }

  if (v.tipoSeleccionado === "huesped-temporal") {
    /*
      Una estancia tiene dos extremos, y hasta el 09/10/2026 se pedian en dos
      sitios, sin verse nunca juntas, así que lo unico que importa de verdad
      --cuantas noches son-- no se podia leer de un vistazo. Ahora es un rango:
      se pulsa la llegada, se pulsa la salida, y la banda entre las dos lo dice.
      Punto 67 de `REVISAR-A-OJO.md`.

      Nada marcado hasta que se elige la llegada: arrancaba con hoy como
      propuesta y el cliente no sabía si estaba elegido (24/10/2026). Y las
      noches que acepta el anfitrión mandan.
    */
    const entrada = v.llegadaElegida ? v.selectedDate : null;
    return (
      <View className="gap-2">
        <ResumenDeEstancia
          entrada={entrada}
          salida={v.salidaComoFecha}
          minNoches={v.nochesMinimas}
          maxNoches={v.nochesMaximas}
          onBorrar={v.borrarFechas}
        />
        <Calendar
          rango
          minima={new Date()}
          selected={entrada}
          hasta={v.salidaComoFecha}
          minNoches={v.nochesMinimas}
          maxNoches={v.nochesMaximas}
          onRango={v.alElegirRango}
          onRangoCruzado={() =>
            addToast("Hay una reserva en medio de esas fechas. Elige una salida anterior.", "error")
          }
          /*
            Los dias que esta vivienda ya tiene reservados salen tachados. La
            base rechaza una estancia solapada, y dejar elegir para decir que no
            al guardar es hacer teclear para nada.
          */
          ocupados={v.diasOcupados}
        />
        <FechasEscritas
          entrada={entrada}
          salida={v.salidaComoFecha}
          onRango={v.alElegirRango}
          minNoches={v.nochesMinimas}
          maxNoches={v.nochesMaximas}
          ocupados={v.diasOcupados}
        />
        <SelectorDePlataforma valor={v.plataforma} onCambiar={v.setPlataforma} />
      </View>
    );
  }

  return (
    <Calendar
      /*
        Un vecino anuncia a quien va a venir: el pasado no se elige. La
        administración sí anota lo que ya pasó.
      */
      minima={v.esGuardiaOAdmin ? undefined : new Date()}
      selected={v.selectedDate}
      onSelect={v.setSelectedDate}
    />
  );
}
