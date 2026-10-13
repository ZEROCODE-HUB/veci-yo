import React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input, Modal, Select } from "@/shared/components";
import { View } from "react-native";
import { depositSchema } from "../../schemas";
import type { Deposito, Unidad } from "@/stores/admin-store";
import type { DepositFormValues } from "../../types";

type Props = {
  visible: boolean;
  editing: Deposito | null;
  initial: DepositFormValues;
  units: Unidad[];
  onClose: () => void;
  onSave: (form: DepositFormValues) => void;
};

export function DepositoFormModal({
  visible,
  editing,
  initial,
  units,
  onClose,
  onSave,
}: Props) {
  const { control, handleSubmit, reset, watch } = useForm<DepositFormValues>({
    resolver: zodResolver(depositSchema),
    defaultValues: initial,
  });

  React.useEffect(() => {
    if (visible) reset(initial);
  }, [editing?.id, initial, reset, visible]);

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={editing ? "Editar deposito" : "Nuevo deposito"}
    >
      <View className="gap-3">
        <Controller
          control={control}
          name="codigo"
          render={({ field, fieldState }) => (
            <Input
              label="Codigo"
              value={field.value}
              onChangeText={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="ubicacion"
          render={({ field, fieldState }) => (
            <Input
              label="Ubicacion"
              value={field.value}
              onChangeText={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="unidadId"
          render={({ field }) => (
            <Select
              label="Departamento"
              value={field.value}
              /*
                El uuid de la vivienda, que es lo que guarda la columna. Iba
                el número de presentación --un hash del uuid-- y la base
                respondía «invalid input syntax for type uuid» (13/10/2026).
              */
              options={[
                { value: "", label: "Sin departamento" },
                ...units.map((unit) => ({
                  value: unit.uuid ?? "",
                  label: unit.codigo,
                })),
              ]}
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
