import React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input, Modal, Select } from "@/shared/components";
import { Text, View } from "react-native";
import { siguientesCodigos } from "../../helpers/arquitectura.helpers";
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
  /** Los niveles del edificio: el nivel es obligatorio (16/11/2026). */
  niveles: Array<{ uuid: string; nombre: string; nomenclatura: string }>;
  /** Los códigos que ya hay en el edificio, para sugerir el siguiente. */
  codigosExistentes: string[];
  onClose: () => void;
  onSave: (form: EstacionamientoFormValues) => unknown;
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
  niveles,
  codigosExistentes,
  onClose,
  onSave,
}: Props) {
  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    // Mientras se guarda: el botón gira y no deja guardar dos veces (13/11/2026).
    formState: { isSubmitting },
  } =
    useForm<EstacionamientoFormValues>({
      resolver: zodResolver(estacionamientoSchema),
      defaultValues: initial,
    });

  React.useEffect(() => {
    if (visible) reset(initial);
  }, [editing?.uuid, initial, reset, visible]);

  const esPrivada = watch("tipo") === "privado";

  /*
    Al elegir el nivel (o cambiar el tipo) se sugiere el siguiente código de
    ese nivel --S1-04 si ya hay hasta S1-03--, salvo que se haya escrito otro
    a mano (16/11/2026).
  */
  const sugerido = React.useRef("");
  const sugerir = () => {
    const nivel = niveles.find((n) => n.uuid === getValues("nivelId"));
    if (!nivel || editing) return;
    const actual = getValues("codigo");
    if (actual && actual !== sugerido.current) return;
    const [codigo] = siguientesCodigos(nivel.nomenclatura, getValues("tipo"), 1, codigosExistentes);
    sugerido.current = codigo;
    setValue("codigo", codigo, { shouldValidate: true });
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={editing ? "Editar cochera" : "Nueva cochera"}
    >
      <View className="gap-3">
        {/*
          El nivel primero: el cliente pidió la ubicación obligatoria
          (16/11/2026), y el código sale de su nomenclatura.
        */}
        <Controller
          control={control}
          name="nivelId"
          render={({ field, fieldState }) => (
            <Select
              label="Nivel *"
              value={field.value}
              placeholder="Elegir el nivel…"
              textoSinOpciones="Todavía no hay niveles. Créalos en Arquitectura › Estacionamientos."
              options={niveles.map((n) => ({ value: n.uuid, label: `${n.nombre} (${n.nomenclatura})` }))}
              onChange={(valor) => {
                field.onChange(String(valor));
                sugerir();
              }}
              error={fieldState.error?.message}
            />
          )}
        />
        {niveles.length ? null : (
          <Text className="text-xs text-gray-500">
            Todavía no hay niveles. Créalos en Arquitectura › Estacionamientos.
          </Text>
        )}
        <Controller
          control={control}
          name="codigo"
          render={({ field, fieldState }) => (
            <Input
              label="Código *"
              value={field.value}
              onChangeText={field.onChange}
              placeholder="Ej. S1-01"
            error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="tipo"
          render={({ field }) => (
            <Select
              label="Tipo *"
              value={field.value}
              options={[
                { value: "visitante", label: "De visita" },
                { value: "privado", label: "Privada" },
              ]}
              onChange={(valor) => {
                field.onChange(valor);
                sugerir();
              }}
            />
          )}
        />
        <Controller
          control={control}
          name="ubicacion"
          render={({ field, fieldState }) => (
            <Input
              label="Detalle de ubicación (opcional)"
              value={field.value}
              onChangeText={field.onChange}
              placeholder="Ej. Junto al ascensor"
            error={fieldState.error?.message}
            />
          )}
        />
        {esPrivada && (
          <Controller
            control={control}
            name="unidadId"
            render={({ field }) => (
              <Select
                label="Departamento (opcional)"
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
          loading={isSubmitting}
          disabled={!watch("codigo")}
          onPress={() => void handleSubmit(onSave)()}
        >
          Guardar
        </Button>
      </View>
    </Modal>
  );
}
