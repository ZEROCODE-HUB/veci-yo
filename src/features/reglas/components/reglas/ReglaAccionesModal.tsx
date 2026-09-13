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
          <Button
            variant="secondary"
            fullWidth
            onPress={() => onCall("anfitrion")}
          >
            1er Contacto: Llamar Anfitrión
          </Button>
          <Button
            variant="secondary"
            fullWidth
            onPress={() => onCall("administrador")}
          >
            2do Contacto: Llamar Administrador
          </Button>
          <Button
            variant="secondary"
            fullWidth
            onPress={() => onCall("propietario")}
          >
            3er Contacto: Llamar Propietario
          </Button>
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
