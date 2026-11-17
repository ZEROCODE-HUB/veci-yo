import { Text, View } from "react-native";
import { ScreenLayout } from "@/shared/layouts";
import { OnboardingHeader } from "@/features/onboarding/components";
import {
  LoginFormulario,
  LoginHero,
  RecuperarPasswordModal,
} from "../components/acceso";
import { useRecuperacion } from "../hooks/useRecuperacion";
import { useNavegacionEntrada } from "@/shared/hooks";
import { useRoute, type RouteProp } from "@react-navigation/native";
import type { AuthStackParamList } from "@/shared/types/navigation";
import { ACTUALIZACION, VERSION } from "@/shared/version/version.generado";

export function LoginScreen() {
  const navigation = useNavegacionEntrada();
  const route = useRoute<RouteProp<AuthStackParamList, "Login">>();
  const recuperacion = useRecuperacion();

  return (
    <ScreenLayout padding={false} edges={["top", "bottom", "left", "right"]}>
      <OnboardingHeader />
      <View className="px-4 gap-4 pb-8">
        <LoginHero />
        <LoginFormulario
          onRegistrar={() => navigation.navigate("Registro")}
          onRecuperar={() => recuperacion.setVisible(true)}
          correoInicial={route.params?.correo}
        />
        {/* Para saber con qué versión se entra antes de abrir sesión (22/10/2026). */}
        <Text className="text-center text-xs text-gray-400">
          {`Versión ${VERSION}${ACTUALIZACION ? ` · actualización ${ACTUALIZACION}` : ""}`}
        </Text>
      </View>
      <RecuperarPasswordModal estado={recuperacion} />
    </ScreenLayout>
  );
}
