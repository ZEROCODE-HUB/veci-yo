import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input, Modal, Toggle } from "@/shared/components";
import { Text, TextInput, View } from "react-native";
import { zonaComunSchema } from "../../schemas/zonas.schema";
import type { ZonaComunFormValues } from "../../types/zonas";

export function ZonaComunFormModal({
  visible,
  editing,
  initial,
  onClose,
  onSave,
}: {
  visible: boolean;
  editing: boolean;
  initial: ZonaComunFormValues;
  onClose: () => void;
  onSave: (values: ZonaComunFormValues) => void;
}) {
  const { control, handleSubmit, reset } = useForm<ZonaComunFormValues>({
    resolver: zodResolver(zonaComunSchema),
    defaultValues: initial,
  });
  useEffect(() => {
    if (visible) reset(initial);
  }, [initial, reset, visible]);
  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={editing ? "Editar Area" : "Nueva Area Comun"}
    >
      <View className="gap-[14px]">
        <Controller control={control} name="nombre" render={({ field }) => (
          <Input label="Nombre del area" value={field.value} onChangeText={field.onChange} placeholder="Ej: Piscina" />
        )} />
        <Controller control={control} name="id" render={({ field }) => (
          <View>
            <Text className="text-sm text-gray-500 mb-1.5 font-medium">
              ID unico (solo para nueva area)
            </Text>
            <TextInput
              value={field.value}
              onChangeText={field.onChange}
              placeholder="Ej: nueva-piscina"
              editable={!editing}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-base text-gray-900"
            />
          </View>
        )} />
        <Controller control={control} name="descripcion" render={({ field }) => (
          <Input label="Descripcion" value={field.value} onChangeText={field.onChange} placeholder="Descripcion del area" multiline rows={2} />
        )} />
        <Controller control={control} name="horariosDisponibles" render={({ field }) => (
          <Input
            label="Horarios disponibles (separados por coma)"
            value={field.value}
            onChangeText={field.onChange}
            placeholder="08:00 - 10:00, 10:00 - 12:00"
          />
        )} />
        <View className="flex-row gap-3">
          <Controller control={control} name="duracionPermitida" render={({ field }) => (
            <Input label="Duracion permitida (horas)" value={field.value} onChangeText={field.onChange} type="numeric" style={{ flex: 1 }} />
          )} />
          <Controller control={control} name="capacidadMaxima" render={({ field }) => (
            <Input label="Capacidad maxima" value={field.value} onChangeText={field.onChange} type="numeric" style={{ flex: 1 }} />
          )} />
        </View>
        <Controller control={control} name="reglas" render={({ field }) => (
          <Input label="Reglas / Restricciones" value={field.value} onChangeText={field.onChange} placeholder="Reglas del area" multiline rows={2} />
        )} />
        <Controller control={control} name="emoji" render={({ field }) => (
          <Input label="Emoji" value={field.value} onChangeText={field.onChange} placeholder="🏊" />
        )} />
        <Controller control={control} name="requiereAprobacion" render={({ field }) => (
          <View className="flex-row items-center justify-between py-2">
            <Text className="text-sm text-gray-900">Requiere aprobacion manual</Text>
            <Toggle value={field.value} onChange={field.onChange} />
          </View>
        )} />
        <Button fullWidth onPress={() => void handleSubmit(onSave)()}>
          {editing ? "Guardar cambios" : "Crear area"}
        </Button>
      </View>
    </Modal>
  );
}
