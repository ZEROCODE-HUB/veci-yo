import { View, Text, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ScreenLayout } from "@/shared/layouts";
import { OnboardingHeader } from "@/features/onboarding/components";
import { RegistroFormulario, RegistroHero } from "../components/registro";

export function RegistroScreen() {
  const navigation = useNavigation<any>();

  return (
    <ScreenLayout padding={false}>
      <OnboardingHeader />
      <View className="px-4 gap-4 pb-8">
        <Pressable
          onPress={() => navigation.goBack()}
          className="flex-row items-center gap-1.5 self-start py-1.5"
        >
          <Text className="text-sm font-medium text-gray-900">← Volver</Text>
        </Pressable>
        <RegistroHero />
        <RegistroFormulario
          onAbrirTerminos={() => navigation.navigate("TerminosLegales")}
        />
      </View>
    </ScreenLayout>
  );
}
