import React from "react";
import { Text, View } from "react-native";
import { theme } from "@/config";
import { Button } from "@/shared/components";
import { ESTILO_DE_SECCION } from "./SeccionDeConfiguracion";

/** La vivienda sin renta corta activa: ofrece suscribirse, si el edificio lo autoriza. */
export function SinSuscripcion({
  autorizada,
  onSuscribirse,
}: {
  autorizada: boolean;
  onSuscribirse: () => void;
}) {
  return (
    <View className="rounded-2xl p-5 text-center" style={ESTILO_DE_SECCION}>
      <Text className="text-base text-gray-900 text-center mb-3">
        Esta propiedad no tiene una suscripción activa para Huéspedes Temporales.
      </Text>
      {/*
        La autorizacion del edificio SI bloquea —la base rechaza el alta— asi
        que el boton no se ofrece: pulsarlo solo daria un error. Distinto de los
        limites numericos, que advierten (KT 4.1 paso 5).
      */}
      {autorizada ? (
        <Button variant="primary" onPress={onSuscribirse}>
          Suscribirse
        </Button>
      ) : (
        <View className="rounded-xl p-3" style={{ backgroundColor: theme.colors.warningSoft }}>
          <Text
            className="text-xs text-center"
            style={{ color: theme.colors.badgeAmberText, lineHeight: 18 }}
          >
            Este edificio no autoriza la renta corta en esta vivienda. La
            excepción la concede la administración del condominio.
          </Text>
        </View>
      )}
    </View>
  );
}
