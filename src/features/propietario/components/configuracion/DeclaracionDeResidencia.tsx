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
  "Al configurarte como NO residente, como propietario sigues teniendo acceso a la información de tu propiedad: visitas, correspondencia y zonas comunes, con sus avisos, y también notificaciones y encuestas, cuadro de honor, reglamentos, chats de propietarios y encuestas para propietarios.",
  "Si la vivienda tiene inquilino líder, la correspondencia, las visitas y las zonas comunes son de quien vive ahí: no las verás mientras esté.",
  "Quienes configures como residentes sabrán si te has configurado o no como residente.",
];

/** Lo que significa declararse residente, o no residente, antes de confirmarlo. */
export function DeclaracionDeResidencia({
  visible,
  residente,
  onClose,
  onConfirmar,
  guardando = false,
  motivoQueLoImpide = null,
}: {
  visible: boolean;
  /** Mientras se guarda: la ventana espera abierta, con el botón girando. */
  guardando?: boolean;
  /** Lo que se va a declarar: residente o no residente. */
  residente: boolean;
  onClose: () => void;
  onConfirmar: () => void;
  /**
   * Por qué no puede declararse residente ahora --un inquilino líder activo,
   * la vivienda en alquiler-- (17/11/2026). La base lo rechazaría igual: en
   * vez de un error, se explica qué hacer y no se ofrece «Confirmar».
   */
  motivoQueLoImpide?: string | null;
}) {
  const impedido = residente && Boolean(motivoQueLoImpide);
  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={residente ? "Declaración de residencia" : "Declaración de no residencia"}
    >
      <View className="flex-col gap-4 items-center text-center py-2">
        <Text style={{ fontSize: 48 }}>{residente ? "🏠" : "🚫"}</Text>
        {impedido ? (
          <Text
            className="text-sm"
            style={{ color: theme.colors.text, fontWeight: "600", lineHeight: 22, textAlign: "center" }}
          >
            {motivoQueLoImpide}
          </Text>
        ) : (
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
        )}
        {impedido ? (
          <Button variant="primary" fullWidth onPress={onClose}>
            Entendido
          </Button>
        ) : (
          <Button variant="primary" fullWidth onPress={onConfirmar} loading={guardando}>
            Confirmar
          </Button>
        )}
      </View>
    </Modal>
  );
}
