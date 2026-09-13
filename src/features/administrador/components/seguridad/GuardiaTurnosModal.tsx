import React from "react";
import { Controller, useForm, type Control, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input, Modal, Select, Toggle } from "@/shared/components";
import { Text, View } from "react-native";
import type { Guardia, TurnoOverride } from "@/shared/types";
import { recurringScheduleSchema, turnoOverrideSchema } from "../../schemas";
import {
  emptyOverride,
  hourRanges,
  rotationTypes,
  weekDays,
  type RecurringScheduleFormValues,
} from "../../types";

type Props = {
  guardia: Guardia | null;
  onClose: () => void;
  onUpdate: (guardia: Guardia) => void;
};

export function GuardiaTurnosModal({ guardia, onClose, onUpdate }: Props) {
  const [recurring, setRecurring] = React.useState(false);
  const [recurrenceDays, setRecurrenceDays] = React.useState<string[]>([]);
  const [rotation, setRotation] = React.useState(false);
  const [overrideOpen, setOverrideOpen] = React.useState(false);
  const recurringForm = useForm<RecurringScheduleFormValues>({
    resolver: zodResolver(recurringScheduleSchema),
    defaultValues: { horaInicio: "", horaFin: "", tipoRotacion: "" },
  });
  const overrideForm = useForm<TurnoOverride>({
    resolver: zodResolver(turnoOverrideSchema),
    defaultValues: emptyOverride,
  });
  const recurrenceStart = recurringForm.watch("horaInicio");
  const recurrenceEnd = recurringForm.watch("horaFin");
  const rotationType = recurringForm.watch("tipoRotacion");

  React.useEffect(() => {
    setRecurring(false);
    setRecurrenceDays([]);
    setRotation(false);
    setOverrideOpen(false);
    recurringForm.reset();
    overrideForm.reset(emptyOverride);
  }, [guardia?.id]);

  const addRecurringSchedule = (values: RecurringScheduleFormValues) => {
    if (!guardia || !recurrenceDays.length || !values.horaInicio) return;
    const nextTurns = recurrenceDays.map((dia) => ({
      dia,
      hora: values.horaInicio,
    }));
    onUpdate({
      ...guardia,
      turnos: [...guardia.turnos, ...nextTurns],
      rotacionActiva: rotation,
      tipoRotacion: values.tipoRotacion,
    });
    setRecurring(false);
    setRecurrenceDays([]);
    recurringForm.reset();
  };

  const saveRotation = () => {
    if (guardia) {
      onUpdate({
        ...guardia,
        rotacionActiva: true,
        tipoRotacion: rotationType,
      });
    }
    setRotation(false);
  };

  const saveOverride = (data: TurnoOverride) => {
    if (!guardia) return;
    onUpdate({
      ...guardia,
      overrides: [...(guardia.overrides || []), data],
    });
    overrideForm.reset(emptyOverride);
    setOverrideOpen(false);
  };

  return (
    <>
      <Modal
        visible={!!guardia}
        onClose={onClose}
        title={`Turnos: ${guardia?.nombre || ""}`}
      >
        <View className="gap-4">
          <View className="rounded-2xl bg-gray-50 p-3 gap-2">
            <Text className="text-sm font-semibold text-gray-900">
              Turnos actuales
            </Text>
            {guardia?.turnos.map((turno, index) => (
              <Text
                key={index}
                className="border-b border-gray-200 py-1 text-sm text-gray-700"
              >
                {turno.dia} - {turno.hora}
              </Text>
            ))}
          </View>
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-gray-700">
              Configurar horario recurrente
            </Text>
            <Toggle value={recurring} onChange={setRecurring} />
          </View>
          {recurring && (
            <View className="rounded-2xl bg-gray-50 p-3 gap-3">
              <Text className="text-sm font-semibold text-gray-900">
                Días de la semana
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {weekDays.map((day) => (
                  <Button
                    key={day}
                    size="sm"
                    variant={
                      recurrenceDays.includes(day) ? "primary" : "secondary"
                    }
                    onPress={() =>
                      setRecurrenceDays((current) =>
                        current.includes(day)
                          ? current.filter((item) => item !== day)
                          : [...current, day],
                      )
                    }
                  >
                    {day.slice(0, 3)}
                  </Button>
                ))}
              </View>
              <Select
                label="Hora inicio"
                placeholder="Inicio"
                value={recurrenceStart}
                options={hourRanges}
                onChange={(value) => recurringForm.setValue("horaInicio", String(value))}
              />
              <Select
                label="Hora fin"
                placeholder="Fin"
                value={recurrenceEnd}
                options={hourRanges}
                onChange={(value) => recurringForm.setValue("horaFin", String(value))}
              />
              <Button
                fullWidth
                onPress={() => void recurringForm.handleSubmit(addRecurringSchedule)()}
              >
                Guardar horario recurrente
              </Button>
            </View>
          )}
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-gray-700">
              Programar rotación de turnos
            </Text>
            <Toggle value={rotation} onChange={setRotation} />
          </View>
          {rotation && (
            <View className="gap-3">
              <Select
                label="Tipo de rotación"
                placeholder="Seleccionar"
                value={rotationType}
                options={rotationTypes}
                onChange={(value) => recurringForm.setValue("tipoRotacion", String(value))}
              />
              <Button fullWidth onPress={saveRotation}>
                Programar rotación
              </Button>
            </View>
          )}
          <Button
            variant="secondary"
            fullWidth
            onPress={() => setOverrideOpen(true)}
          >
            Modificar turno puntual
          </Button>
          <Button variant="ghost" fullWidth onPress={onClose}>
            Cerrar
          </Button>
        </View>
      </Modal>
      <Modal
        visible={overrideOpen}
        onClose={() => setOverrideOpen(false)}
        title="Modificar turno puntual"
      >
        <View className="gap-4">
          <Text className="text-sm text-center text-gray-500">
            Modifica manualmente un turno específico.
          </Text>
          <ControllerInput
            control={overrideForm.control}
            name="fecha"
            label="Fecha"
            placeholder="AAAA-MM-DD"
          />
          <View className="flex-row gap-2">
            <View className="flex-1">
              <ControllerInput
                control={overrideForm.control}
                name="horaInicio"
                label="Hora inicio"
                placeholder="08:00"
              />
            </View>
            <View className="flex-1">
              <ControllerInput
                control={overrideForm.control}
                name="horaFin"
                label="Hora fin"
                placeholder="17:00"
              />
            </View>
          </View>
          <Button
            fullWidth
            onPress={() => void overrideForm.handleSubmit(saveOverride)()}
          >
            Guardar modificación
          </Button>
        </View>
      </Modal>
    </>
  );
}

function ControllerInput<T extends TurnoOverride>({
  control,
  name,
  label,
  placeholder,
}: {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  placeholder: string;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Input
          label={label}
          placeholder={placeholder}
          value={field.value as string}
          onChangeText={field.onChange}
        />
      )}
    />
  );
}
