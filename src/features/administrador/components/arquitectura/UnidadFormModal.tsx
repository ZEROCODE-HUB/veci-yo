import React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input, Modal, Select } from "@/shared/components";
import { View } from "react-native";
import { unitSchema } from "../../schemas";
import type { UnitFormValues } from "../../types";
import type { Unidad } from "@/stores/admin-store";

const UNIT_STATES = [
  "disponible",
  "invitado",
  "aceptado",
  "config-pendiente",
  "config-completado",
];

type Props = {
  visible: boolean;
  editing: Unidad | null;
  initial: UnitFormValues;
  onClose: () => void;
  onSave: (form: UnitFormValues) => void;
};

export function UnidadFormModal({
  visible,
  editing,
  initial,
  onClose,
  onSave,
}: Props) {
  const { control, handleSubmit, reset, watch } = useForm<UnitFormValues>({
    resolver: zodResolver(unitSchema),
    defaultValues: initial,
  });

  React.useEffect(() => {
    if (visible) reset(initial);
  }, [editing?.id, initial, reset, visible]);

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={editing ? "Editar departamento" : "Agregar departamento"}
    >
      <View className="gap-3">
        <Controller
          control={control}
          name="codigo"
          render={({ field }) => (
            <Input
              label="Codigo"
              value={field.value}
              onChangeText={field.onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="piso"
          render={({ field }) => (
            <Input
              label="Piso"
              value={field.value}
              onChangeText={field.onChange}
              type="numeric"
            />
          )}
        />
        <Controller
          control={control}
          name="estado"
          render={({ field }) => (
            <Select
              label="Estado"
              value={field.value}
              options={UNIT_STATES}
              onChange={field.onChange}
            />
          )}
        />
        <Button
          fullWidth
          disabled={!watch("codigo")}
          onPress={() => void handleSubmit(onSave)()}
        >
          Guardar
        </Button>
      </View>
    </Modal>
  );
}
