import React from "react";
import { View, Text, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LegalAccordion } from "@/shared/components";
import { ScreenLayout } from "@/shared/layouts";
import { OnboardingHeader } from "@/features/onboarding/components";

export function TerminosLegalesScreen() {
  const navigation = useNavigation<any>();

  return (
    <ScreenLayout>
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

        <LegalAccordion />
      </View>
    </ScreenLayout>
  );
}
