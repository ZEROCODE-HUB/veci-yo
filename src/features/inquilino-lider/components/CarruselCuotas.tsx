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
            </View>

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
                      width: `${(h.alDia / (h.alDia + h.atrasados)) * 100}%`,
                      backgroundColor: theme.colors.success,
                    }}
                  />
                </View>
              </View>
              <View>
                <View className="flex-row justify-between mb-1">
                  <Text className="text-xs text-gray-500">
                    Con retraso / Deudor
                  </Text>
                  <Text className="text-xs text-gray-500">
                    {h.atrasados} / {h.alDia + h.atrasados}
                  </Text>
                </View>
                <View className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <View
                    className="h-full rounded-full"
                    style={{
                      width: `${(h.atrasados / (h.alDia + h.atrasados)) * 100}%`,
                      backgroundColor: theme.colors.badgeRedBorder,
                    }}
                  />
                </View>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      <View className="flex-row justify-center gap-1.5">
        {historial.map((_, i) => (
          <Pressable
            key={i}
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
