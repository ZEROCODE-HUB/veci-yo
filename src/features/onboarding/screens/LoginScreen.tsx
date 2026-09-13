import { useNavigation } from "@react-navigation/native";
import { View } from "react-native";
import { useAuthStore } from "@/stores/auth-store";
import { ScreenLayout } from "@/shared/layouts";
import { OnboardingHeader } from "@/features/onboarding/components";
import {
  LoginFormulario,
  LoginHero,
  RecuperarPasswordModal,
} from "../components/acceso";
import { useRecuperacion } from "../hooks/useRecuperacion";

export function LoginScreen() {
  const navigation = useNavigation<any>();
  const ingresarIncognito = useAuthStore((state) => state.ingresarIncognito);
  const recuperacion = useRecuperacion();

  return (
    <ScreenLayout padding={false} edges={["top", "bottom", "left", "right"]}>
      <OnboardingHeader />
      <View className="px-4 gap-4 pb-8">
        <LoginHero onIncognito={ingresarIncognito} />
        <LoginFormulario
          onRegistrar={() => navigation.navigate("Registro")}
          onRecuperar={() => recuperacion.setVisible(true)}
        />
      </View>
      <RecuperarPasswordModal estado={recuperacion} />
    </ScreenLayout>
  );
}
