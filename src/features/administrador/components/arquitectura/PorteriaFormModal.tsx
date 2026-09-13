import React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input, Modal } from "@/shared/components";
import { View } from "react-native";
import type { Porteria } from "@/stores/admin-store";
import { porteriaSchema } from "../../schemas";
import type { PorteriaFormValues } from "../../types";

type Props = {
  visible: boolean;
  editing: Porteria | null;
  initial: PorteriaFormValues;
  onClose: () => void;
  onSave: (form: PorteriaFormValues) => void;
};

export function PorteriaFormModal({
  visible,
  editing,
  initial,
  onClose,
  onSave,
}: Props) {
  const { control, handleSubmit, reset, watch } = useForm<PorteriaFormValues>({
    resolver: zodResolver(porteriaSchema),
    defaultValues: initial,
  });

  React.useEffect(() => {
    if (visible) reset(initial);
  }, [editing?.id, initial, reset, visible]);

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={editing ? "Editar porteria" : "Nueva porteria"}
    >
      <View className="gap-3">
        <Controller
          control={control}
          name="nombre"
          render={({ field }) => (
            <Input
              label="Nombre"
              value={field.value}
              onChangeText={field.onChange}
              placeholder="Ej: Principal"
            />
          )}
        />
        <Controller
          control={control}
          name="ubicacion"
          render={({ field }) => (
            <Input
              label="Ubicacion"
              value={field.value}
              onChangeText={field.onChange}
              placeholder="Ej: Entrada principal"
            />
          )}
        />
        <Controller
          control={control}
          name="telefono"
          render={({ field }) => (
            <Input
              label="Telefono (opcional)"
              value={field.value}
              onChangeText={field.onChange}
              placeholder="+593 999999999"
            />
          )}
        />
        <Button
          fullWidth
          disabled={!watch("nombre").trim()}
          onPress={() => void handleSubmit(onSave)()}
        >
          Guardar
        </Button>
      </View>
    </Modal>
  );
}
