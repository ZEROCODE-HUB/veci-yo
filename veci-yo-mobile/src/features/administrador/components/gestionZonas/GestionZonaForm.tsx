import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ScrollView, Text, View } from "react-native";
import { Button, ImageUploadCard, Input, Select, Toggle } from "@/shared/components";
import { AdminSectionCard } from "../AdminSectionCard";
import { gestionZonaSchema } from "../../schemas/gestionZona.schema";
import { DIAS_ZONA, TIPOS_ZONA, type GestionZonaFormValues } from "../../types/gestionZona";
const DURATIONS = ["30", "60", "120", "180", "240", "480"];
export function GestionZonaForm({ initial, onSave }: { initial: GestionZonaFormValues; onSave: (value: GestionZonaFormValues) => void }) {
  const { control, handleSubmit, reset, watch, setValue } = useForm<GestionZonaFormValues>({ resolver: zodResolver(gestionZonaSchema), defaultValues: initial });
  const days = watch("diasHabilitados");
  useEffect(() => reset(initial), [initial, reset]);
  const numberField = (name: keyof GestionZonaFormValues, label: string) => <Controller control={control} name={name as never} render={({ field }) => <Input label={label} value={String(field.value ?? 0)} onChangeText={(value) => field.onChange(Number(value))} type="numeric" />} />;
  return <ScrollView className="flex-1" contentContainerClassName="p-4 gap-4">
    <AdminSectionCard title="Informacion de la zona">
      <Controller control={control} name="nombre" render={({ field }) => <Input label="Nombre" value={field.value} onChangeText={field.onChange} />} />
      <Controller control={control} name="tipo" render={({ field }) => <Select label="Tipo" value={field.value} options={TIPOS_ZONA} onChange={field.onChange} />} />
      <Controller control={control} name="descripcion" render={({ field }) => <Input label="Descripcion" value={field.value} onChangeText={field.onChange} multiline rows={3} />} />
      <Controller control={control} name="imagen" render={({ field }) => <ImageUploadCard label="Imagen / Banner" value={field.value} onChange={field.onChange} placeholder="Subir imagen personalizada" />} />
    </AdminSectionCard>
    <AdminSectionCard title="Configuracion de horarios">
      <View className="flex-row gap-3"><View className="flex-1"><Controller control={control} name="horarioApertura" render={({ field }) => <Input label="Apertura" value={field.value} onChangeText={field.onChange} />} /></View><View className="flex-1"><Controller control={control} name="horarioCierre" render={({ field }) => <Input label="Cierre" value={field.value} onChangeText={field.onChange} />} /></View></View>
      <Controller control={control} name="duracionMinima" render={({ field }) => <Select label="Duracion minima" value={String(field.value)} options={DURATIONS} onChange={(value) => field.onChange(Number(value))} />} />
      <Controller control={control} name="duracionMaxima" render={({ field }) => <Select label="Duracion maxima" value={String(field.value)} options={DURATIONS} onChange={(value) => field.onChange(Number(value))} />} />
      {numberField("tiempoMinimoEntreReservas", "Tiempo minimo entre reservas")}
      <Text className="text-sm text-gray-500 font-medium">Dias habilitados</Text><View className="flex-row flex-wrap gap-2">{DIAS_ZONA.map((day) => <Button key={day} size="sm" variant={days.includes(day) ? "primary" : "secondary"} onPress={() => setValue("diasHabilitados", days.includes(day) ? days.filter((item) => item !== day) : [...days, day])}>{day}</Button>)}</View>
    </AdminSectionCard>
    <AdminSectionCard title="Configuracion de reserva">
      <Controller control={control} name="usaSlots" render={({ field }) => <Toggle value={!!field.value} onChange={field.onChange} label={field.value ? "Por bloques (horarios fijos)" : "Horario libre"} />} />
      {numberField("duracionPermitida", "Duracion maxima de reserva (horas)")}
      <Controller control={control} name="horariosDisponibles" render={({ field }) => <Input label="Horarios disponibles" value={(field.value || []).join(", ")} onChangeText={(value) => field.onChange(value.split(",").map((item) => item.trim()).filter(Boolean))} />} />
      <Controller control={control} name="reglamento" render={({ field }) => <Input label="Reglamento de la zona" value={field.value || ""} onChangeText={field.onChange} multiline rows={3} />} />
    </AdminSectionCard>
    <AdminSectionCard title="Configuracion economica">{numberField("montoGarantia", "Garantia")}{numberField("costoLimpieza", "Costo de limpieza")}{numberField("costoReserva", "Costo de reserva")}<Controller control={control} name="moneda" render={({ field }) => <Select label="Moneda" value={field.value} options={["COP", "USD", "PEN", "EUR"]} onChange={field.onChange} />} /></AdminSectionCard>
    <AdminSectionCard title="Estado"><Controller control={control} name="activa" render={({ field }) => <Toggle value={field.value} onChange={field.onChange} label={field.value ? "Activa" : "Inactiva"} />} /><Controller control={control} name="requiereAprobacion" render={({ field }) => <Toggle value={!!field.value} onChange={field.onChange} label="Las reservas requieren aprobacion" />} /><Controller control={control} name="permiteCorta" render={({ field }) => <Toggle value={field.value !== false} onChange={field.onChange} label="Permitido para estancias cortas" />} /><Controller control={control} name="permiteLarga" render={({ field }) => <Toggle value={field.value !== false} onChange={field.onChange} label="Permitido para estancias largas" />} /></AdminSectionCard>
    <Button fullWidth disabled={!watch("nombre")} onPress={() => void handleSubmit(onSave)()}>Guardar zona</Button>
  </ScrollView>;
}
