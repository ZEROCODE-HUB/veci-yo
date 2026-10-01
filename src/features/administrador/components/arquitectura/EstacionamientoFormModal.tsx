import React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input, Modal, Select } from "@/shared/components";
import { View } from "react-native";
import { estacionamientoSchema } from "../../schemas";
import type { Unidad } from "@/stores/admin-store";
import type {
  EstacionamientoDeTorre,
  EstacionamientoFormValues,
} from "../../types";

type Props = {
  visible: boolean;
  editing: EstacionamientoDeTorre | null;
  initial: EstacionamientoFormValues;
  units: Unidad[];
  onClose: () => void;
  onSave: (form: EstacionamientoFormValues) => void;
};

/**
 * Dar de alta una cochera.
 *
 * No existía. La ficha de la torre pedía «cocheras de visitas» y «cocheras
 * privadas», pero ese número no creaba nada: en todo el condominio había una
 * sola cochera de visita, metida a mano, y la portada decía «1 de 1
 * disponibles» sin que nadie pudiera añadir otra.
 *
 * La de visita no es de nadie, así que el departamento solo se pide cuando es
 * privada: una cochera de visita con dueño sería una privada mal etiquetada, y
 * es el tipo lo que decide si cuenta para el contador de la portada.
 */
export function EstacionamientoFormModal({
  visible,
  editing,
  initial,
  units,
  onClose,
  onSave,
}: Props) {
  const { control, handleSubmit, reset, watch } =
    useForm<EstacionamientoFormValues>({
      resolver: zodResolver(estacionamientoSchema),
      defaultValues: initial,
    });

  React.useEffect(() => {
    if (visible) reset(initial);
  }, [editing?.uuid, initial, reset, visible]);

  const esPrivada = watch("tipo") === "privado";

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={editing ? "Editar cochera" : "Nueva cochera"}
    >
      <View className="gap-3">
        <Controller
          control={control}
          name="codigo"
          render={({ field }) => (
            <Input
              label="Código"
              value={field.value}
              onChangeText={field.onChange}
              placeholder="Ej. V-02"
            />
          )}
        />
        <Controller
          control={control}
          name="tipo"
          render={({ field }) => (
            <Select
              label="Tipo"
              value={field.value}
              options={[
                { value: "visitante", label: "De visita" },
                { value: "privado", label: "Privada" },
              ]}
              onChange={field.onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="ubicacion"
          render={({ field }) => (
            <Input
              label="Ubicación"
              value={field.value}
              onChangeText={field.onChange}
              placeholder="Ej. Sótano -1"
            />
          )}
        />
        {esPrivada && (
          <Controller
            control={control}
            name="unidadId"
            render={({ field }) => (
              <Select
                label="Departamento"
                value={field.value}
                options={units.map((unit) => ({
                  value: String(unit.uuid ?? unit.id),
                  label: unit.codigo,
                }))}
                onChange={field.onChange}
              />
            )}
          />
        )}
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
