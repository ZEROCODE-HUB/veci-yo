import { PageHeader, ScreenLayout } from "@/shared/layouts";
import {
  VerificacionContenido,
  VerificacionExitoModal,
} from "../components/verificacion";
import { useVerificacion } from "../hooks/useVerificacion";
import { useNavegacion } from "@/shared/hooks";

/*
  Sin cabecera encima, así que el borde de arriba lo pone la pantalla: sin él,
  el título quedaba bajo la muesca y la hora del teléfono (auditoría de
  responsividad, 24/10/2026). Donde sí hay cabecera no suma nada, porque solo
  aparta lo que de verdad pisa la zona insegura.
*/
const BORDES: ("top" | "left" | "right")[] = ["top", "left", "right"];

export function VerificacionScreen() {
  const navigation = useNavegacion();
  const estado = useVerificacion();

  const volver = () => {
    if (estado.stepIndex === 0) navigation.goBack();
    else estado.setStepIndex((index) => index - 1);
  };

  return (
    <ScreenLayout withScroll={false} edges={BORDES}>
      <PageHeader title="Verificación de identidad" onBack={volver} />
      <VerificacionContenido estado={estado} />
      <VerificacionExitoModal estado={estado} />
    </ScreenLayout>
  );
}
