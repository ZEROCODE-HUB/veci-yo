import React, { useState } from "react";
import { View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  SosAlarma,
  SosConfirmacion,
  type EstadoAlarma,
} from "../components/sos";
import { useSos } from "../hooks/useSos";

/**
 * Pedir auxilio.
 *
 * La alarma se disparaba **al entrar**, con el comentario de que llegar aquí
 * ya era pedirla. Y se llega desde un renglón de «Perfil» pegado a
 * «Configuración», así que un toque mal dado sonaba de verdad en el teléfono
 * de todos los guardias de turno. Ahora hay un paso de confirmación
 * (`SosConfirmacion`), decidido con el cliente el 29/09/2026.
 *
 * Antes de todo eso, los dos botones hacían `navigation.goBack()` y no pasaba
 * nada en ningún sitio.
 */
export function SOSScreen() {
  const navigation = useNavigation();
  const { activar, activando, fallo, alarma, cerrar } = useSos();
  const [pedida, setPedida] = useState(false);

  const confirmar = () => {
    // Una sola vez: una segunda llamada abriría otra alarma por el mismo
    // suceso, y el botón desaparece en cuanto `pedida` pasa a true.
    setPedida(true);
    activar();
  };

  const estado: EstadoAlarma = alarma
    ? { tipo: "activa", avisados: alarma.avisados }
    : fallo
      ? { tipo: "fallo" }
      : { tipo: "avisando" };

  const salir = async (motivo: "cancelada" | "atendida") => {
    // Si la alarma no llegó a crearse no hay nada que cerrar, y quien está
    // aquí no tiene por qué esperar a que el cierre responda.
    if (alarma) await cerrar(motivo).catch(() => undefined);
    navigation.goBack();
  };

  return (
    <View className="flex-1 bg-gray-50">
      {pedida ? (
        <SosAlarma
          estado={activando ? { tipo: "avisando" } : estado}
          onCancelar={() => salir("cancelada")}
          onGuardia={() => salir("atendida")}
        />
      ) : (
        <SosConfirmacion
          onConfirmar={confirmar}
          onCancelar={() => navigation.goBack()}
        />
      )}
    </View>
  );
}
