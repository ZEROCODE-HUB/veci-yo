import { theme } from "@/config";
import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DIAS_INICIALES } from "@/shared/utils";

const DAYS = DIAS_INICIALES;
const MONTHS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

interface CalendarProps {
  /**
   * El primer dia que se puede elegir. Los anteriores se pintan apagados y no
   * responden.
   *
   * Es opcional a proposito: este calendario tambien sirve para filtrar un
   * historial o elegir un turno, donde el pasado es justo lo que se busca.
   * Solo lo pide quien reserva.
   */
  minima?: Date;
  selected?: Date | null;
  onSelect?: (date: Date) => void;
  /**
   * Dos extremos en vez de un dia.
   *
   * Una estancia tiene entrada y salida, y pedirlas en dos sitios distintos
   * --un calendario aqui y una ventana con otro calendario mas abajo-- obliga
   * a sostener en la cabeza que el de arriba era la llegada. Con el rango se
   * ve de un vistazo cuantas noches son, que es la pregunta de verdad.
   */
  rango?: boolean;
  /** El otro extremo. Solo con `rango`; la entrada sigue siendo `selected`. */
  hasta?: Date | null;
  /**
   * El rango entero cada vez que cambia. `hasta` viene `null` mientras solo
   * se ha elegido la entrada: eso es un rango a medias, no un rango de cero
   * noches, y quien lo recibe tiene que poder distinguirlo.
   */
  onRango?: (desde: Date, hasta: Date | null) => void;
  /**
   * Dias que ya estan ocupados, en `yyyy-MM-dd`.
   *
   * Se pintan tachados y no responden. Hace falta porque la base **rechaza**
   * una estancia que se solape con otra en la misma vivienda, y dejar elegir
   * unos dias para despues decir que no se puede es hacer teclear para nada:
   * el cliente creo una reserva encima de otra el 09/10/2026 y lo supo al
   * guardar.
   *
   * Un conjunto y no un rango: una vivienda puede tener varias estancias
   * sueltas, y preguntar «¿este dia esta libre?» es lo unico que el
   * calendario necesita saber.
   */
  ocupados?: Set<string>;
}

