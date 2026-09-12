import React from "react";
import { View, Text, Pressable, Image } from "react-native";
import { TIPO_LABELS } from "@/data";
import { TIPO_VISITA_ASSETS } from "./tipoVisitaAssets";

interface VisitaTipoCardProps {
  tipo: string;
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
  const icon = TIPO_VISITA_ASSETS[tipo] || TIPO_VISITA_ASSETS.amigos;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className="items-center gap-2 p-4 rounded-2xl"
      style={{
        backgroundColor: isActive ? "#F5B800" : "#FFFFFF",
        borderWidth: 2,
        borderColor: isActive ? "#F5B800" : "#E5E7EB",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
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
        style={{ color: isActive ? "#111827" : "#6B7280" }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
