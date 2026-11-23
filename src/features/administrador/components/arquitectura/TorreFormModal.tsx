import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input, Modal, Select } from "@/shared/components";
import { Text, View } from "react-native";
import { towerSchema } from "../../schemas";
import type { Torre } from "@/stores/admin-store";
import { emptyTower, type TowerFormValues } from "../../types";
import { TorreFieldGrid } from "./TorreFieldGrid";
import { planDeTorre, resumenDeTorre } from "../../helpers/arquitectura.helpers";
import type { ConstruccionDeTorre } from "../../services/arquitectura.repo";
import { useParametrosDeLaBase } from "@/shared/hooks";

type Props = {
  visible: boolean;
  editing: Torre | null;
  nextNumber: number;
  initial: TowerFormValues;
  onClose: () => void;
  onSave: (form: TowerFormValues, construccion: ConstruccionDeTorre) => unknown;
};

const NUMERACIONES = [
  { value: "numero", label: "501, 502, 503… (piso y número)" },
  { value: "letra", label: "5A, 5B, 5C… (piso y letra)" },
];

export function TorreFormModal({
  visible,
  editing,
  nextNumber,
  initial,
  onClose,
  onSave,
}: Props) {
  const parametrosDeLaBase = useParametrosDeLaBase();
  const {
    control,
    handleSubmit,
    reset,
    watch,
    // Mientras se guarda: el botón gira y no deja guardar dos veces (13/11/2026).
    formState: { isSubmitting },
  } = useForm<TowerFormValues>({
    resolver: zodResolver(towerSchema),
    defaultValues: emptyTower,
  });

  useEffect(() => {
    if (visible) reset(initial);
  }, [initial, reset, visible]);

  /*
    La vista previa usa las mismas funciones que el guardado
    (`planDeTorre`, `planDeEstacionamientos`): lo que se promete es lo que se
    crea. Sin el tope de la base todavía, no se promete nada.
  */
  const pedidoDepartamentos = {
    desde: watch("pisoDesde"),
    hasta: watch("pisoHasta"),
    porPiso: watch("porPiso"),
    numeracion: watch("numeracion"),
  };
  // El tope por piso es del panel (17/11/2026, el cliente: «cuántos máximo
  // por piso al crear torre»); se dice junto al campo y lo aplica el plan.
  const topePorPiso = parametrosDeLaBase.listo
    ? parametrosDeLaBase.numero("torre_viviendas_por_piso_maximo")
    : null;
  const plan =
    parametrosDeLaBase.listo && topePorPiso !== null
      ? planDeTorre(
          pedidoDepartamentos,
          parametrosDeLaBase.numero("torre_viviendas_maximo"),
          topePorPiso,
        )
      : null;
  const vistaPrevia = plan ? plan.motivo || resumenDeTorre(plan.viviendas) : "";


  const guardar = (form: TowerFormValues) =>
    onSave(
      form,
      editing
        ? {}
        : /*
            Los estacionamientos ya no se piden aquí (17/11/2026): el cliente
            quiere «primero se crea la torre, luego recién el sótano». Se
            agregan después en Estacionamientos (el sótano, con su torre) y
            en la torre (cada estacionamiento).
          */
          { departamentos: pedidoDepartamentos, estacionamientos: [] },
    );

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
              label="Nombre de la torre *"
              value={field.value}
              onChangeText={field.onChange}
              placeholder="Ej: Torre A"
              error={fieldState.error?.message}
            />
          )}
        />
        {editing ? null : (
          /*
            Pisos y departamentos por piso (16/11/2026). El cliente: «al crear
            la torre preguntar a partir de qué piso comienzan los
            departamentos y hasta qué piso … pone 3 departamentos del piso 5
            al 7, ah entonces se van a crear 9». Antes era un rango de códigos
            («Desde 101 / Hasta 105») y el piso se adivinaba dividiendo.
          */
          <View className="gap-3 rounded-xl border border-gray-200 p-3">
            <Text className="text-sm font-bold text-gray-900">Departamentos (opcional)</Text>
            <View className="flex-row gap-2">
              {(
                [
                  ["pisoDesde", "¿Desde qué piso empiezan?", "5"],
                  ["pisoHasta", "¿Hasta qué piso?", "7"],
                  ["porPiso", topePorPiso ? `¿Cuántos por piso? (máx. ${topePorPiso})` : "¿Cuántos por piso?", "3"],
                ] as const
              ).map(([nombre, etiqueta, ejemplo]) => (
                <View key={nombre} className="flex-1">
                  <Controller
                    control={control}
                    name={nombre}
                    render={({ field, fieldState }) => (
                      <Input
                        label={etiqueta}
                        value={field.value}
                        onChangeText={field.onChange}
                        onBlur={field.onBlur}
                        placeholder={ejemplo}
                        soloCifras
                        error={fieldState.error?.message}
                      />
                    )}
                  />
                </View>
              ))}
            </View>
            <Controller
              control={control}
              name="numeracion"
              render={({ field }) => (
                <Select
                  label="Numeración"
                  explicacion="Cómo se llaman los departamentos que se crean: con el piso y un número, o con el piso y una letra."
                  value={field.value}
                  options={NUMERACIONES}
                  onChange={(valor) => field.onChange(String(valor))}
                />
              )}
            />
            {vistaPrevia ? (
              <View className="rounded-xl bg-blue-50 p-3">
                <Text className="text-sm text-blue-700 text-center">{vistaPrevia}</Text>
              </View>
            ) : null}
            <Text className="text-xs text-gray-500">
              Si algún piso tiene una cantidad distinta, después puedes agregar o eliminar
              departamentos uno por uno en la torre.
            </Text>
          </View>
        )}
        <TorreFieldGrid control={control} conCocheras={Boolean(editing)} />
        <Button
          fullWidth
          loading={isSubmitting}
          onPress={() => void handleSubmit(guardar)()}
          disabled={Boolean(plan?.motivo)}
        >
          {editing ? "Guardar cambios" : "Crear torre"}
        </Button>
      </View>
    </Modal>
  );
}
