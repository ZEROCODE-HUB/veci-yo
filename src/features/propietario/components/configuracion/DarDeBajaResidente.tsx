import React from "react";
import { Text, View } from "react-native";
import { Button, Modal } from "@/shared/components";
import type { ResidenteDeUnidad } from "../../services/residentes.repo";

/** Confirmar que se da de baja a una persona de la vivienda. */
export function DarDeBajaResidente({
  residente,
  onConfirmar,
  onCancelar,
}: {
  residente: ResidenteDeUnidad | null;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  return (
    <Modal visible={!!residente} onClose={onCancelar} title="Eliminar residente">
      <View className="flex-col gap-4">
        <Text className="text-base text-center text-gray-900">
          ¿Seguro que deseas eliminar a{" "}
          <Text className="font-bold">{residente?.nombre}</Text>?
        </Text>
        <Button variant="danger" onPress={onConfirmar}>
          Eliminar
        </Button>
        <Button variant="ghost" onPress={onCancelar}>
          Cancelar
        </Button>
      </View>
    </Modal>
  );
}
