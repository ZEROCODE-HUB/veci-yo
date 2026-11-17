import { theme } from "@/config";
import React, { useRef, useState } from "react";
import { View, Text, ScrollView, Pressable,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { formatAmount, formatMoney } from "@/shared/utils";
import { useParametrosDeLaBase } from "@/shared/hooks";
import type { PuntualidadMes } from "../helpers/puntualidad";
import { PuntualidadDelMes } from "./cuadroHonor/PuntualidadDelMes";

interface CuotaHistorial {
  mes: string;
  moneda?: string | null;
  esperado: number;
  recibido: number;
  alDia: number;
  atrasados: number;
  porcentaje: number;
  /** Si ese mes tiene cuota definida. Sin ella, el 0% no acusa a nadie. */
  tieneCuota?: boolean;
  /** A tiempo, con atraso y pendiente, de la base (17/11/2026). */
  puntualidad?: PuntualidadMes;
}

interface CarruselCuotasProps {
  historial: CuotaHistorial[];
  /**
   * El relleno lateral de la pantalla que lo contiene. El carrusel se sale de
   * él para que la tarjeta de al lado asome hasta el borde del teléfono, y no
   * se corte en seco a 16 px del borde.
   */
  sangria?: number;
}

/**
 * Como mucho este ancho, y en un celular estrecho lo que haya de hueco. Antes
 * el ancho era fijo y en uno de 320 la tarjeta se cortaba (25/10/2026).
 */
const CARD_WIDTH_MAX = 340;
const CARD_GAP = 12;
/** Cuánto asoma la tarjeta siguiente por la derecha (y la anterior por la izquierda). */
const ASOMA = 20;

/**
 * Las cuotas, mes a mes, en un carrusel (rediseño pedido por el cliente,
 * 17/11/2026: «la tarjeta se ve rara»). La tarjeta del mes que se mira va
 * centrada y la siguiente asoma un poco por la derecha, para que se vea que
 * hay más; se pasa de una en una (`snapToInterval`).
 *
 * Es un `ScrollView` horizontal dentro de la pantalla, que se desliza en
 * vertical: direcciones distintas, así que no hace falta `nestedScrollEnabled`.
 */
export function CarruselCuotas({ historial, sangria = 16 }: CarruselCuotasProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [activo, setActivo] = useState(0);
  const [anchoVisible, setAnchoVisible] = useState(0);

  const unaSola = historial.length <= 1;
  // El hueco que se ve: el de la pantalla más la sangría a los dos lados.
  const anchoDelCarrusel = anchoVisible + sangria * 2;
  const anchoTarjeta = Math.max(
    0,
    unaSola
      ? Math.min(CARD_WIDTH_MAX, anchoVisible)
      : Math.min(CARD_WIDTH_MAX, anchoDelCarrusel - 2 * (ASOMA + CARD_GAP)),
  );
  const intervalo = anchoTarjeta + CARD_GAP;
  // Relleno a los lados para que la tarjeta quede en el centro.
  const margenLateral = Math.max(0, (anchoDelCarrusel - anchoTarjeta) / 2);

  /*
    Desde qué porcentaje se pinta verde o amarillo lo decide el edificio
    (`honor_umbral_verde`, `honor_umbral_amarillo`). Mientras no llegan, el
    número sale sin color: no se pinta un semáforo con umbrales inventados.
  */
  const parametrosDeLaBase = useParametrosDeLaBase();
  const colorDelPorcentaje = (porcentaje: number) => {
    if (!parametrosDeLaBase.listo) return undefined;
    if (porcentaje >= parametrosDeLaBase.numero("honor_umbral_verde")) {
      return theme.colors.success;
    }
    if (porcentaje >= parametrosDeLaBase.numero("honor_umbral_amarillo")) {
      return theme.colors.primary;
    }
    return theme.colors.danger;
  };

  const alMoverse = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (intervalo <= 0) return;
    const idx = Math.round(e.nativeEvent.contentOffset.x / intervalo);
    const acotado = Math.min(Math.max(idx, 0), Math.max(historial.length - 1, 0));
    if (acotado !== activo) setActivo(acotado);
  };

  const dinero = (monto: number, moneda?: string | null) =>
    moneda ? formatMoney(monto, moneda) : `$${formatAmount(monto)}`;

  return (
    <View
      className="gap-2.5"
      onLayout={(e) => {
        const ancho = Math.floor(e.nativeEvent.layout.width);
        if (ancho > 0 && ancho !== anchoVisible) setAnchoVisible(ancho);
      }}
    >
      <Text className="text-lg font-bold text-gray-900 px-0.5">
        Cuota de administración por mes
      </Text>
      {/* Sin meses, el carrusel se quedaba en blanco (13/11/2026). */}
      {historial.length === 0 ? (
        <Text className="text-sm text-gray-500 px-0.5">
          Todavía no hay meses de cuota.
        </Text>
      ) : null}

      {/* Hasta medir el hueco no se pinta: con ancho 0 las tarjetas saltarían. */}
      {anchoVisible > 0 && historial.length > 0 ? (
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEnabled={!unaSola}
          onScroll={alMoverse}
          scrollEventThrottle={32}
          onMomentumScrollEnd={alMoverse}
          snapToInterval={intervalo}
          snapToAlignment="start"
          disableIntervalMomentum
          decelerationRate="fast"
          style={unaSola ? undefined : { marginHorizontal: -sangria }}
          contentContainerStyle={unaSola ? undefined : { paddingHorizontal: margenLateral }}
        >
          {historial.map((h, i) => (
            <View
              key={h.mes}
              accessibilityLabel={`Cuota de ${h.mes}, ${i + 1} de ${historial.length}`}
              className="bg-white rounded-2xl p-5 gap-4"
              style={{
                width: anchoTarjeta,
                marginRight: i === historial.length - 1 ? 0 : CARD_GAP,
                // Las de al lado, más tenues: se ve cuál es la que se está mirando.
                opacity: unaSola || i === activo ? 1 : 0.6,
                boxShadow: theme.shadows.card,
              }}
            >
              <View className="items-center gap-0.5">
                <Text className="text-sm font-semibold text-gray-700">{h.mes}</Text>
                {/*
                  El mes en curso sale aunque nadie le haya puesto cuota
                  (03/10/2026). Pintarle un «0%» sería acusar a los vecinos de
                  no pagar algo que no se les ha pedido: se dice eso, y no un
                  número.
                */}
                {h.tieneCuota === false ? (
                  <>
                    <Text className="text-[22px] font-bold text-gray-400">Sin cuota</Text>
                    <Text className="text-center text-sm text-gray-500">
                      Este mes todavía no tiene cuota definida.
                    </Text>
                  </>
                ) : (
                  <>
                    <Text
                      className="text-[36px] font-bold"
                      style={{ color: colorDelPorcentaje(h.porcentaje) }}
                    >
                      {h.porcentaje} %
                    </Text>
                    <Text className="text-xs text-gray-500">recaudado</Text>
                    <Text className="text-sm text-gray-600 text-center">
                      {dinero(h.recibido, h.moneda)} de {dinero(h.esperado, h.moneda)}
                    </Text>
                  </>
                )}
              </View>

              {/*
                Sin cuota tampoco hay barra: decía «Al día 0 / 4» en un mes en
                que nadie debe nada (06/10/2026).
              */}
              {h.tieneCuota === false ? null : h.puntualidad ? (
                <PuntualidadDelMes puntualidad={h.puntualidad} />
              ) : (
                <View>
                  <View className="flex-row justify-between mb-1">
                    <Text className="text-xs text-gray-500">Al día</Text>
                    <Text className="text-xs text-gray-500">
                      {h.alDia} / {h.alDia + h.atrasados}
                    </Text>
                  </View>
                  <View className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <View
                      className="h-full rounded-full"
                      style={{
                        // Sin viviendas el divisor es cero: `NaN%` no lo lee el teléfono.
                        width: `${
                          h.alDia + h.atrasados > 0
                            ? (h.alDia / (h.alDia + h.atrasados)) * 100
                            : 0
                        }%`,
                        backgroundColor: theme.colors.success,
                      }}
                    />
                  </View>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      ) : null}

      {unaSola ? null : (
        <View className="flex-row justify-center gap-1.5">
          {historial.map((h, i) => (
            <Pressable
              key={h.mes}
              /*
                Cuál se está viendo se veía solo por el tamaño y el color del
                punto; el punto no decía siquiera a qué lleva.
              */
              accessibilityRole="tab"
              accessibilityLabel={`Ver la cuota de ${h.mes}`}
              accessibilityState={{ selected: i === activo }}
              aria-selected={i === activo}
              hitSlop={8}
              onPress={() => {
                setActivo(i);
                scrollRef.current?.scrollTo({ x: i * intervalo, animated: true });
              }}
              style={{
                width: i === activo ? 18 : 8,
                height: 8,
                borderRadius: 4,
                backgroundColor:
                  i === activo ? theme.colors.primary : theme.colors.border,
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
}
