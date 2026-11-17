import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { correoPorConfirmar, olvidarCorreoPorConfirmar } from "@/shared/services/correoPorConfirmar";
import { CodigoDeConfirmacion } from "../components/registro/CodigoDeConfirmacion";
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
  /*
    Se registró y fue a buscar el código a su correo; si el celular cerró la
    app mientras tanto, vuelve aquí y se le pide el código, que la deja dentro
    (17/11/2026). Solo se recuerda el correo, nunca la contraseña.
  */
  const [pendiente, setPendiente] = useState<string | null>(null);
  useEffect(() => {
    let vigente = true;
    void correoPorConfirmar().then((correo) => vigente && setPendiente(correo));
    return () => {
      vigente = false;
    };
  }, []);
  const correoInicial = route.params?.correo ?? pendiente ?? undefined;

  return (
    <ScreenLayout padding={false} edges={["top", "bottom", "left", "right"]}>
      <OnboardingHeader />
      <View className="px-4 gap-4 pb-8">
        <LoginHero />
        {pendiente && !route.params?.correo ? (
          <CodigoDeConfirmacion
            correo={pendiente}
            onCambiarDeCorreo={() => {
              setPendiente(null);
              void olvidarCorreoPorConfirmar();
            }}
          />
        ) : null}
        <LoginFormulario
          onRegistrar={() => navigation.navigate("Registro")}
          onRecuperar={() => recuperacion.setVisible(true)}
          correoInicial={correoInicial}
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
