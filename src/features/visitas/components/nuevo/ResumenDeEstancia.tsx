import React from "react";
import { View, Text } from "react-native";
import { theme } from "@/config";
import { formatDateShortMonth } from "@/shared/utils";

interface Props {
  entrada: Date;
  /** `null` mientras solo se ha elegido la llegada. */
  salida: Date | null;
}

/** Noches entre dos dias, contando por dia y no por instante. */
export function nochesEntre(entrada: Date, salida: Date) {
  const a = new Date(entrada).setHours(0, 0, 0, 0);
  const b = new Date(salida).setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((b - a) / 86400000));
}

/**
 * Lo que el anfitrion acaba de elegir, en una linea.
 *
 * El calendario pinta la banda, pero la pregunta que se hace quien reserva es
 * **cuantas noches son**, y eso no se cuenta mirando celdas. Hasta el
 * 09/10/2026 las dos fechas ni siquiera se veian juntas: la llegada estaba en
 * un calendario y la salida dentro de una ventana.
 *
 * Y mientras falta la salida lo dice, en vez de quedarse en blanco: un rango a
 * medias y un rango de un dia se pintan casi igual, y el formulario solo
 * protesta al pulsar Aceptar.
 */
export function ResumenDeEstancia({ entrada, salida }: Props) {
  const completo = Boolean(salida);
  const noches = salida ? nochesEntre(entrada, salida) : 0;

  return (
    <View
      className="rounded-xl px-4 py-3"
      style={{
        backgroundColor: completo
          ? theme.colors.secondaryLight
          : theme.colors.bgMuted,
        borderWidth: 1,
        borderColor: completo ? theme.colors.secondary : theme.colors.border,
      }}
    >
      {completo && salida ? (
        <>
          <Text className="text-sm font-semibold text-gray-900">
            {formatDateShortMonth(entrada)} → {formatDateShortMonth(salida)}
          </Text>
          {/*
            Cero noches **no es una estancia**: alojarse es dormir ahí, y el
            modelo entero lo da por hecho. Decía «Entra y sale el mismo día»
            como si fuera una opción más; ahora lo dice como lo que es, y el
            formulario no deja seguir.
          */}
          {noches === 0 ? (
            <Text className="text-xs mt-0.5" style={{ color: theme.colors.danger }}>
              Entra y sale el mismo día: una estancia es de al menos una noche.
              Elegí la salida en el calendario.
            </Text>
          ) : (
            <Text className="text-xs text-gray-500 mt-0.5">
              {`${noches} ${noches === 1 ? "noche" : "noches"}`}
              {" · el acceso del huésped termina al día siguiente de la salida"}
            </Text>
          )}
        </>
      ) : (
        <>
          <Text className="text-sm font-semibold text-gray-900">
            Entra el {formatDateShortMonth(entrada)}
          </Text>
          <Text className="text-xs text-gray-500 mt-0.5">
            Ahora elegí en el calendario el día en que se va.
          </Text>
        </>
      )}
    </View>
  );
}
