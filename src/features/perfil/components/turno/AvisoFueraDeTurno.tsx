import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { theme } from "@/config";
import { Button, Modal } from "@/shared/components";

/**
 * El aviso al guardia que entra fuera de su turno: le dice su horario y que,
 * hasta que empiece, solo puede usar su perfil (Para Claude 164, 29/10/2026).
 * Sale cada vez que pasa a estar fuera de turno: al entrar, al cambiar a ese
 * rol o al terminar el turno.
 */
export function AvisoFueraDeTurno({
  fueraDeTurno,
  horario,
}: {
  fueraDeTurno: boolean;
  horario: string[];
}) {
  const [visible, setVisible] = useState(fueraDeTurno);
  useEffect(() => {
    setVisible(fueraDeTurno);
  }, [fueraDeTurno]);

  return (
    <Modal visible={visible} onClose={() => setVisible(false)} title="Estás fuera de tu turno">
      <View className="gap-3">
        <Text className="text-sm text-gray-700" style={{ lineHeight: 20 }}>
          Tu horario de turno es:
        </Text>
        <View className="rounded-xl p-3 gap-1" style={{ backgroundColor: theme.colors.warningSoft }}>
          {horario.map((linea) => (
            <Text key={linea} className="text-sm font-semibold" style={{ color: theme.colors.badgeAmberText }}>
              {linea}
            </Text>
          ))}
        </View>
        <Text className="text-sm text-gray-700" style={{ lineHeight: 20 }}>
          Hasta que empiece tu turno solo puedes entrar a tu perfil. Cuando empiece, se abre todo solo.
        </Text>
        <Button variant="primary" onPress={() => setVisible(false)}>
          Entendido
        </Button>
      </View>
    </Modal>
  );
}