export function Calendar({
  selected,
  onSelect,
  minima,
  rango = false,
  hasta = null,
  onRango,
  ocupados,
}: CalendarProps) {
  /** Comparacion por dia, no por instante: las horas no cuentan. */
  /**
   * Si ese dia ya esta reservado.
   *
   * Se compone la fecha a mano en vez de con `toISOString`, que pasa por UTC:
   * al oeste de Greenwich un dia 16 local sale como 15, y entonces el
   * calendario tacharia el dia equivocado. Es el mismo accidente que
   * `formatDateIso` lleva documentado.
   */
  const estaOcupado = (d: number | null) => {
    if (!d || !ocupados) return false;
    const dos = (n: number) => String(n).padStart(2, "0");
    return ocupados.has(`${year}-${dos(month + 1)}-${dos(d)}`);
  };

  const anteriorAlMinimo = (d: number | null) => {
    if (!d || !minima) return false;
    const dia = new Date(year, month, d);
    const tope = new Date(
      minima.getFullYear(),
      minima.getMonth(),
      minima.getDate(),
    );
    return dia < tope;
  };

  const today = new Date();
  const [viewDate, setViewDate] = useState(
    selected ? new Date(selected) : today,
  );

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isSelected = (d: number | null) => {
    if (!selected || !d) return false;
    const s = new Date(selected);
    return (
      s.getFullYear() === year && s.getMonth() === month && s.getDate() === d
    );
  };

  /** El mismo dia que `hasta`. Con `rango`, el otro extremo. */
  const esHasta = (d: number | null) => {
    if (!hasta || !d) return false;
    const h = new Date(hasta);
    return (
      h.getFullYear() === year && h.getMonth() === month && h.getDate() === d
    );
  };

  /**
   * Entre los dos extremos, sin serlo. Es lo que se pinta como banda, y lo
   * unico que hace legible cuantas noches son.
   */
  const esIntermedio = (d: number | null) => {
    if (!rango || !d || !selected || !hasta) return false;
    const dia = new Date(year, month, d).getTime();
    const a = new Date(selected).setHours(0, 0, 0, 0);
    const b = new Date(hasta).setHours(0, 0, 0, 0);
    return dia > Math.min(a, b) && dia < Math.max(a, b);
  };

  /**
   * Que pasa al pulsar un dia en modo rango.
   *
   * Tres estados, y el tercero es el que se olvida: con el rango ya completo,
   * pulsar **vuelve a empezar**. Si no, para corregir la llegada habria que
   * borrar antes la salida, y no hay ningun sitio desde donde borrarla.
   */
  const pulsarEnRango = (dia: Date) => {
    const hayRangoCompleto = Boolean(selected && hasta);
    const anteriorALaEntrada =
      selected && dia < new Date(new Date(selected).setHours(0, 0, 0, 0));

    if (!selected || hayRangoCompleto || anteriorALaEntrada) {
      onRango?.(dia, null);
      return;
    }
    onRango?.(new Date(selected), dia);
  };

  const isToday = (d: number | null) => {
    return (
      d &&
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === d
    );
  };

  return (
    <View className="bg-white rounded-2xl p-4 shadow-card border border-gray-100">
      <View className="flex-row items-center justify-between mb-3">
        {/* Las dos flechas del calendario: dos chevrones iguales y opuestos,
            y sin nombre ninguna dice hacia donde va. */}
        <Pressable
          onPress={() => setViewDate(new Date(year, month - 1, 1))}
          accessibilityRole="button"
          accessibilityLabel="Mes anterior"
          className="p-1"
        >
          <Ionicons
            name="chevron-back"
            size={22}
            color={theme.colors.textSecondary}
          />
        </Pressable>
        <View className="items-center">
          <Text className="text-danger font-bold text-sm">{year}</Text>
          <Text className="font-semibold text-base text-gray-900">
            {MONTHS[month]}
          </Text>
        </View>
        <Pressable
          onPress={() => setViewDate(new Date(year, month + 1, 1))}
          accessibilityRole="button"
          accessibilityLabel="Mes siguiente"
          className="p-1"
        >
          <Ionicons
            name="chevron-forward"
            size={22}
            color={theme.colors.textSecondary}
          />
        </Pressable>
      </View>

      <View className="flex-row">
        {DAYS.map((d, i) => (
          <View key={i} className="flex-1 items-center py-1">
            <Text className="text-xs font-semibold text-gray-400">{d}</Text>
          </View>
        ))}
      </View>

      <View className="flex-row flex-wrap">
        {cells.map((d, i) => {
          const esEntrada = isSelected(d);
          const esSalida = esHasta(d);
          const sel = esEntrada || (rango && esSalida);
          const enMedio = esIntermedio(d);
          const mismoDia = esEntrada && esSalida;
          const tod = isToday(d);
          const ocupado = estaOcupado(d);
          const vedado = anteriorAlMinimo(d) || ocupado;
          /*
            La banda llega hasta el borde de la celda por un lado y se redondea
            por el otro, para que las tres partes --entrada, medio, salida--
            se lean como una sola pieza y no como tres circulos sueltos.
          */
          const fondoDeBanda =
            rango && (enMedio || (esEntrada && hasta) || (esSalida && selected))
              ? theme.colors.secondaryLight
              : "transparent";
          return (
            <Pressable
              key={i}
              /*
                El dia elegido se veia solo por el circulo rojo, y el vedado por
                la opacidad: quien no lo ve pulsaba un dia que no se puede
                reservar sin saber por que no pasaba nada.
              */
              accessibilityRole="button"
              accessibilityLabel={
                d
                  ? ocupado
                    ? `Dia ${d}, ya reservado`
                    : rango && esEntrada
                      ? `Dia ${d}, entrada`
                      : rango && esSalida
                        ? `Dia ${d}, salida`
                        : `Dia ${d}`
                  : undefined
              }
              accessibilityState={{ selected: sel, disabled: !d || vedado }}
              aria-selected={sel}
              /*
                `aria-disabled` aparte: react-native-web no traduce
                `accessibilityState`, asi que un dia vedado llegaba al DOM
                pulsable a la vista de un lector de pantalla. Ya esta
                documentado en `Checkbox`, y aqui importa igual: lo unico que
                distinguia un dia reservado era el tachado.
              */
              aria-disabled={!d || vedado}
              onPress={() => {
                if (!d || vedado) return;
                const dia = new Date(year, month, d);
                if (rango) pulsarEnRango(dia);
                else onSelect?.(dia);
              }}
              disabled={!d || vedado}
              className="w-[14.28%] aspect-square items-center justify-center"
              style={{
                opacity: vedado ? 0.3 : 1,
                backgroundColor: fondoDeBanda,
                /*
                  Redondeado por donde la banda empieza o acaba, recto por
                  donde continua hacia la celda de al lado. Entrar y salir el
                  mismo dia --una noche-- es un circulo suelto, no un trozo de
                  banda cortado por los dos lados.
                */
                borderTopLeftRadius: !mismoDia && (enMedio || esSalida) ? 0 : 999,
                borderBottomLeftRadius:
                  !mismoDia && (enMedio || esSalida) ? 0 : 999,
                borderTopRightRadius:
                  !mismoDia && (enMedio || esEntrada) ? 0 : 999,
                borderBottomRightRadius:
                  !mismoDia && (enMedio || esEntrada) ? 0 : 999,
              }}
            >
              <View
                className="w-8 h-8 rounded-full items-center justify-center"
                style={{
                  backgroundColor: sel ? theme.colors.danger : "transparent",
                }}
              >
                <Text
                  className="text-sm"
                  style={{
                    /*
                      Tachado, no solo apagado. Un dia pasado y un dia
                      reservado se veian igual --los dos al 30% de opacidad--
                      y no son lo mismo: uno ya paso y el otro esta ocupado.
                    */
                    textDecorationLine: ocupado ? "line-through" : "none",
                    fontWeight: tod || sel ? "bold" : "normal",
                    color: sel
                      ? theme.colors.textInverse
                      : tod
                        ? theme.colors.danger
                        : d
                          ? theme.colors.text
                          : "transparent",
                  }}
                >
                  {d || ""}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
