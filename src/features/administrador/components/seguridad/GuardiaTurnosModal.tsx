import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, CampoFecha, Modal, Select, Toggle } from "@/shared/components";
import { Text, View } from "react-native";
import type { Guardia, TurnoOverride } from "@/shared/types";
import { recurringScheduleSchema, turnoOverrideSchema } from "../../schemas";
import {
  emptyOverride,
  HORAS_DEL_DIA,
  weekDays,
  type RecurringScheduleFormValues,
} from "../../types";
import { formatRangoHoras } from "@/shared/utils";

type Props = {
  guardia: Guardia | null;
  onClose: () => void;
  onUpdate: (guardia: Guardia) => void;
  /** El ajuste de un día concreto. Va aparte: se guarda en su propia tabla. */
  onOverride: (guardia: Guardia, ajuste: TurnoOverride) => void;
  /** Quita un ajuste que ya estaba guardado. */
  onQuitarOverride: (uuid: string) => void;
};

export function GuardiaTurnosModal({
  guardia,
  onClose,
  onUpdate,
  onOverride,
  onQuitarOverride,
}: Props) {
  const [recurring, setRecurring] = React.useState(false);
  const [recurrenceDays, setRecurrenceDays] = React.useState<string[]>([]);
  const [overrideOpen, setOverrideOpen] = React.useState(false);
  const [aviso, setAviso] = React.useState("");
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

  /*
    Al cambiar de guardia el modal se queda montado, asi que hay que vaciarlo a
    mano. Se toman los `reset` sueltos y no los formularios enteros:
    react-hook-form garantiza que esas funciones son las mismas entre renders
    y los objetos que las llevan no, asi que depender del formulario completo
    vaciaria el modal en cada render.
  */
  const { reset: reiniciarRecurrente } = recurringForm;
  const { reset: reiniciarAjuste } = overrideForm;

  React.useEffect(() => {
    setRecurring(false);
    setRecurrenceDays([]);
    setOverrideOpen(false);
    setAviso("");
    reiniciarRecurrente();
    reiniciarAjuste(emptyOverride);
  }, [guardia?.id, reiniciarRecurrente, reiniciarAjuste]);

  const addRecurringSchedule = (values: RecurringScheduleFormValues) => {
    if (!guardia || !recurrenceDays.length || !values.horaInicio) return;
    /*
      Llevaba `hora: values.horaInicio` --solo la de entrada-- aunque el
      formulario recoge las dos, asi que la hora de salida del turno se perdia
      antes de llegar a ningun sitio.
    */
    const nextTurns = recurrenceDays.map((dia) => ({
      dia,
      horaInicio: values.horaInicio,
      horaFin: values.horaFin,
    }));
    /*
      Un día y hora que ya tiene no se añade otra vez. La base tampoco lo
      admite, y antes de que el guardado fuera una sola transacción eso dejaba
      al guardia sin ningún turno.
    */
    const repetido = nextTurns.find((nuevo) =>
      guardia.turnos.some(
        (t) => t.dia === nuevo.dia && t.horaInicio === nuevo.horaInicio,
      ),
    );
    if (repetido) {
      setAviso(
        `Ya tiene un turno el ${repetido.dia} a las ${repetido.horaInicio}.`,
      );
      return;
    }
    setAviso("");
    onUpdate({
      ...guardia,
      turnos: [...guardia.turnos, ...nextTurns],
    });
    setRecurring(false);
    setRecurrenceDays([]);
    recurringForm.reset();
  };

  const quitarTurno = (indice: number) => {
    if (!guardia) return;
    onUpdate({
      ...guardia,
      turnos: guardia.turnos.filter((_, i) => i !== indice),
    });
  };

  /*
    El ajuste se metía en el objeto del guardia y quien lo recibía solo
    guardaba permisos, rotación y turnos: «Guardar modificación» cerraba la
    ventana y no existía (13/10/2026). Ahora sale por su propio camino.
  */
  const saveOverride = (data: TurnoOverride) => {
    if (!guardia) return;
    onOverride(guardia, data);
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
            {guardia?.turnos.length === 0 && (
              <Text className="text-sm text-gray-500">Todavía no tiene.</Text>
            )}
            {guardia?.turnos.map((turno, index) => (
              <View
                key={turno.uuid ?? `${turno.dia}-${turno.horaInicio}`}
                className="flex-row items-center justify-between border-b border-gray-200 py-1"
              >
                <Text className="text-sm text-gray-700">
                  {turno.dia} ·{" "}
                  {formatRangoHoras(turno.horaInicio, turno.horaFin)}
                </Text>
                <Button
                  size="sm"
                  variant="ghost"
                  onPress={() => quitarTurno(index)}
                >
                  <Text>Quitar</Text>
                </Button>
              </View>
            ))}
          </View>
          {Boolean(guardia?.overrides?.length) && (
            <View className="rounded-2xl bg-gray-50 p-3 gap-2">
              <Text className="text-sm font-semibold text-gray-900">
                Ajustes de días concretos
              </Text>
              {guardia?.overrides?.map((ajuste) => (
                <View
                  key={ajuste.uuid ?? ajuste.fecha}
                  className="flex-row items-center justify-between border-b border-gray-200 py-1"
                >
                  <Text className="text-sm text-gray-700">
                    {ajuste.fecha} ·{" "}
                    {ajuste.horaInicio
                      ? formatRangoHoras(ajuste.horaInicio, ajuste.horaFin)
                      : "No trabaja"}
                  </Text>
                  {ajuste.uuid ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onPress={() => onQuitarOverride(ajuste.uuid ?? "")}
                    >
                      <Text>Quitar</Text>
                    </Button>
                  ) : null}
                </View>
              ))}
            </View>
          )}
          <View className="flex-row items-center justify-between">
            <Text className="shrink text-sm text-gray-700">
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
                options={HORAS_DEL_DIA}
                onChange={(value) => recurringForm.setValue("horaInicio", String(value))}
              />
              <Select
                label="Hora fin"
                placeholder="Fin"
                value={recurrenceEnd}
                options={HORAS_DEL_DIA}
                onChange={(value) => recurringForm.setValue("horaFin", String(value))}
              />
              {Boolean(
                aviso ||
                  recurringForm.formState.errors.horaInicio?.message ||
                  recurringForm.formState.errors.horaFin?.message,
              ) && (
                <Text className="text-xs text-red-600">
                  {aviso ||
                    recurringForm.formState.errors.horaInicio?.message ||
                    recurringForm.formState.errors.horaFin?.message}
                </Text>
              )}
              <Button
                fullWidth
                onPress={() => {
                  if (!recurrenceDays.length) {
                    setAviso("Elige al menos un día.");
                    return;
                  }
                  void recurringForm.handleSubmit(addRecurringSchedule)();
                }}
              >
                Guardar horario recurrente
              </Button>
            </View>
          )}
          {/*
            «Programar rotación de turnos» se quitó (hueco 13, 28/10/2026): se
            guardaba y no generaba ningún turno. El horario recurrente y los
            ajustes de días concretos cubren lo mismo, y de verdad.
          */}
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
            Cambia el horario de un día concreto. Sin horas, ese día no
            trabaja.
          </Text>
          <CampoFecha
            label="Fecha"
            enLinea
            minima={new Date()}
            value={overrideForm.watch("fecha")}
            onChange={(iso) =>
              overrideForm.setValue("fecha", iso, { shouldValidate: true })
            }
          />
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Select
                label="Hora inicio"
                placeholder="No trabaja"
                value={overrideForm.watch("horaInicio")}
                options={HORAS_DEL_DIA}
                onChange={(valor) =>
                  overrideForm.setValue("horaInicio", String(valor))
                }
              />
            </View>
            <View className="flex-1">
              <Select
                label="Hora fin"
                placeholder="No trabaja"
                value={overrideForm.watch("horaFin")}
                options={HORAS_DEL_DIA}
                onChange={(valor) =>
                  overrideForm.setValue("horaFin", String(valor))
                }
              />
            </View>
          </View>
          {Boolean(
            overrideForm.formState.errors.fecha?.message ||
              overrideForm.formState.errors.horaFin?.message,
          ) && (
            <Text className="text-xs text-red-600">
              {overrideForm.formState.errors.fecha?.message ||
                overrideForm.formState.errors.horaFin?.message}
            </Text>
          )}
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
