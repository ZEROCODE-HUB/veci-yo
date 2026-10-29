import React, { useState } from "react";
import { Text, View } from "react-native";
import { theme } from "@/config";
import { Button, Checkbox } from "@/shared/components";
import { ESTILO_DE_SECCION } from "./SeccionDeConfiguracion";

/**
 * La vivienda sin renta corta activa: ofrece suscribirse, si el edificio lo
 * autoriza.
 *
 * Una vivienda o es para vivir o es para alquilar por noches (29/10/2026,
 * D-70): solo la activa un propietario que no vive en ella, y lo confirma
 * aquí. El inquilino líder vive en la vivienda, así que no puede.
 */
export function SinSuscripcion({
  autorizada,
  esPropietario,
  onSuscribirse,
}: {
  autorizada: boolean;
  esPropietario: boolean;
  /** Prepara la vivienda («no vivo aquí») y abre el pago; devuelve el motivo si no se pudo. */
  onSuscribirse: () => Promise<string | null>;
}) {
  const [noVivo, setNoVivo] = useState(false);
  const [preparando, setPreparando] = useState(false);
  const [motivo, setMotivo] = useState<string | null>(null);

  return (
    <View className="rounded-2xl p-5 gap-3" style={ESTILO_DE_SECCION}>
      <Text className="text-base text-gray-900 text-center">
        Esta propiedad no tiene una suscripción activa para Huéspedes Temporales.
      </Text>
      {/*
        La autorizacion del edificio SI bloquea —la base rechaza el alta— asi
        que el boton no se ofrece: pulsarlo solo daria un error. Distinto de los
        limites numericos, que advierten (KT 4.1 paso 5).
      */}
      {!autorizada ? (
        <View className="rounded-xl p-3" style={{ backgroundColor: theme.colors.warningSoft }}>
          <Text className="text-xs text-center" style={{ color: theme.colors.badgeAmberText, lineHeight: 18 }}>
            Este edificio no autoriza la renta corta en esta vivienda. La
            excepción la concede la administración del condominio.
          </Text>
        </View>
      ) : !esPropietario ? (
        <View className="rounded-xl p-3" style={{ backgroundColor: theme.colors.warningSoft }}>
          <Text className="text-xs text-center" style={{ color: theme.colors.badgeAmberText, lineHeight: 18 }}>
            La renta corta solo la activa el propietario, y solo si nadie vive en la vivienda: o se vive en ella o se alquila por noches.
          </Text>
        </View>
      ) : (
        <>
          <Text className="text-xs text-gray-500" style={{ lineHeight: 18 }}>
            Una vivienda o es para vivir o es para alquilar por noches. Para activarla, nadie puede figurar como que vive en ella: tú dejas de ser residente y quedas como anfitrión primario.
          </Text>
          <Checkbox checked={noVivo} onChange={setNoVivo} label="Confirmo que no vivo en esta vivienda" />
          {motivo ? <Text className="text-sm text-danger">{motivo}</Text> : null}
          <Button
            variant="primary"
            disabled={!noVivo || preparando}
            loading={preparando}
            onPress={async () => {
              setPreparando(true);
              setMotivo(await onSuscribirse());
              setPreparando(false);
            }}
          >
            Suscribirse
          </Button>
        </>
      )}
    </View>
  );
}
