import { theme } from "@/config";
import React, { useEffect, useRef } from "react";
import { Animated, Image, Pressable, Text, View } from "react-native";
import type { ImageSourcePropType } from "react-native";

interface Props {
  imagen: ImageSourcePropType;
  /** 0: puede dar su reconocimiento hoy. Más: cuántos días faltan. */
  diasParaGratitud: number;
  onPress: () => void;
}

/**
 * La tarjeta de Gratitud en el inicio (QA 23/10/2026, responsable de producto):
 * más pequeña, del mismo tamaño que la de Reputación, con un regalito que se
 * mueve cuando se puede dar el reconocimiento, y toda en gris cuando ya se dio
 * (vuelve a los 30 días). Antes desaparecía al darlo.
 */
export function GratitudCard({ imagen, diasParaGratitud, onPress }: Props) {
  const puedeDar = diasParaGratitud === 0;
  const latido = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!puedeDar) return;
    const animacion = Animated.loop(
      Animated.sequence([
        Animated.timing(latido, { toValue: 1.18, duration: 450, useNativeDriver: true }),
        Animated.timing(latido, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.delay(900),
      ]),
    );
    animacion.start();
    return () => animacion.stop();
  }, [puedeDar, latido]);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        puedeDar
          ? "Gratitud: puedes dar tu reconocimiento"
          : `Gratitud: ya diste tu reconocimiento, vuelve en ${diasParaGratitud} días`
      }
      className="rounded-xl overflow-hidden"
      style={{ minHeight: 120, boxShadow: theme.shadows.card }}
    >
      <Image
        source={imagen}
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
        resizeMode="cover"
      />
      <View
        className="absolute inset-0"
        style={{ backgroundColor: puedeDar ? theme.colors.veloOscuro : theme.colors.veloGris }}
      />
      <View className="flex-row items-center gap-4 px-5 py-4 flex-1">
        <Animated.View style={{ transform: [{ scale: latido }] }}>
          <Text style={{ fontSize: 34, opacity: puedeDar ? 1 : 0.5 }}>🎁</Text>
        </Animated.View>
        <View className="flex-1 gap-1">
          <Text className="text-xl font-bold text-white">Gratitud</Text>
          <Text className="text-xs text-white/90">
            {puedeDar
              ? "Reconoce a tu comunidad con regalos y colaboración."
              : `Ya diste tu reconocimiento. Vuelve en ${diasParaGratitud} ${diasParaGratitud === 1 ? "día" : "días"}.`}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
