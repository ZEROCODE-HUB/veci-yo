import React, { useState } from "react";
import { Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Button } from "./Button";
import { Modal } from "./Modal";

interface Props {
  /** El enlace recién emitido. `null`: no hay nada que enseñar. */
  enlace: string | null;
  /** A quién se invitó, para decirlo. */
  nombre?: string;
  onCerrar: () => void;
}

/**
 * El enlace de una invitación recién emitida.
 *
 * Solo vuelve mientras el envío de correo esté apagado: con él encendido el
 * enlace vive en el correo y esto no llega a abrirse.
 *
 * Existe porque la administración lo recibía en un **aviso de tres segundos**
 * --«Invitación creada. Enlace: https://…»-- que no se puede copiar ni volver
 * a leer, y es de un solo uso: perdido el aviso, perdida la invitación
 * (13/10/2026). El propietario ya tenía su ventana; esta es la misma para
 * todos.
 */
export function EnlaceDeInvitacion({ enlace, nombre, onCerrar }: Props) {
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    if (!enlace) return;
    await Clipboard.setStringAsync(enlace);
    setCopiado(true);
  };

  const cerrar = () => {
    setCopiado(false);
    onCerrar();
  };

  return (
    <Modal
      visible={Boolean(enlace)}
      onClose={cerrar}
      title="Enlace de la invitación"
    >
      <View className="gap-3">
        <Text className="text-sm text-gray-500">
          {nombre ? `La invitación de ${nombre} está creada. ` : ""}
          El envío de correo está apagado en este entorno: copia este enlace y
          pásaselo. Es de un solo uso y solo sirve para su correo.
        </Text>
        <Text selectable className="text-xs text-gray-900">
          {enlace}
        </Text>
        <Button variant="secondary" fullWidth onPress={() => void copiar()}>
          <Text>{copiado ? "✓ Copiado" : "Copiar enlace"}</Text>
        </Button>
        <Button variant="primary" fullWidth onPress={cerrar}>
          <Text>Listo</Text>
        </Button>
      </View>
    </Modal>
  );
}
