import React from "react";
import { View, Text } from "react-native";
import { LegalAccordion } from "../components";
import { useDocumentosLegales } from "../hooks/useDocumentosLegales";
import { ScreenLayout } from "@/shared/layouts";
import { OnboardingHeader } from "@/features/onboarding/components";
import { useNavegacion } from "@/shared/hooks";

/*
  Sin cabecera encima, así que el borde de arriba lo pone la pantalla: sin él,
  el título quedaba bajo la muesca y la hora del teléfono (auditoría de
  responsividad, 24/10/2026). Donde sí hay cabecera no suma nada, porque solo
  aparta lo que de verdad pisa la zona insegura.
*/
const BORDES: ("top" | "left" | "right")[] = ["top", "left", "right"];

export function TerminosLegalesScreen() {
  const navigation = useNavegacion();
  const { documentos, cargando } = useDocumentosLegales();

  return (
    <ScreenLayout edges={BORDES}>
      <OnboardingHeader />

      <View className="px-4 gap-4">
        <Text
          className="text-sm font-medium text-gray-900 underline self-start py-1.5"
          onPress={() => navigation.goBack()}
        >
          ← Volver
        </Text>

        <Text className="text-xl font-bold text-gray-900 text-center">
          Documentos Legales
        </Text>

        <Text className="text-sm text-gray-500 text-center leading-5">
          Revisa y acepta nuestros documentos legales para continuar.
        </Text>

        <LegalAccordion docs={documentos} cargando={cargando} />
      </View>
    </ScreenLayout>
  );
}
