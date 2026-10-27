import React from "react";
import { Text, View } from "react-native";
import { theme } from "@/config";
import { Button, Modal } from "@/shared/components";

const SI = [
  "Al configurarte como residente, tendrás acceso al contenido detallado de las funcionalidades: Visitas, Correspondencia y Zonas comunes.",
  "Los demás co-residentes de la propiedad podrán saber que estas visualizando esta información.",
  "Si tienes inquilinos y no vives en esta propiedad, recomendamos configurarte como NO residente, para mantener la privacidad de los residentes, sin embargo tu como propietario seguirás teniendo acceso a la información de tu propiedad, y funcionalidades como: notificaciones y encuestas, cuadro de honor, reglamentos, chats de propietarios y encuestas para propietarios.",
];
const NO = [
  "Al configurarte como NO residente, dejaras de acceder al contenido de las funcionalidades: visitas, correspondencia y zonas comunes, sin embargo, tu como propietario seguirás teniendo acceso a la información de tu propiedad, y funcionalidades como: notificaciones y encuestas, cuadro de honor, reglamentos, chats de propietarios y encuestas para propietarios.",
  "Solo quienes sean residentes tendrán acceso al contenido de visitas, correspondencia y zonas comunes.",
  "Quienes configures como residentes sabrán si te has configurado o no como residente.",
];

/** Lo que significa declararse residente, o no residente, antes de confirmarlo. */
export function DeclaracionDeResidencia({
  visible,
  residente,
  onClose,
  onConfirmar,
}: {
  visible: boolean;
  /** Lo que se va a declarar: residente o no residente. */
  residente: boolean;
  onClose: () => void;
  onConfirmar: () => void;
}) {
  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={residente ? "Declaración de residencia" : "Declaración de no residencia"}
    >
      <View className="flex-col gap-4 items-center text-center py-2">
        <Text style={{ fontSize: 48 }}>{residente ? "🏠" : "🚫"}</Text>
        <View className="flex-col gap-3.5 w-full">
          {(residente ? SI : NO).map((p, i) => (
            <Text
              key={i}
              className="text-sm"
              style={{
                color: i === 0 ? theme.colors.text : theme.colors.textSecondary,
                fontWeight: i === 0 ? "600" : "400",
                lineHeight: 22,
                textAlign: "center",
              }}
            >
              {p}
            </Text>
          ))}
        </View>
        <Button variant="primary" fullWidth onPress={onConfirmar}>
          Confirmar
        </Button>
      </View>
    </Modal>
  );
}
