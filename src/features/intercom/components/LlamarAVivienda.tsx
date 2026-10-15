import React, { useState } from "react";
import { Text, View } from "react-native";
import { Button, Modal, Select } from "@/shared/components";
import { useUnidadesDisponibles } from "@/shared/hooks/useUnidadesDisponibles";
import { useUIStore } from "@/stores";
import { mensajeDeError } from "@/shared/utils";
import { llamarAVivienda } from "../services/intercom.repo";
import { useIntercomStore } from "../intercom-store";

/**
 * La portería llama a una vivienda por el intercomunicador (14/10/2026).
 * Solo si la administración le habilitó las llamadas: lo vuelve a comprobar la
 * base al llamar.
 */
export function LlamarAVivienda({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { unidades } = useUnidadesDisponibles();
  const { addToast } = useUIStore();
  const iniciar = useIntercomStore((s) => s.iniciar);
  const [unidadId, setUnidadId] = useState<string | null>(null);
  const [llamando, setLlamando] = useState(false);

  const opciones = unidades.map((u) => ({
    label: `${u.torre} · ${u.codigo}`,
    value: u.unidadId,
  }));

  const llamar = async () => {
    if (!unidadId) return;
    setLlamando(true);
    try {
      const id = await llamarAVivienda(unidadId);
      const elegida = unidades.find((u) => u.unidadId === unidadId);
      iniciar(id, true, `Vivienda ${elegida?.codigo ?? ""}`.trim());
      onClose();
    } catch (e) {
      addToast(mensajeDeError(e, "No se pudo llamar a la vivienda"), "error");
    } finally {
      setLlamando(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Intercomunicador">
      <View className="gap-4">
        <Text className="text-sm text-gray-700">
          Llama por internet a quien esté en la vivienda con la app abierta.
        </Text>
        <Select
          label="Vivienda"
          value={unidadId}
          options={opciones}
          onChange={(v) => setUnidadId(String(v))}
          placeholder="Elige la vivienda"
        />
        <Button fullWidth loading={llamando} disabled={!unidadId} onPress={llamar}>
          Llamar
        </Button>
      </View>
    </Modal>
  );
}
