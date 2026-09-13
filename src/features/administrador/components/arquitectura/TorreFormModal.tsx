import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input, Modal } from "@/shared/components";
import { Text, View } from "react-native";
import { towerSchema } from "../../schemas";
import type { Torre } from "@/stores/admin-store";
import { emptyTower, type TowerFormValues } from "../../types";
import { TorreFieldGrid } from "./TorreFieldGrid";

type Props = {
  visible: boolean;
  editing: Torre | null;
  nextNumber: number;
  initial: TowerFormValues;
  onClose: () => void;
  onSave: (form: TowerFormValues) => void;
};

export function TorreFormModal({
  visible,
  editing,
  nextNumber,
  initial,
  onClose,
  onSave,
}: Props) {
  const { control, handleSubmit, reset, watch } = useForm<TowerFormValues>({
    resolver: zodResolver(towerSchema),
    defaultValues: emptyTower,
  });

  useEffect(() => {
    if (visible) reset(initial);
  }, [editing?.id, reset, visible]);

  const from = Number(watch("nomenclaturaDesde"));
  const to = Number(watch("nomenclaturaHasta"));
  const preview =
    !editing && from > 0 && to >= from
      ? `Se generaran ${to - from + 1} unidades: ${from} a ${to}`
      : null;

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={editing ? "Editar Torre" : "Nueva Torre"}
    >
      <View className="gap-3">
        <Text className="text-sm text-gray-500 text-center">
          Torre N: {editing?.numero || nextNumber}
        </Text>
        <Controller
          control={control}
          name="nombre"
          render={({ field }) => (
            <Input
              label="Nombre de la torre"
              value={field.value}
              onChangeText={field.onChange}
              placeholder="Ej: Torre A"
            />
          )}
        />
        {!editing && (
          <>
            <Controller
              control={control}
              name="tipo"
              render={({ field }) => (
                <Input
                  label="Tipo de nomenclatura"
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder="Ej: 101, 102, 103..."
                />
              )}
            />
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Controller
                  control={control}
                  name="nomenclaturaDesde"
                  render={({ field }) => (
                    <Input
                      label="Desde (numero)"
                      value={field.value}
                      onChangeText={field.onChange}
                      placeholder="101"
                      type="numeric"
                    />
                  )}
                />
              </View>
              <View className="flex-1">
                <Controller
                  control={control}
                  name="nomenclaturaHasta"
                  render={({ field }) => (
                    <Input
                      label="Hasta (numero)"
                      value={field.value}
                      onChangeText={field.onChange}
                      placeholder="105"
                      type="numeric"
                    />
                  )}
                />
              </View>
            </View>
            {preview && (
              <View className="rounded-xl bg-blue-50 p-3">
                <Text className="text-sm text-blue-700 text-center">
                  {preview}
                </Text>
              </View>
            )}
          </>
        )}
        <TorreFieldGrid control={control} />
        <Button
          fullWidth
          onPress={() => void handleSubmit(onSave)()}
          disabled={!watch("nombre").trim()}
        >
          {editing ? "Guardar cambios" : "Crear torre"}
        </Button>
      </View>
    </Modal>
  );
}
