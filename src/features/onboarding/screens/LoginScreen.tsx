import { View } from "react-native";
import { ScreenLayout } from "@/shared/layouts";
import { OnboardingHeader } from "@/features/onboarding/components";
import {
  LoginFormulario,
  LoginHero,
  RecuperarPasswordModal,
} from "../components/acceso";
import { useRecuperacion } from "../hooks/useRecuperacion";
import { useNavegacionEntrada } from "@/shared/hooks";

export function LoginScreen() {
  const navigation = useNavegacionEntrada();
  const recuperacion = useRecuperacion();

  return (
    <ScreenLayout padding={false} edges={["top", "bottom", "left", "right"]}>
      <OnboardingHeader />
      <View className="px-4 gap-4 pb-8">
        <LoginHero />
        <LoginFormulario
          onRegistrar={() => navigation.navigate("Registro")}
          onRecuperar={() => recuperacion.setVisible(true)}
        />
      </View>
      <RecuperarPasswordModal estado={recuperacion} />
    </ScreenLayout>
  );
}
