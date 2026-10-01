import { theme } from "@/config";
import type { VisitaItem } from "@/shared/types";
import React from "react";
import { Text, Pressable, Image } from "react-native";
import { TIPO_LABELS } from "../constants";
import { TIPO_VISITA_ASSETS } from "./tipoVisitaAssets";

interface VisitaTipoCardProps {
  tipo: VisitaItem["tipo"];
  isActive: boolean;
  isDisabled?: boolean;
  onPress: () => void;
}

export function VisitaTipoCard({
  tipo,
  isActive,
  isDisabled,
  onPress,
}: VisitaTipoCardProps) {
  const label = TIPO_LABELS[tipo] || tipo;
  const icon = TIPO_VISITA_ASSETS[tipo];

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="radio"
      accessibilityState={{ checked: isActive }}
      aria-checked={isActive}
      className="items-center gap-2 p-4 rounded-2xl"
      style={{
        backgroundColor: isActive ? theme.colors.primary : theme.colors.bgCard,
        borderWidth: 2,
        borderColor: isActive ? theme.colors.primary : theme.colors.border,
        boxShadow: theme.shadows.card,
        opacity: isDisabled ? 0.45 : 1,
        filter: isDisabled ? "grayscale(0.6)" : "none",
      }}
    >
      <Image
        source={icon}
        style={{ width: 60, height: 60, borderRadius: 9999 }}
        resizeMode="cover"
      />
      <Text
        className="text-sm text-center"
        style={{
          color: isActive ? theme.colors.text : theme.colors.textSecondary,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
