import React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, CampoTelefono, Input, Modal, Select } from "@/shared/components";
import { View } from "react-native";
import type { Porteria } from "@/stores/admin-store";
import { porteriaSchema } from "../../schemas";
import { TIPO_PORTERIA } from "@/shared/constants/enums";
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
  const { control, handleSubmit, reset, watch, setValue } =
    useForm<PorteriaFormValues>({
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
      title={editing ? "Editar portería" : "Nueva portería"}
    >
      <View className="gap-3">
        <Controller
          control={control}
          name="nombre"
          render={({ field, fieldState }) => (
            <Input
              label="Nombre"
              value={field.value}
              onChangeText={field.onChange}
              placeholder="Ej: Principal"
            error={fieldState.error?.message}
            />
          )}
        />
        {/*
          La clase de acceso. Hasta el 02/10/2026 este campo no existia y la
          pantalla creaba **todas** las porterias como peatonales, escrito a
          fuego, aunque la base admite las dos desde la primera migracion.
        */}
        <Controller
          control={control}
          name="tipo"
          render={({ field }) => (
            <Select
              label="Tipo de acceso"
              value={field.value}
              options={Object.entries(TIPO_PORTERIA).map(([value, label]) => ({
                value,
                label,
              }))}
              onChange={(valor) => field.onChange(String(valor))}
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
              placeholder="Ej: Entrada principal"
            error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="telefono"
          render={({ fieldState }) => (
            /*
              Con su pais. `porteria.codigo_pais` existe desde el primer dia y
              **nadie la escribia**; el marcador de ejemplo era «+593», que es
              Ecuador, de cuando el prototipo se copio de otro sitio.

              Llamar a la garita es lo mas urgente que hay en esta aplicacion,
              y un numero sin pais no se puede marcar desde fuera.
            */
            <CampoTelefono
              label="Teléfono (opcional)"
              codigoPais={watch("codigoPais")}
              onCodigoPaisChange={(codigo) =>
                setValue("codigoPais", codigo, { shouldValidate: true })
              }
              telefono={watch("telefono")}
              onTelefonoChange={(numero) =>
                setValue("telefono", numero, { shouldValidate: true })
              }
            error={fieldState.error?.message}
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
