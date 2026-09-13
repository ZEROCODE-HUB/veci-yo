import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ScrollView, Text, View } from "react-native";
import {
  Button,
  ImageUploadCard,
  Input,
  Modal,
  Select,
  Toggle,
} from "@/shared/components";
import { AdminSectionCard } from "../AdminSectionCard";
import { gestionZonaSchema } from "../../schemas/gestionZona.schema";
import {
  DIAS_ZONA,
  MONEDAS_ZONA,
  TIPOS_FECHA_ESPECIAL,
  TIPOS_ZONA,
  type GestionZonaFormValues,
} from "../../types/gestionZona";
import zonaIcons, { zonaBanners } from "@/assets/icons/zonas";

const OPCIONES_HORA = Array.from({ length: 30 }, (_, index) => {
  const totalMinutes = 8 * 60 + index * 30;
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:${String(totalMinutes % 60).padStart(2, "0")}`;
}).filter((hora) => hora !== "22:30");

const TIPO_A_ID: Record<string, string> = {
  Barbecue: "bbq",
  "Swimming Pool": "piscina",
  "Children's Park": "parque",
  Gym: "gym",
  "Coworking Space": "coworking",
  "Tennis Court": "tenis",
  "Game Room": "sala-juegos",
  "Laundry Room": "lavanderia",
};

function NumberField({
  control,
  name,
  label,
  placeholder = "0",
}: {
  control: any;
  name: keyof GestionZonaFormValues;
  label: string;
  placeholder?: string;
}) {
  return (
    <Controller
      control={control}
      name={name as never}
      render={({ field, fieldState }) => (
        <Input
          label={label}
          value={String(field.value ?? "")}
          onChangeText={(value) =>
            field.onChange(value === "" ? 0 : Number(value))
          }
          placeholder={placeholder}
          type="numeric"
          error={fieldState.error?.message}
          showEditIcon={false}
        />
      )}
    />
  );
}

function FechaEspecialRow({
  value,
  onChange,
  onRemove,
}: {
  value: GestionZonaFormValues["fechasEspeciales"][number];
  onChange: (value: GestionZonaFormValues["fechasEspeciales"][number]) => void;
  onRemove: () => void;
}) {
  const tipo = TIPOS_FECHA_ESPECIAL.find(
    (option) => option.value === value.tipo,
  );
  return (
    <View className="gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
      <View className="flex-row items-center gap-2">
        <View className="flex-1">
          <Input
            value={value.fecha}
            onChangeText={(fecha) => onChange({ ...value, fecha })}
            placeholder="AAAA-MM-DD"
            showEditIcon={false}
          />
        </View>
        <Button variant="ghost" size="sm" onPress={onRemove}>
          <Text className="text-lg text-danger">✕</Text>
        </Button>
      </View>
      <Select
        value={value.tipo}
        options={TIPOS_FECHA_ESPECIAL}
        onChange={(selected) => onChange({ ...value, tipo: String(selected) })}
        placeholder="Tipo de excepción"
      />
      <Input
        value={value.motivo}
        onChangeText={(motivo) => onChange({ ...value, motivo })}
        placeholder="Motivo (ej: Mantenimiento anual)"
        showEditIcon={false}
      />
      {tipo?.value === "horario_especial" && (
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Input
              label="Apertura"
              value={value.horaApertura || ""}
              onChangeText={(horaApertura) =>
                onChange({ ...value, horaApertura })
              }
              placeholder="08:00"
              showEditIcon={false}
            />
          </View>
          <View className="flex-1">
            <Input
              label="Cierre"
              value={value.horaCierre || ""}
              onChangeText={(horaCierre) => onChange({ ...value, horaCierre })}
              placeholder="22:00"
              showEditIcon={false}
            />
          </View>
        </View>
      )}
    </View>
  );
}

export function GestionZonaForm({
  initial,
  onSave,
  onSuccess,
  isNew,
}: {
  initial: GestionZonaFormValues;
  onSave: (value: GestionZonaFormValues) => void;
  onSuccess: () => void;
  isNew: boolean;
}) {
  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<GestionZonaFormValues>({
    resolver: zodResolver(gestionZonaSchema),
    defaultValues: initial,
    mode: "onSubmit",
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const days = watch("diasHabilitados");
  const usaSlots = watch("usaSlots");
  const cantidadBloques = watch("cantidadBloques");
  const bloques = watch("bloques");
  const fechasEspeciales = watch("fechasEspeciales");
  const tipo = watch("tipo");
  const tipoId = TIPO_A_ID[tipo];
  const defaultSource = tipoId
    ? (zonaBanners as Record<string, number>)[tipoId] ||
      (zonaIcons as Record<string, number>)[tipoId]
    : undefined;

  useEffect(() => reset(initial), [initial, reset]);

  const errorMessages = useMemo(() => {
    const messages: string[] = [];
    const collect = (error: any) => {
      if (!error) return;
      if (typeof error.message === "string") messages.push(error.message);
      if (typeof error === "object")
        Object.values(error).forEach((child) => {
          if (child && typeof child === "object" && child !== error)
            collect(child);
        });
    };
    collect(errors);
    return [...new Set(messages)];
  }, [errors]);

  const submit = (value: GestionZonaFormValues) => {
    onSave(value);
    setShowSuccess(true);
  };
  const addFechaEspecial = () =>
    setValue("fechasEspeciales", [
      ...fechasEspeciales,
      {
        fecha: "",
        tipo: "cerrado",
        motivo: "",
        horaApertura: "",
        horaCierre: "",
      },
    ]);

  return (
    <>
      <ScrollView className="flex-1" contentContainerClassName="gap-3.5 p-4">
        <AdminSectionCard title="Información General">
          <Controller
            control={control}
            name="nombre"
            render={({ field, fieldState }) => (
              <Input
                label="Nombre de la zona"
                value={field.value}
                onChangeText={field.onChange}
                placeholder="Ej: BBQ Principal"
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="tipo"
            render={({ field }) => (
              <Select
                label="Tipo de zona"
                value={field.value}
                options={TIPOS_ZONA}
                onChange={field.onChange}
                placeholder="Selecciona un tipo"
              />
            )}
          />
          <Controller
            control={control}
            name="descripcion"
            render={({ field }) => (
              <Input
                label="Descripción (opcional)"
                value={field.value}
                onChangeText={field.onChange}
                placeholder="Describe la zona común"
                multiline
                rows={3}
              />
            )}
          />
          <Controller
            control={control}
            name="imagen"
            render={({ field }) => (
              <ImageUploadCard
                label="Imagen / Banner"
                value={field.value}
                onChange={field.onChange}
                defaultSource={!isNew ? defaultSource : undefined}
                placeholder="Subir imagen personalizada"
                helperText={!isNew && defaultSource ? "Imagen predeterminada según el tipo de zona. Podés subir una personalizada." : undefined}
                height={140}
              />
            )}
          />
        </AdminSectionCard>

        <AdminSectionCard title="Configuración de horarios">
          <View className="flex-row gap-2.5">
            <View className="flex-1">
              <Controller
                control={control}
                name="horarioApertura"
                render={({ field }) => (
                  <Input
                    label="Hora de apertura"
                    value={field.value}
                    onChangeText={field.onChange}
                    placeholder="08:00"
                    showEditIcon={false}
                  />
                )}
              />
            </View>
            <View className="flex-1">
              <Controller
                control={control}
                name="horarioCierre"
                render={({ field }) => (
                  <Input
                    label="Hora de cierre"
                    value={field.value}
                    onChangeText={field.onChange}
                    placeholder="22:00"
                    showEditIcon={false}
                  />
                )}
              />
            </View>
          </View>
          <View className="flex-row gap-2.5">
            <View className="flex-1">
              <NumberField
                control={control}
                name="duracionMinima"
                label="Duración mínima (min)"
                placeholder="1"
              />
            </View>
            <View className="flex-1">
              <NumberField
                control={control}
                name="duracionMaxima"
                label="Duración máxima (min)"
                placeholder="1"
              />
            </View>
          </View>
          <NumberField
            control={control}
            name="tiempoMinimoEntreReservas"
            label="Tiempo mínimo entre reservas (min)"
          />
          <Text className="text-sm font-medium text-gray-500">
            Días habilitados
          </Text>
          <View className="flex-row flex-wrap gap-1.5">
            {DIAS_ZONA.map((day) => {
              const active = days.includes(day);
              return (
                <Button
                  key={day}
                  size="sm"
                  variant={active ? "primary" : "secondary"}
                  onPress={() =>
                    setValue(
                      "diasHabilitados",
                      active
                        ? days.filter((item) => item !== day)
                        : [...days, day],
                    )
                  }
                >{`${day}${active ? " ✓" : ""}`}</Button>
              );
            })}
          </View>
        </AdminSectionCard>

        <AdminSectionCard title="Configuración de reserva">
          <Controller
            control={control}
            name="usaSlots"
            render={({ field }) => (
              <Toggle
                value={field.value}
                onChange={field.onChange}
                label={
                  field.value ? "Por bloques (horarios fijos)" : "Horario libre"
                }
              />
            )}
          />
          <Text className="text-xs leading-4 text-gray-500">
            {usaSlots
              ? "Los residentes reservan uno de los bloques fijos que defines a continuación."
              : "Los residentes reservan un rango de horas dentro del horario de apertura y cierre."}
          </Text>
          {usaSlots && (
            <>
              <Select
                label="Número de bloques"
                value={cantidadBloques}
                options={[1, 2, 3, 4, 5, 6, 7, 8].map((value) => ({
                  value,
                  label: `${value} bloque${value > 1 ? "s" : ""}`,
                }))}
                onChange={(value) => setValue("cantidadBloques", Number(value))}
              />
              {bloques.slice(0, cantidadBloques).map((bloque, index) => (
                <View
                  key={index}
                  className="gap-1 rounded-xl border border-gray-200 bg-gray-50 p-3"
                >
                  <Text className="text-xs font-medium text-gray-500">
                    Bloque {index + 1}
                  </Text>
                  <View className="flex-row items-center gap-2">
                    <View className="flex-1">
                      <Select
                        value={bloque.inicio}
                        options={OPCIONES_HORA}
                        onChange={(value) =>
                          setValue(`bloques.${index}.inicio`, String(value))
                        }
                      />
                    </View>
                    <Text className="text-sm text-gray-400">a</Text>
                    <View className="flex-1">
                      <Select
                        value={bloque.fin}
                        options={OPCIONES_HORA}
                        onChange={(value) =>
                          setValue(`bloques.${index}.fin`, String(value))
                        }
                      />
                    </View>
                  </View>
                </View>
              ))}
            </>
          )}
          <NumberField
            control={control}
            name="duracionPermitida"
            label="Duración máxima de reserva (horas)"
            placeholder="1"
          />
          {usaSlots && (
            <Controller
              control={control}
              name="horariosDisponibles"
              render={({ field }) => (
                <Input
                  label="Horarios disponibles (separados por coma)"
                  value={(field.value || []).join(", ")}
                  onChangeText={(value) =>
                    field.onChange(
                      value
                        .split(",")
                        .map((item) => item.trim())
                        .filter(Boolean),
                    )
                  }
                  placeholder="Ej: 08:00 - 12:00, 14:00 - 18:00"
                />
              )}
            />
          )}
          <Controller
            control={control}
            name="reglamento"
            render={({ field }) => (
              <Input
                label="Reglamento de la zona"
                value={field.value || ""}
                onChangeText={field.onChange}
                placeholder="Reglamento que verán los residentes"
                multiline
                rows={3}
              />
            )}
          />
        </AdminSectionCard>

        <AdminSectionCard title="Fechas especiales">
          <Text className="text-xs leading-4 text-gray-500">
            Administra excepciones como mantenimiento, eventos privados o
            feriados.
          </Text>
          {fechasEspeciales.map((fecha, index) => (
            <FechaEspecialRow
              key={`${index}-${fecha.fecha}`}
              value={fecha}
              onChange={(value) => setValue(`fechasEspeciales.${index}`, value)}
              onRemove={() =>
                setValue(
                  "fechasEspeciales",
                  fechasEspeciales.filter(
                    (_, itemIndex) => itemIndex !== index,
                  ),
                )
              }
            />
          ))}
          <Button variant="ghost" fullWidth onPress={addFechaEspecial}>
            + Agregar fecha especial
          </Button>
        </AdminSectionCard>

        <AdminSectionCard title="Configuración económica">
          <View className="flex-row gap-2.5">
            <View className="flex-1">
              <NumberField
                control={control}
                name="montoGarantia"
                label="Monto de garantía"
              />
            </View>
            <View className="flex-1">
              <NumberField
                control={control}
                name="costoLimpieza"
                label="Costo de limpieza"
              />
            </View>
          </View>
          <View className="flex-row gap-2.5">
            <View className="flex-1">
              <NumberField
                control={control}
                name="costoReserva"
                label="Costo de reserva"
              />
            </View>
            <View className="flex-1">
              <Controller
                control={control}
                name="moneda"
                render={({ field }) => (
                  <Select
                    label="Moneda"
                    value={field.value}
                    options={MONEDAS_ZONA}
                    onChange={field.onChange}
                  />
                )}
              />
            </View>
          </View>
        </AdminSectionCard>

        <AdminSectionCard title="Estado">
          <Controller
            control={control}
            name="activa"
            render={({ field }) => (
              <Toggle
                value={field.value}
                onChange={field.onChange}
                labelRight={field.value ? "Activa" : "Inactiva"}
              />
            )}
          />
          <Text className="text-xs text-gray-400">
            {watch("activa")
              ? "La zona estará disponible para reservas de los residentes."
              : "Al estar inactiva, no aparecerá para reservas de los residentes."}
          </Text>
        </AdminSectionCard>
        <AdminSectionCard title="Aprobación del administrador">
          <Controller
            control={control}
            name="requiereAprobacion"
            render={({ field }) => (
              <Toggle
                value={field.value}
                onChange={field.onChange}
                labelRight="Las reservas requieren aprobación del administrador"
                labelRightClassName="flex-1"
              />
            )}
          />
          <Text className="text-xs leading-4 text-gray-400">
            {watch("requiereAprobacion")
              ? "Las reservas quedarán en estado Pendiente y deberán ser aprobadas por el administrador. El usuario podrá subir comprobante de pago."
              : "Las reservas se confirmarán automáticamente."}
          </Text>
        </AdminSectionCard>
        <AdminSectionCard title="Permitido por tipo de estancia">
          <Controller
            control={control}
            name="permiteCorta"
            render={({ field }) => (
              <Toggle
                value={field.value}
                onChange={field.onChange}
                labelRight="Permitido para estancias cortas"
              />
            )}
          />
          <Controller
            control={control}
            name="permiteLarga"
            render={({ field }) => (
              <Toggle
                value={field.value}
                onChange={field.onChange}
                labelRight="Permitido para estancias largas"
              />
            )}
          />
          <Text className="text-xs leading-4 text-gray-400">
            Define si esta zona puede ser usada por residentes de estancia corta
            y/o larga. Ambos pueden estar activos simultáneamente.
          </Text>
        </AdminSectionCard>

        {errorMessages.length > 0 && (
          <View className="gap-1 rounded-xl bg-red-50 px-4 py-3">
            {errorMessages.map((error) => (
              <Text key={error} className="text-xs leading-4 text-red-600">
                ⚠ {error}
              </Text>
            ))}
          </View>
        )}
        <Button
          fullWidth
          loading={isSubmitting}
          onPress={() => void handleSubmit(submit)()}
        >
          {isNew ? "Crear Zona Común" : "Guardar Cambios"}
        </Button>
        <View className="h-4" />
      </ScrollView>
      <Modal
        visible={showSuccess}
        onClose={() => setShowSuccess(false)}
        title=""
      >
        <View className="items-center gap-4 py-3">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <Text className="text-3xl text-green-600">✓</Text>
          </View>
          <Text className="text-center text-base font-semibold text-gray-900">
            {isNew
              ? "Zona común creada con éxito"
              : "Zona común actualizada con éxito"}
          </Text>
          <Button fullWidth onPress={onSuccess}>
            Ir a Gestión de Zonas
          </Button>
        </View>
      </Modal>
    </>
  );
}
