import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input, Modal } from "@/shared/components";
import { Text, View } from "react-native";
import { towerSchema } from "../../schemas";
import type { Torre } from "@/stores/admin-store";
import { emptyTower, type TowerFormValues } from "../../types";
import { TorreFieldGrid } from "./TorreFieldGrid";
import { rangoPedido } from "../../services/arquitectura.repo";
import { useParametrosDeLaBase } from "@/shared/hooks";

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
  const parametrosDeLaBase = useParametrosDeLaBase();
  const { control, handleSubmit, reset, watch } = useForm<TowerFormValues>({
    resolver: zodResolver(towerSchema),
    defaultValues: emptyTower,
  });

  useEffect(() => {
    if (visible) reset(initial);
  }, [initial, reset, visible]);

  const from = Number(watch("nomenclaturaDesde"));
  const to = Number(watch("nomenclaturaHasta"));
  // Lo mismo que hará el guardado: la vista previa no promete lo que no sale.
  // Con el mismo tope (`torre_viviendas_maximo`); sin él todavía, no se
  // promete nada.
  const pedido = parametrosDeLaBase.listo
    ? rangoPedido(
        watch("nomenclaturaDesde"),
        watch("nomenclaturaHasta"),
        parametrosDeLaBase.numero("torre_viviendas_maximo"),
      )
    : null;
  const preview = editing || !pedido
    ? null
    : pedido.motivo ||
      (pedido.codigos.length
        ? `Se generarán ${pedido.codigos.length} viviendas: ${from} a ${to}`
        : null);

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
          render={({ field, fieldState }) => (
            <Input
              label="Nombre de la torre"
              value={field.value}
              onChangeText={field.onChange}
              placeholder="Ej: Torre A"
            error={fieldState.error?.message}
            />
          )}
        />
        {!editing && (
          <>
            {/*
              "Tipo de nomenclatura" no se guardaba en ningun sitio --no es
              columna de `torre` ni lo escribe `torreHaciaFila`-- y el mismo
              campo aparecia otra vez, como desplegable, dentro de
              `TorreFieldGrid`: dos controles sobre la misma clave del
              formulario. Nada genera codigos de vivienda a partir de el. El
              rango de nomenclatura, que si se guarda, se queda.
            */}
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Controller
                  control={control}
                  name="nomenclaturaDesde"
                  render={({ field, fieldState }) => (
                    <Input
                      label="Desde (número)"
                      value={field.value}
                      onChangeText={field.onChange}
                      placeholder="101"
                      type="numeric"
                    error={fieldState.error?.message}
                    />
                  )}
                />
              </View>
              <View className="flex-1">
                <Controller
                  control={control}
                  name="nomenclaturaHasta"
                  render={({ field, fieldState }) => (
                    <Input
                      label="Hasta (número)"
                      value={field.value}
                      onChangeText={field.onChange}
                      placeholder="105"
                      type="numeric"
                    error={fieldState.error?.message}
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
