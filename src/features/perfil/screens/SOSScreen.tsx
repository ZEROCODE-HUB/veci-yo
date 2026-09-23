import React, { useEffect } from "react";
import { View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SosAlarma, type EstadoAlarma } from "../components/sos";
import { useSos } from "../hooks/useSos";

/**
 * Llegar a esta pantalla **es** pedir auxilio, así que la alarma se dispara al
 * entrar. Antes los dos botones hacían `navigation.goBack()` y no pasaba nada
 * en ningún sitio.
 */
export function SOSScreen() {
  const navigation = useNavigation();
  const { activar, activando, fallo, alarma, cerrar } = useSos();

  useEffect(() => {
    activar();
    // Una sola vez: `activar` es estable y volver a llamarlo abriría una
    // segunda alarma por el mismo suceso.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      <SosAlarma
        estado={activando ? { tipo: "avisando" } : estado}
        onCancelar={() => salir("cancelada")}
        onGuardia={() => salir("atendida")}
      />
    </View>
  );
}
