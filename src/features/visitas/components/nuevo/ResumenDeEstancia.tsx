import React from "react";
import { View, Text, Pressable } from "react-native";
import { theme } from "@/config";
import { formatDateShortMonth } from "@/shared/utils";

interface Props {
  /** `null` mientras no se ha elegido la llegada (24/10/2026: ya no nace en hoy). */
  entrada: Date | null;
  /** `null` mientras solo se ha elegido la llegada. */
  salida: Date | null;
  /** Las noches que acepta el anfitrión, para decirlas antes de elegir. */
  minNoches?: number;
  maxNoches?: number | null;
  /** «Cambiar las fechas»: vuelve a empezar. */
  onBorrar?: () => void;
}

/** «Mínimo 3 noches · máximo 10», o nada si no hay ningún límite. */
export function limitesDeNoches(min = 1, max: number | null = null): string {
  const partes: string[] = [];
  if (min > 1) partes.push(`mínimo ${min} noches`);
  if (max != null) partes.push(`máximo ${max} ${max === 1 ? "noche" : "noches"}`);
  const texto = partes.join(" · ");
  return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : "";
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
export function ResumenDeEstancia({ entrada, salida, minNoches = 1, maxNoches = null, onBorrar }: Props) {
  const completo = Boolean(entrada && salida);
  const noches = entrada && salida ? nochesEntre(entrada, salida) : 0;
  const limites = limitesDeNoches(minNoches, maxNoches);

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
      {!entrada ? (
        <>
          <Text className="text-sm font-semibold text-gray-900">
            1. Toca en el calendario el día en que llega
          </Text>
          <Text className="text-xs text-gray-500 mt-0.5">
            {`2. Después, el día en que se va.${limites ? ` ${limites}.` : ""} También puedes escribir las fechas.`}
          </Text>
        </>
      ) : completo && salida ? (
        <>
          <Text className="text-sm font-semibold text-gray-900">
            {`${formatDateShortMonth(entrada as Date)} → ${formatDateShortMonth(salida)}`}
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
              Elige la salida en el calendario.
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
            {`Llega el ${formatDateShortMonth(entrada as Date)}`}
          </Text>
          <Text className="text-xs text-gray-500 mt-0.5">
            {`Ahora toca el día en que se va.${limites ? ` ${limites}.` : ""}`}
          </Text>
        </>
      )}
      {entrada && onBorrar ? (
        <Pressable onPress={onBorrar} accessibilityRole="button" className="mt-2 self-start">
          <Text className="text-xs font-semibold text-primary">Cambiar las fechas</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
