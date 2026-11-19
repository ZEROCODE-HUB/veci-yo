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
  type NivelesParaCrear,
} from "./RecursosDeLaVivienda";
import { AsignarPropietario } from "./AsignarPropietario";
import { cuentaDelEdificio } from "../../helpers/indiceDeVotacion";

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
  ) => unknown;
  /** Lo de abajo solo se ofrece si llegan estas (la torre las pasa). */
  parkings?: EstacionamientoDeTorre[];
  deposits?: Deposito[];
  propietarioActual?: string;
  onCreateParking?: (form: EstacionamientoFormValues) => unknown;
  onUpdateParking?: (parking: EstacionamientoDeTorre, form: EstacionamientoFormValues) => unknown;
  onCreateDeposit?: (form: DepositFormValues) => unknown;
  onUpdateDeposit?: (deposit: Deposito, form: DepositFormValues) => unknown;
  /** Para «+ Crear un estacionamiento nuevo», que pide el nivel (16/11/2026). */
  nivelesParaCrear?: NivelesParaCrear;
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
  nivelesParaCrear = { niveles: [], codigosDelEdificio: [] },
}: Props) {
  // Las del edificio: se crean en Arquitectura › Condominio.
  const tipologias = useAdminStore((s) => s.tipologias);
  // Todos los departamentos del edificio, para decir cuánto suma el índice.
  const unidadesDelEdificio = useAdminStore((s) => s.unidades);
  // Al crear: lo que se asigna se guarda junto con el departamento (29/10/2026).
  const [borrador, setBorrador] = React.useState<BorradorDeRecursos>(BORRADOR_VACIO);
  const [duenoNombre, setDuenoNombre] = React.useState("");
  const [duenoCorreo, setDuenoCorreo] = React.useState("");
  const {
    control,
    handleSubmit,
    reset,
    watch,
    // Mientras se guarda: el botón gira y no deja guardar dos veces (13/11/2026).
    formState: { isSubmitting },
  } = useForm<UnitFormValues>({
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
          El índice de votación de la vivienda, en % del edificio (18/11/2026):
          pesa su voto en las encuestas que se cuentan «según el índice». Entre
          todos los departamentos no pasan de 100, y para votar así tienen que
          sumar 100 exactos. Empieza vacío.
        */}
        <Controller
          control={control}
          name="indiceVotacion"
          render={({ field, fieldState }) => {
            const sumaDeLosDemas = unidadesDelEdificio
              .filter((u) => u.uuid !== editing?.uuid)
              .reduce((suma, u) => suma + (u.indiceVotacion ?? 0), 0);
            const cuenta = cuentaDelEdificio(sumaDeLosDemas, field.value);
            return (
              <View className="gap-1">
                <Input
                  label="Índice de votación, en %"
                  value={field.value}
                  onChangeText={(texto) => field.onChange(texto.replace(/[^0-9.,]/g, ""))}
                  placeholder="Ej. 2,5"
                  error={fieldState.error?.message}
                />
                <Text className="text-xs leading-4 text-gray-500">
                  Qué parte del edificio vale su voto en las encuestas que se cuentan según el índice. Entre todos los
                  departamentos tienen que sumar 100 %. Déjalo vacío si todavía no lo sabes.
                </Text>
                <Text className={cuenta.pasa ? "text-xs leading-4 text-danger" : "text-xs leading-4 text-gray-700"}>
                  {cuenta.texto}
                </Text>
              </View>
            );
          }}
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
              nivelesParaCrear={nivelesParaCrear}
            />
            <AsignarPropietario
              unidadId={editing.uuid}
              propietarioActual={propietarioActual}
              onAsignado={onClose}
            />
          </>
        ) : (
          <>
            <RecursosDelBorrador
              parkings={parkings}
              deposits={deposits}
              borrador={borrador}
              onCambiar={setBorrador}
              nivelesParaCrear={nivelesParaCrear}
            />
            <View className="gap-2 rounded-xl border border-gray-200 p-3">
              <View className="gap-0.5">
                <Text className="text-sm font-bold text-gray-900">Propietario (opcional)</Text>
                {/*
                  Decía «Queda asignado al guardar, sin tener que aceptar», y
                  desde el 30/10/2026 no es así: al guardar se le manda la
                  invitación y queda propietario cuando la acepta (17/11/2026).
                */}
                <Text className="text-xs text-gray-500">
                  Al guardar el departamento, el propietario recibe un correo con su invitación para aceptar la vivienda.
                </Text>
              </View>
              <Input label="Nombre y apellido" soloLetras value={duenoNombre} onChangeText={setDuenoNombre} placeholder="Ej. Ana Restrepo" />
              <Input label="Correo" type="email" value={duenoCorreo} onChangeText={setDuenoCorreo} placeholder="ana@correo.com" />
              <Text className="text-xs text-gray-500">
                Entra a la app con este correo (o crea su cuenta con él) y acepta. Los estacionamientos y depósitos de arriba van con la invitación.
              </Text>
            </View>
          </>
        )}
        <Button
          fullWidth
          loading={isSubmitting}
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
          {editing
            ? "Guardar cambios"
            : duenoNombre.trim() && duenoCorreo.trim()
              ? "Guardar y enviar la invitación"
              : "Guardar departamento"}
        </Button>
      </View>
    </Modal>
  );
}
