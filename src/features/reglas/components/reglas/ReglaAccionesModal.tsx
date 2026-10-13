import { Text, View } from "react-native";
import { Button, Modal } from "@/shared/components";
import type { DepartamentoRentaCorta } from "../../types/reglas";

export function ReglaAccionesModal({
  departamento,
  puedeLlamar,
  onClose,
  onCall,
  onReport,
}: {
  departamento: DepartamentoRentaCorta | null;
  puedeLlamar: boolean;
  onClose: () => void;
  onCall: (type: "anfitrion" | "administrador" | "propietario") => void;
  onReport: () => void;
}) {
  return (
    <Modal visible={!!departamento} onClose={onClose}>
      {puedeLlamar ? (
        <View className="gap-2.5">
          {/*
            Un botón por cada contacto **que tenga teléfono**. Salían los tres
            siempre: con el contacto oculto o vacío, pulsar solo cerraba la
            ventana, como un botón roto (13/10/2026).
          */}
          {departamento?.telAnfitrion ? (
            <Button
              variant="secondary"
              fullWidth
              onPress={() => onCall("anfitrion")}
            >
              1er contacto: llamar al anfitrión
            </Button>
          ) : null}
          {departamento?.telAdmin ? (
            <Button
              variant="secondary"
              fullWidth
              onPress={() => onCall("administrador")}
            >
              2do contacto: llamar al administrador
            </Button>
          ) : null}
          {departamento?.telPropietario ? (
            <Button
              variant="secondary"
              fullWidth
              onPress={() => onCall("propietario")}
            >
              3er contacto: llamar al propietario
            </Button>
          ) : null}
          {!departamento?.telAnfitrion &&
          !departamento?.telAdmin &&
          !departamento?.telPropietario ? (
            <Text className="text-sm text-center text-gray-500">
              Esta vivienda no tiene ningún teléfono de contacto visible.
            </Text>
          ) : null}
        </View>
      ) : (
        <Button variant="blue" fullWidth onPress={onReport}>
          <Text className="text-white font-bold">
            Reportar PQRS con el departamento {departamento?.departamento || ""}
          </Text>
        </Button>
      )}
    </Modal>
  );
}
