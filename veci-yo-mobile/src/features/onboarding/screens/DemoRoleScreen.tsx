import React from "react";
import { View, Text } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/shared/components";
import { ScreenLayout } from "@/shared/layouts";
import { OnboardingHeader } from "@/features/onboarding/components";
import { getDemoRole } from "@/features/onboarding/data/demoRoles";

export function DemoRoleScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { ingresarComoDemo } = useAuthStore();

  const { rol } = route.params || {};
  const rolInfo = getDemoRole(rol);

  if (!rolInfo) {
    return (
      <ScreenLayout>
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500">Rol no encontrado</Text>
        </View>
      </ScreenLayout>
    );
  }

  if (rolInfo.available) {
    ingresarComoDemo(rolInfo.key);
    return null;
  }

  return (
    <ScreenLayout>
      <OnboardingHeader />
      <View className="flex-1 items-center justify-center gap-4 px-8">
        <Text className="text-[52px]">{rolInfo.emoji}</Text>
        <Text className="text-xl font-bold text-gray-900 text-center">
          {rolInfo.label}
        </Text>
        <Text className="text-sm text-gray-500 text-center leading-5">
          Este recorrido demo está en construcción. Muy pronto podrás explorar
          la experiencia de este rol desde aquí.
        </Text>
        <Button variant="secondary" onPress={() => navigation.goBack()}>
          Volver al inicio
        </Button>
      </View>
    </ScreenLayout>
  );
}
