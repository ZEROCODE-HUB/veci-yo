import { theme } from "@/config";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Controller } from "react-hook-form";
import { formatAmount } from "@/shared/utils";
import { Button, Input, Modal, Select, Toggle } from "@/shared/components";
import type { ZonaComun } from "@/shared/types";
import { useZonaReservaForm } from "../hooks";
import { ZonaBanner } from "./ZonaBanner";
import { diaEnLetra } from "../services/tiraDeDias";

interface Props {
  zona: ZonaComun;
  rol: string | null;
  initialHour?: string;
  initialDate?: string;
  initialDepartment?: string;
  onSuccess: (result: {
    depto: string;
    hora: string;
    reservaNum: string;
  }) => void;
}

export function ZonaReservaForm({
  zona,
  rol,
  initialHour,
  initialDate,
  initialDepartment,
  onSuccess,
}: Props) {
  const {
    control,
    submit,
    errors,
    maxHoras,
    falta,
    opcionesHora,
    durations,
    numbers,
    cantidadPersonas,
    participantTypes,
    hora,
    acceptTerms,
    asistentes,
  } = useZonaReservaForm({
    zona,
    rol,
    initialHour,
    initialDate,
    initialDepartment,
    onSuccess,
  });
  // Estos dos campos se decidian con una lista de ids literales
  // (["bbq","coworking","tenis","lavanderia"]). Con las zonas en la base el id
  // es un uuid, asi que la lista no acertaba nunca: se decide por como esta
  // configurada la zona.
  const zonaConfig = zona as typeof zona & {
    cuposSimultaneos?: number;
    capacidadMaxima?: number;
    costoReserva?: number;
    reglas?: string;
    montoGarantia?: number;
    moneda?: string | null;
  };
  const fields = {
    // El numero de puesto solo tiene sentido si hay mas de uno que elegir.
    numero: (zonaConfig.total ?? 1) > 1,
    // Y los acompañantes, solo si la zona admite mas de una persona. Ojo:
    // `capacidad_maxima` es ambigua en el modelo -- en la lavanderia parece
    // contar maquinas y no personas --, asi que este criterio conviene
    // revisarlo con el cliente.
    personas: (zonaConfig.capacidadMaxima ?? 0) > 1,
  };

  const moneda = zonaConfig.moneda ?? "";
  const importes = [
    zonaConfig.costoReserva
      ? `Costo: ${formatAmount(zonaConfig.costoReserva)} ${moneda} por persona`
      : null,
    zonaConfig.montoGarantia
      ? `Garantía: ${formatAmount(zonaConfig.montoGarantia)} ${moneda}`
      : null,
  ].filter((texto): texto is string => !!texto);

  const [reglamentoAbierto, setReglamentoAbierto] = React.useState(false);

  const handleSubmit = () => {
    submit();
  };

  return (
    <View className="p-4 gap-3.5">
      <ZonaBanner zona={zona} />
      {/*
        La hora y el dia se eligieron en la grilla, que es la unica puerta a
        este formulario. Se enseñan; no se vuelven a preguntar.

        Aqui habia dos desplegables. El de la hora repetia la pregunta que
        acababa de contestarse en la pantalla anterior. El de «Duración» era
        peor: **no se usaba al guardar**. La hora de fin sale del texto de la
        franja --«07:30 - 08:30»--, asi que elegir «2 horas» no cambiaba nada.
        Reservar menos de la franja no es algo que la app sepa hacer hoy; si
        se quiere, es trabajo nuevo y no un desplegable.
      */}
      <Controller
        control={control}
        name="fecha"
        render={({ field: { value } }) => (
          <View
            className="rounded-xl px-3 py-2.5 gap-1"
            style={{
              backgroundColor: theme.colors.bgMuted,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            <View className="flex-row items-center gap-2">
              <Ionicons
                name="calendar-outline"
                size={16}
                color={theme.colors.textSecondary}
              />
              <Text className="text-sm text-gray-900">
                {diaEnLetra(value instanceof Date ? value : new Date())}
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Ionicons
                name="time-outline"
                size={16}
                color={theme.colors.textSecondary}
              />
              <Text className="text-sm font-semibold text-gray-900">
                {hora || "Sin hora"}
              </Text>
            </View>
          </View>
        )}
      />
      {fields.numero && (
        <SelectField
          control={control}
          name="numero"
          label={`Seleccione N° de ${zona.nombre}:`}
          options={numbers}
        />
      )}

      {fields.personas && (
        <SelectField
          control={control}
          name="peopleCount"
          /*
            Opcional de verdad: la lista va de «1 persona» en adelante y no
            tiene un cero, asi que dejarlo en blanco **es** ir solo. Sin
            decirlo, el «Seleccione...» parecia una pregunta pendiente.
          */
          label="Cantidad de personas que asistirán junto al titular (opcional, déjalo vacío si vas solo/a):"
          options={cantidadPersonas}
        />
      )}
      {asistentes.length > 0 && (
        <View className="gap-2">
          <Text className="text-sm text-gray-500">
            Nombres de los asistentes (opcional - puedes agregarlos ahora o
            después editando la reserva)
          </Text>
          {asistentes.map((_, index) => (
            <View key={index} className="flex-row items-end gap-2">
              <View className="flex-1">
                <Controller
                  control={control}
                  name={`asistentes.${index}.nombre`}
                  render={({ field: { value, onChange } }) => (
                    <Input
                      value={value}
                      onChangeText={onChange}
                      placeholder={`Nombre del asistente ${index + 1}${index === 0 ? " (Titular)" : ""}`}
                    />
                  )}
                />
              </View>
              <View style={{ width: 150 }}>
                <Controller
                  control={control}
                  name={`asistentes.${index}.tipoParticipante`}
                  render={({ field: { value, onChange } }) => (
                    <Select
                      value={value}
                      options={[...participantTypes]}
                      onChange={onChange}
                    />
                  )}
                />
              </View>
            </View>
          ))}
        </View>
      )}
      <Controller
        control={control}
        name="comments"
        render={({ field: { value, onChange } }) => (
          <Input
            label="Comentarios u observaciones (opcional)"
            value={value || ""}
            onChangeText={onChange}
            placeholder="Escriba sus comentarios aqui..."
            multiline
            rows={3}
          />
        )}
      />
      {/* Una zona gratuita no muestra importes en lugar de mostrar cero. */}
      {importes.length > 0 && (
        <View className="flex-row flex-wrap gap-2">
          {importes.map((texto) => (
            <Text
              key={texto}
              className="rounded-full px-3.5 py-2 text-sm text-gray-500 border border-gray-200"
            >
              {texto}
            </Text>
          ))}
        </View>
      )}
      {/*
        El departamento ya estaba decidido antes de abrir esto: a un vecino se
        le toma el de su ubicacion activa --la del selector de la cabecera-- y
        a la porteria se le pregunta en un modal antes de navegar. Este campo
        era una tercera forma de cambiarlo, de texto libre, y para un huesped
        no tenia ningun sentido: escribir el numero del vecino de al lado no
        le reserva nada, le devuelve un error de permisos de la base. Quien
        tiene dos viviendas cambia en la cabecera, como en el resto de la app.
      */}
      <Controller
        control={control}
        name="depto"
        render={({ field: { value } }) => (
          <View
            className="flex-row items-center gap-2 rounded-xl px-3 py-2.5"
            style={{
              backgroundColor: theme.colors.bgMuted,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            <Ionicons
              name="home-outline"
              size={16}
              color={theme.colors.textSecondary}
            />
            <Text className="text-sm text-gray-900">
              Departamento {value}
            </Text>
          </View>
        )}
      />
      {/*
        Aqui habia un interruptor, «El costo se carga automaticamente a su
        cuota de mantenimiento», que **no se leia en ningun sitio**: no entra
        en el guardado ni en ninguna otra cuenta. Ademas le salia al huesped
        temporal, que no paga cuota de mantenimiento. Cobrar una reserva en la
        cuota no es algo que la app sepa hacer; si se quiere, es trabajo nuevo
        y no un interruptor.
      */}
      {/*
        Se pedia aceptar unos terminos que **no habia forma de leer**. Son el
        reglamento de la zona, que la administracion publica y que hasta ahora
        solo se alcanzaba desde la pantalla anterior.
      */}
      <Controller
        control={control}
        name="acceptTerms"
        render={({ field: { value, onChange } }) => (
          <Toggle
            value={value}
            onChange={onChange}
            labelRight="Acepto el reglamento de la zona"
          />
        )}
      />
      <Pressable onPress={() => setReglamentoAbierto(true)}>
        <Text className="text-xs underline" style={{ color: theme.colors.primary }}>
          Leer el reglamento de {zona.nombre}
        </Text>
      </Pressable>
      <Modal
        visible={reglamentoAbierto}
        onClose={() => setReglamentoAbierto(false)}
        title={`Reglamento de ${zona.nombre}`}
      >
        <Text className="text-sm text-gray-700" style={{ lineHeight: 20 }}>
          {zonaConfig.reglas?.trim()
            ? zonaConfig.reglas
            : "La administración todavía no ha publicado el reglamento de esta zona."}
        </Text>
      </Modal>
      {errors.acceptTerms && (
        <Text className="text-xs text-red-500">
          {errors.acceptTerms.message}
        </Text>
      )}
      <Button fullWidth onPress={handleSubmit} disabled={Boolean(falta)}>
        Aceptar
      </Button>
      {/*
        Un boton apagado sin motivo no se distingue de uno roto. Se dice lo
        que falta, que ademas es lo unico que hace falta saber.
      */}
      {!!falta && (
        <Text className="text-xs text-center" style={{ color: theme.colors.textMuted }}>
          {falta}
        </Text>
      )}
    </View>
  );
}

function SelectField({
  control,
  name,
  label,
  options,
}: {
  control: any;
  name: string;
  label: string;
  options: string[];
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange } }) => (
        <Select
          label={label}
          value={value || null}
          options={options}
          onChange={onChange}
        />
      )}
    />
  );
}
