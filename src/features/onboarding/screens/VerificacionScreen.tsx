import { useNavigation } from "@react-navigation/native";
import { PageHeader, ScreenLayout } from "@/shared/layouts";
import {
  VerificacionContenido,
  VerificacionExitoModal,
} from "../components/verificacion";
import { useVerificacion } from "../hooks/useVerificacion";

export function VerificacionScreen() {
  const navigation = useNavigation<any>();
  const estado = useVerificacion();

  const volver = () => {
    if (estado.stepIndex === 0) navigation.goBack();
    else estado.setStepIndex((index) => index - 1);
  };

  return (
    <ScreenLayout withScroll={false} withToast={false}>
      <PageHeader title="Verificación de identidad" onBack={volver} />
      <VerificacionContenido estado={estado} />
      <VerificacionExitoModal estado={estado} />
    </ScreenLayout>
  );
}
