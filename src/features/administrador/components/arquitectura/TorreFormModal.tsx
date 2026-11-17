import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input, Modal, Select } from "@/shared/components";
import { Text, View } from "react-native";
import { towerSchema } from "../../schemas";
import type { Torre } from "@/stores/admin-store";
import { emptyTower, type TowerFormValues } from "../../types";
import { TorreFieldGrid } from "./TorreFieldGrid";
import { EstacionamientosPorNivel } from "./EstacionamientosPorNivel";
import {
  nivelesDelAlta,
  pedidoDeCocheras,
  planDeEstacionamientos,
  planDeTorre,
  resumenDeEstacionamientos,
  resumenDeTorre,
} from "../../helpers/arquitectura.helpers";
import type { ConstruccionDeTorre } from "../../services/arquitectura.repo";
import { useParametrosDeLaBase } from "@/shared/hooks";

type Props = {
  visible: boolean;
  editing: Torre | null;
  nextNumber: number;
  initial: TowerFormValues;
  /** Los niveles de estacionamiento del edificio, para las filas del alta. */
  niveles: Array<{ nombre: string; nomenclatura: string }>;
  /** Los sótanos de la torre que más tiene, para sugerir niveles. */
  sotanosMaximo: number;
  /** Los códigos de estacionamiento que ya hay: la numeración sigue desde ahí. */
  codigosExistentes: string[];
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
  niveles,
  sotanosMaximo,
  codigosExistentes,
  onClose,
  onSave,
}: Props) {
  const parametrosDeLaBase = useParametrosDeLaBase();
  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
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
  const plan = parametrosDeLaBase.listo
    ? planDeTorre(pedidoDepartamentos, parametrosDeLaBase.numero("torre_viviendas_maximo"))
    : null;
  const vistaPrevia = plan ? plan.motivo || resumenDeTorre(plan.viviendas) : "";

  const filasDeNiveles = nivelesDelAlta(
    niveles,
    Math.max(sotanosMaximo, Number(watch("sotanos")) || 0),
    watch("nivelesNuevos"),
  );
  const cantidades = watch("cocherasPorNivel");
  const pedidoCocheras = pedidoDeCocheras(filasDeNiveles, cantidades);
  const resumenCocheras = resumenDeEstacionamientos(
    planDeEstacionamientos(pedidoCocheras, codigosExistentes),
  );

  const guardar = (form: TowerFormValues) =>
    onSave(
      form,
      editing
        ? {}
        : {
            departamentos: pedidoDepartamentos,
            estacionamientos: pedidoCocheras.filter((f) => f.privados > 0 || f.visita > 0),
          },
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
                  ["porPiso", "¿Cuántos por piso?", "3"],
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
        {editing ? null : (
          <EstacionamientosPorNivel
            filas={filasDeNiveles}
            cantidades={cantidades}
            onCantidades={(valor) => setValue("cocherasPorNivel", valor, { shouldValidate: true })}
            onNivelNuevo={(nivel) =>
              setValue("nivelesNuevos", [...watch("nivelesNuevos"), nivel])
            }
            resumen={resumenCocheras}
          />
        )}
        <Button
          fullWidth
          loading={isSubmitting}
          onPress={() => void handleSubmit(guardar)()}
          disabled={!watch("nombre").trim() || Boolean(plan?.motivo)}
        >
          {editing ? "Guardar cambios" : "Crear torre"}
        </Button>
      </View>
    </Modal>
  );
}
