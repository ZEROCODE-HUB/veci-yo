import React from "react";
import { ESTADO_UNIDAD } from "@/shared/constants";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input, Modal, Select } from "@/shared/components";
import { Text, View } from "react-native";
import { unitSchema } from "../../schemas";
import type {
  DepositFormValues,
  EstacionamientoDeTorre,
  EstacionamientoFormValues,
  UnitFormValues,
} from "../../types";
import { useAdminStore, type Deposito, type Unidad } from "@/stores/admin-store";
import {
  BORRADOR_VACIO,
  RecursosDeLaVivienda,
  RecursosDelBorrador,
  type BorradorDeRecursos,
} from "./RecursosDeLaVivienda";
import { AsignarPropietario } from "./AsignarPropietario";

/*
  Los estados salen del enum de la base --con sus etiquetas-- y no de una lista
  escrita aqui: esta tenia `config-pendiente` con guion medio donde la base
  espera `config_pendiente`, asi que elegirlo rompia el guardado.
*/
/*
  Con su clave como valor y la etiqueta para leer. Eran solo las etiquetas:
  el desplegable no reconocía el estado guardado --«aceptado» no es
  «Aceptado»-- y salía «Elegir…», y al elegir uno viajaba la etiqueta, que el
  esquema rechaza sin decir nada: el departamento no se guardaba (16/10/2026).
*/
const UNIT_STATES = Object.entries(ESTADO_UNIDAD).map(([value, label]) => ({
  value,
  label,
}));

type Props = {
  visible: boolean;
  editing: Unidad | null;
  initial: UnitFormValues;
  onClose: () => void;
  /** Al crear llegan también lo elegido abajo y el propietario. */
  onSave: (
    form: UnitFormValues,
    extra?: { borrador: BorradorDeRecursos; propietario: { nombre: string; correo: string } | null },
  ) => void;
  /** Lo de abajo solo se ofrece si llegan estas (la torre las pasa). */
  parkings?: EstacionamientoDeTorre[];
  deposits?: Deposito[];
  propietarioActual?: string;
  onCreateParking?: (form: EstacionamientoFormValues) => void;
  onUpdateParking?: (parking: EstacionamientoDeTorre, form: EstacionamientoFormValues) => void;
  onCreateDeposit?: (form: DepositFormValues) => void;
  onUpdateDeposit?: (deposit: Deposito, form: DepositFormValues) => void;
};

export function UnidadFormModal({
  visible,
  editing,
  initial,
  onClose,
  onSave,
  parkings = [],
  deposits = [],
  propietarioActual,
  onCreateParking,
  onUpdateParking,
  onCreateDeposit,
  onUpdateDeposit,
}: Props) {
  // Las del edificio: se crean en Arquitectura › Condominio.
  const tipologias = useAdminStore((s) => s.tipologias);
  // Al crear: lo que se asigna se guarda junto con el departamento (29/10/2026).
  const [borrador, setBorrador] = React.useState<BorradorDeRecursos>(BORRADOR_VACIO);
  const [duenoNombre, setDuenoNombre] = React.useState("");
  const [duenoCorreo, setDuenoCorreo] = React.useState("");
  const { control, handleSubmit, reset, watch } = useForm<UnitFormValues>({
    resolver: zodResolver(unitSchema),
    defaultValues: initial,
  });

  React.useEffect(() => {
    if (visible && !editing) {
      setBorrador(BORRADOR_VACIO);
      setDuenoNombre("");
      setDuenoCorreo("");
    }
  }, [visible, editing]);

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
          render={({ field, fieldState }) => (
            <Input
              label="Código *"
              value={field.value}
              onChangeText={field.onChange}
            error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="piso"
          render={({ field, fieldState }) => (
            <Input
              label="Piso *"
              value={field.value}
              onChangeText={field.onChange}
              soloCifras
            error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="estado"
          render={({ field }) => (
            <Select
              label="Estado (opcional)"
              value={field.value}
              options={UNIT_STATES}
              onChange={field.onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="tipologiaId"
          render={({ field }) => (
            <Select
              label="Tipología (opcional)"
              value={field.value}
              placeholder="Sin tipología"
              textoSinOpciones="Créalas en Arquitectura › Condominio"
              options={[
                { value: "", label: "Sin tipología" },
                ...tipologias
                  .filter((t) => Boolean(t.uuid))
                  .map((t) => ({ value: t.uuid ?? "", label: t.nombre })),
              ]}
              onChange={(valor) => field.onChange(String(valor))}
            />
          )}
        />
        {/*
          Estacionamientos, depósitos y propietario desde la ficha del
          departamento (pedido del cliente, 29/10/2026). Necesitan que el
          departamento exista: al crearlo, se completan con «Editar».
        */}
        {!onCreateParking || !onUpdateParking || !onCreateDeposit || !onUpdateDeposit ? null : editing?.uuid ? (
          <>
            <RecursosDeLaVivienda
              unidadId={editing.uuid}
              parkings={parkings}
              deposits={deposits}
              onCreateParking={onCreateParking}
              onUpdateParking={onUpdateParking}
              onCreateDeposit={onCreateDeposit}
              onUpdateDeposit={onUpdateDeposit}
            />
            <AsignarPropietario unidadId={editing.uuid} propietarioActual={propietarioActual} />
          </>
        ) : (
          <>
            <RecursosDelBorrador
              parkings={parkings}
              deposits={deposits}
              borrador={borrador}
              onCambiar={setBorrador}
            />
            <View className="gap-2 rounded-xl border border-gray-200 p-3">
              <Text className="text-sm font-bold text-gray-900">Asignar propietario (opcional)</Text>
              <Input label="Nombre y apellido" soloLetras value={duenoNombre} onChangeText={setDuenoNombre} placeholder="Ej. Ana Restrepo" />
              <Input label="Correo" type="email" value={duenoCorreo} onChangeText={setDuenoCorreo} placeholder="ana@correo.com" />
              <Text className="text-xs text-gray-500">
                Queda asignado al guardar, sin tener que aceptar. Le llega un correo para que descargue la app e inicie sesión con este correo.
              </Text>
            </View>
          </>
        )}
        <Button
          fullWidth
          disabled={!watch("codigo")}
          onPress={() =>
            void handleSubmit((form) =>
              onSave(
                form,
                editing
                  ? undefined
                  : {
                      borrador,
                      propietario:
                        duenoNombre.trim() && duenoCorreo.trim()
                          ? { nombre: duenoNombre.trim(), correo: duenoCorreo.trim() }
                          : null,
                    },
              ),
            )()
          }
        >
          Guardar
        </Button>
      </View>
    </Modal>
  );
}
