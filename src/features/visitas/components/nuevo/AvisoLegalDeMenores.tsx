import React from "react";
import { Text, View } from "react-native";
import { Button, Modal } from "@/shared/components";

/** La ventana que sale al marcar un acompañante como menor de edad. */
export function AvisoLegalDeMenores({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} onClose={onClose} title="Aviso legal — menores de edad">
      <View className="items-center gap-4">
        <Text style={{ fontSize: 40 }}>👶⚠️</Text>
        <Text className="text-base text-gray-900 text-center" style={{ lineHeight: 24 }}>
          Si el invitado es menor de edad, debe ingresar con su padre/madre/tutor
          legal con la documentación respectiva. Este condominio está comprometido
          en proteger la integridad de los menores de edad y prevenir la
          explotación comercial sexual de las niñas, niños y adolescentes.
        </Text>
        <Button fullWidth onPress={onClose}>
          Entendido
        </Button>
      </View>
    </Modal>
  );
}
