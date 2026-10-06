import { theme } from "@/config";
import React, { useRef, useState } from "react";
import { View, Text, ScrollView, Pressable,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { formatAmount } from "@/shared/utils";

interface CuotaHistorial {
  mes: string;
  esperado: number;
  recibido: number;
  alDia: number;
  atrasados: number;
  porcentaje: number;
  /** Si ese mes tiene cuota definida. Sin ella, el 0% no acusa a nadie. */
  tieneCuota?: boolean;
}

interface CarruselCuotasProps {
  historial: CuotaHistorial[];
}

const CARD_WIDTH = 320;
const CARD_GAP = 12;
const CARD_INTERVAL = CARD_WIDTH + CARD_GAP;

export function CarruselCuotas({ historial }: CarruselCuotasProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [activo, setActivo] = useState(0);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / CARD_INTERVAL);
    setActivo(idx);
  };

  return (
    <View className="gap-2.5">
      <Text className="text-lg font-bold text-gray-900 px-0.5">
        Cuota de administración por mes
      </Text>

      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        snapToInterval={CARD_INTERVAL}
        snapToAlignment="start"
        decelerationRate="fast"
      >
        {historial.map((h) => (
          <View
            key={h.mes}
            className="bg-white rounded-xl p-5 gap-3.5"
            style={{
              width: CARD_WIDTH,
              marginRight: 12,
              shadowColor: theme.colors.shadow,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            <View className="items-center">
              <Text className="text-xs text-gray-500 mb-0.5">
                {h.mes} — Cuota de administración
              </Text>
              {/*
                El mes en curso sale siempre desde el 03/10/2026, aunque nadie
                le haya puesto cuota todavía. Pintarle un «0%» en rojo sería
                acusar a los vecinos de no pagar algo que no se les ha pedido:
                cuando no hay cuota se dice eso, y no un número.
              */}
              {h.tieneCuota === false ? (
                <>
                  <Text className="text-[22px] font-bold text-gray-400">
                    Sin cuota
                  </Text>
                  <Text className="mt-0.5 text-center text-sm text-gray-500">
                    Este mes todavía no tiene cuota definida.
                  </Text>
                </>
              ) : (
                <>
                  <Text
                    className="text-[36px] font-bold"
                    style={{
                      color:
                        h.porcentaje >= 80
                          ? theme.colors.success
                          : h.porcentaje >= 50
                            ? theme.colors.primary
                            : theme.colors.danger,
                    }}
                  >
                    {h.porcentaje}%
                  </Text>
                  <Text className="text-sm text-gray-500 mt-0.5">
                    ${formatAmount(h.recibido)} de ${formatAmount(h.esperado)}{" "}
                    recibido
                  </Text>
                </>
              )}
            </View>

            {/*
              Aqui habia una segunda barra, «Con retraso / Deudor», en rojo y
              justo debajo. No añadia ni un dato --es la de arriba al reves-- y
              era lo que convertia un tablero de reconocimiento en uno de
              morosidad: quien no sale en la lista de abajo queda señalado por
              descarte, y la barra roja invitaba a hacer esa cuenta.

              La morosidad con nombres vive en la pantalla de la
              administracion, que es donde se puede hacer algo con ella.
              Decidido con el cliente el 29/09/2026 (punto 71).
            */}
            {/*
              Y la barra tampoco, cuando no hay cuota.

              El titular ya decia «Sin cuota» desde el 03/10/2026, con su
              motivo escrito arriba --«pintarle un 0% en rojo seria acusar a los
              vecinos de no pagar algo que no se les ha pedido»--. Pero la barra
              se quedo fuera de esa condicion y decia **«Al dia 0 / 4»** en un
              mes en que nadie debe nada: la misma acusacion con otra forma, y a
              dos lineas del comentario que explica por que no.

              Salio caminando el Cuadro de Honor como Sofia el 06/10/2026.
              Es la familia de «un arreglo a medias es peor si lleva
              comentario», aqui con el comentario del lado correcto.
            */}
            {h.tieneCuota === false ? null : (
              <View className="gap-2">
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
                        /*
                          Sin nadie en la vivienda el divisor es cero y `width`
                          sale `NaN%`, que el navegador ignora y el telefono no
                          sabe leer. No pasa hoy --siempre hay cuatro
                          viviendas-- y cuesta una linea cerrarlo.
                        */
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
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      <View className="flex-row justify-center gap-1.5">
        {historial.map((_, i) => (
          <Pressable
            key={i}
            /*
              Cual se esta viendo se veia **solo** por el tamano y el color del
              punto. Y el punto no decia siquiera a que lleva.
            */
            accessibilityRole="tab"
            accessibilityLabel={`Ver la cuota ${i + 1} de ${historial.length}`}
            accessibilityState={{ selected: i === activo }}
            aria-selected={i === activo}
            onPress={() => {
              scrollRef.current?.scrollTo({
                x: i * CARD_INTERVAL,
                animated: true,
              });
            }}
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor:
                i === activo ? theme.colors.primary : theme.colors.border,
            }}
          />
        ))}
      </View>
    </View>
  );
}
