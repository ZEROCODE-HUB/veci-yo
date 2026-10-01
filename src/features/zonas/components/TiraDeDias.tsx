import { theme } from "@/config";
import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { enISO, tiraDeDias } from "../services/tiraDeDias";

/**
 * El día que se está mirando en la grilla de una zona, en un solo renglón.
 *
 * Sustituye a los botones «Hoy» y «Mañana». La grilla pinta **un** día, así
 * que el control que lo elige tiene que ofrecer días, no un rango: con un
 * rango se acababa reservando su primer día sin que nadie lo hubiera elegido.
 *
 * Empieza hoy: el pasado no se ofrece porque la base lo rechaza.
 */
interface Props {
  /** El día que está pintando la grilla ahora mismo. */
  seleccionado: Date;
  onSeleccionar: (dia: Date) => void;
  /** Cuántos días ofrecer. Dos semanas cubre de sobra una lavandería. */
  dias?: number;
}

export function TiraDeDias({ seleccionado, onSeleccionar, dias = 14 }: Props) {
  const isoSeleccionado = enISO(seleccionado);

  return (
    /*
      Un grupo de opciones excluyentes, no una fila de botones sueltos. La
      primera version usaba `button` con `accessibilityState={{selected}}`, y
      `aria-selected` **no es valido en un boton**: solo en `option`, `tab`,
      `row` y similares. O sea que un lector de pantalla no anunciaba nunca
      cual era el dia elegido. Lo encontro la primera prueba de componente que
      se escribio en este proyecto, al primer intento.
    */
    <ScrollView
      horizontal
      accessibilityRole="radiogroup"
      accessibilityLabel="Día que se está viendo"
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
    >
      {tiraDeDias(new Date(), dias).map((dia) => {
        const activo = dia.iso === isoSeleccionado;
        return (
          <Pressable
            key={dia.iso}
            onPress={() => onSeleccionar(dia.fecha)}
            accessibilityRole="radio"
            /*
              `aria-checked` y no `accessibilityState={{checked}}`: el segundo
              no llega a emitir el atributo --el DOM salia con `role="radio"`
              y sin estado, o sea una opcion que no dice si esta elegida-- y
              lo directo lo entienden igual React Native 0.86 y react-native-web.
            */
            aria-checked={activo}
            /*
              El nombre largo va en la etiqueta accesible y no en la pildora:
              en un renglon no caben catorce «viernes 25», pero quien navega
              con lector de pantalla no tiene por que adivinar «vie 25».
            */
            accessibilityLabel={
              dia.esHoy
                ? `Hoy, ${dia.diaSemana} ${dia.diaMes}`
                : dia.esManana
                  ? `Mañana, ${dia.diaSemana} ${dia.diaMes}`
                  : `${dia.diaSemana} ${dia.diaMes}`
            }
            className="rounded-xl items-center justify-center"
            style={{
              minWidth: 52,
              paddingVertical: 6,
              paddingHorizontal: 8,
              backgroundColor: activo
                ? theme.colors.primary
                : theme.colors.bgCard,
              borderWidth: 1.5,
              borderColor: activo ? theme.colors.primary : theme.colors.border,
            }}
          >
            <Text
              className="text-[10px] font-semibold"
              style={{
                color: activo
                  ? theme.colors.textInverse
                  : theme.colors.textSecondary,
              }}
            >
              {dia.esHoy ? "HOY" : dia.diaSemana.toUpperCase()}
            </Text>
            <Text
              className="text-sm font-bold"
              style={{
                color: activo ? theme.colors.textInverse : theme.colors.text,
              }}
            >
              {dia.diaMes}
            </Text>
          </Pressable>
        );
      })}
      {/* Un respiro al final para que la ultima pildora no quede pegada. */}
      <View style={{ width: 4 }} />
    </ScrollView>
  );
}
