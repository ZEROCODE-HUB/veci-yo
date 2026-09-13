import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Image, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button, Input, Modal, Select } from "@/shared/components";
import zonaIcons, { zonaBanners } from "@/assets/icons/zonas";
import { useZonasStore } from "@/stores";
import { AdminSectionCard } from "../AdminSectionCard";
import { useAdministradorReservasZona } from "../../hooks/useAdministradorReservasZona";
import { reservaZonaEditSchema } from "../../schemas/reservasZona.schema";
import type { ReservaZonaEditValues } from "../../types/reservasZona";
import type { ReservaZona } from "@/shared/types";

type ReservaVista = ReservaZona & {
  fechaISO: string;
  horaInicio: string;
  horaFin: string;
  estadoVista: string;
};

const ESTADO_STYLES: Record<string, { color: string; backgroundColor: string }> = {
  Confirmada: { color: "#16A34A", backgroundColor: "#DCFCE7" },
  Pendiente: { color: "#CA8A04", backgroundColor: "#FEF9C3" },
  Cancelada: { color: "#DC2626", backgroundColor: "#FEE2E2" },
  Cancelado: { color: "#DC2626", backgroundColor: "#FEE2E2" },
  Rechazada: { color: "#DC2626", backgroundColor: "#FEE2E2" },
  Aprobado: { color: "#16A34A", backgroundColor: "#DCFCE7" },
  Reservado: { color: "#2563EB", backgroundColor: "#DBEAFE" },
  Disponible: { color: "#6B7280", backgroundColor: "#F3F4F6" },
  "No disponible": { color: "#DC2626", backgroundColor: "#FEE2E2" },
};

const DEPARTAMENTOS = ["101", "102", "103", "104", "105", "106", "201", "202", "302", "506 C"];
const RESIDENTES = ["Alberto Manual", "Sofia Martinez", "Luis Torres"];

function parseHorario(horario = "") {
  const match = horario.match(/(\w+)\s+(\d+)\s*hs\s*a\s*(\d+[\d:]*)\s*hs/);
  if (!match) {
    const [horaInicio = "", horaFin = ""] = horario.split("-").map((value) => value.trim());
    return { fechaISO: "", horaInicio: horaInicio.slice(0, 5), horaFin: horaFin.slice(0, 5) };
  }
  const dias: Record<string, number> = { Domingo: 0, Lunes: 1, Martes: 2, Miércoles: 3, Viernes: 5, Sábado: 6, Sabado: 6, Jueves: 4 };
  const day = dias[match[1]];
  if (day === undefined) return { fechaISO: "", horaInicio: "", horaFin: "" };
  const now = new Date();
  const date = new Date(now);
  date.setDate(date.getDate() + ((day + 7 - date.getDay()) % 7));
  const fechaISO = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const horaInicio = `${match[2].padStart(2, "0")}:00`;
  const horaFinParts = match[3].split(":");
  const horaFin = `${horaFinParts[0].padStart(2, "0")}:${(horaFinParts[1] || "00").padStart(2, "0")}`;
  return { fechaISO, horaInicio, horaFin };
}

function toISO(fecha = "") {
  if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return fecha;
  const match = fecha.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : fecha;
}

function formatFecha(fecha = "") {
  const iso = toISO(fecha);
  if (!iso) return "";
  const date = new Date(`${iso}T12:00:00`);
  return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

function normalizeReserva(reserva: ReservaZona): ReservaVista {
  const horario = parseHorario(reserva.horario);
  return {
    ...reserva,
    fechaISO: toISO(reserva.fecha || horario.fechaISO),
    horaInicio: (reserva.horario.includes("hs") ? horario.horaInicio : reserva.horario.split("-")[0]?.trim() || "").slice(0, 5),
    horaFin: (reserva.horario.includes("hs") ? horario.horaFin : reserva.horario.split("-")[1]?.trim() || "").slice(0, 5),
    estadoVista: reserva.estado === "Reservado" ? "Confirmada" : reserva.estado === "Rechazado" ? "Rechazada" : reserva.estado || "Pendiente",
  };
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <View className="flex-row items-center justify-between gap-4"><Text className="text-sm text-gray-500">{label}</Text><Text className="flex-1 text-right text-base font-medium text-gray-900">{value || "—"}</Text></View>;
}

function PickerField({ label, value, placeholder, onPress, icon }: { label: string; value: string; placeholder: string; onPress: () => void; icon: "calendar-outline" | "time-outline" }) {
  return <View className="flex-1"><Text className="mb-1.5 text-sm font-medium text-gray-500">{label}</Text><Pressable onPress={onPress} className="flex-row items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3.5"><Text className={`flex-1 text-base ${value ? "text-gray-900" : "text-gray-400"}`}>{value || placeholder}</Text><Ionicons name={icon} size={18} color="#9CA3AF" /></Pressable></View>;
}

export function GestionZonaReservasView({ id, onCreate }: { id: string; onCreate: (depto: string) => void }) {
  const zona = useZonasStore((state) => state.gestionZonas[id]);
  const { data: allReservations = [], updateEstado, updateReserva, deleteReserva } = useAdministradorReservasZona(id);
  const [filter, setFilter] = useState<"todas" | "futuras" | "pasadas">("todas");
  const [sortAsc, setSortAsc] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [department, setDepartment] = useState("");
  const [detail, setDetail] = useState<ReservaVista | null>(null);
  const [editing, setEditing] = useState<ReservaVista | null>(null);
  const [canceling, setCanceling] = useState<ReservaVista | null>(null);
  const [deleting, setDeleting] = useState<ReservaVista | null>(null);
  const [picker, setPicker] = useState<"date" | "horaInicio" | "horaFin" | null>(null);
  const [formError, setFormError] = useState("");
  const { control, handleSubmit, reset, setValue, watch } = useForm<ReservaZonaEditValues>({ resolver: zodResolver(reservaZonaEditSchema), defaultValues: { nombre: "", depto: "", fecha: "", horaInicio: "", horaFin: "", comentarios: "" } });
  const reservations = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const list = allReservations.map(normalizeReserva).filter((item) => filter === "todas" || (filter === "futuras" ? item.fechaISO >= today : item.fechaISO < today));
    return list.sort((a, b) => {
      const comparison = `${a.fechaISO}${a.horaInicio}`.localeCompare(`${b.fechaISO}${b.horaInicio}`);
      return sortAsc ? comparison : -comparison;
    });
  }, [allReservations, filter, sortAsc]);
  const banner = (zona && (zonaBanners as Record<string, number>)[zona.id]) || (zona && (zonaIcons as Record<string, number>)[zona.id]);

  const startEdit = (reservation: ReservaVista) => {
    setEditing(reservation);
    reset({ nombre: reservation.nombre || "", depto: reservation.depto || "", fecha: reservation.fechaISO || "", horaInicio: reservation.horaInicio || "", horaFin: reservation.horaFin || "", comentarios: reservation.comentarios || "" });
    setFormError("");
  };
  const saveEdit = (values: ReservaZonaEditValues) => {
    const { horaInicio, horaFin } = values;
    if (!values.nombre || !values.depto || !values.fecha || !horaInicio || !horaFin) return setFormError("Completa todos los campos obligatorios");
    if (horaInicio >= horaFin) return setFormError("La hora de fin debe ser posterior a la de inicio");
    if (editing) updateReserva({ id: editing.id, datos: { nombre: values.nombre, depto: values.depto, fecha: values.fecha, horario: `${horaInicio} - ${horaFin}`, comentarios: values.comentarios } });
    setEditing(null);
    setFormError("");
  };

  const pickerDate = () => {
    const value = picker === "date" ? watch("fecha") : picker === "horaInicio" ? watch("horaInicio") : watch("horaFin");
    if (picker === "date" && value) return new Date(`${value}T12:00:00`);
    if (picker !== "date" && value) {
      const [hours, minutes] = value.split(":").map(Number);
      const date = new Date();
      date.setHours(hours || 0, minutes || 0, 0, 0);
      return date;
    }
    return new Date();
  };

  const handlePickerValueChange = (_event: unknown, date?: Date) => {
    if (!picker || !date) return;
    if (picker === "date") {
      setValue("fecha", `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`);
    } else {
      const value = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
      setValue(picker, value);
    }
    if (Platform.OS === "android") setPicker(null);
  };

  if (!zona) return <View className="items-center px-4 py-10"><Text className="text-base text-gray-500">Zona no encontrada</Text></View>;

  return <>
    <ScrollView className="flex-1" contentContainerClassName="pb-6">
      <View className="h-[150px] overflow-hidden bg-[#D4C5A9]">
        {banner ? <Image source={banner} className="h-full w-full" resizeMode="cover" /> : <View className="flex-1 items-center justify-center"><Text className="text-5xl opacity-50">🏠</Text></View>}
        <View className="absolute inset-0 justify-end bg-black/30 px-4 py-3"><Text className="text-2xl font-bold text-white">{zona.nombre}</Text></View>
      </View>
      <View className="mb-4 gap-2.5 px-4 pt-3">
        <View className="flex-row flex-wrap gap-2"><Text className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-900">{zona.tipo}</Text><Text className={`rounded-full px-3 py-1 text-xs ${zona.activa ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{zona.activa ? "Activa" : "Inactiva"}</Text><Text className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-900">🕐 {zona.horarioApertura} - {zona.horarioCierre}</Text></View>
      </View>
      <View className="mb-3 gap-2.5 px-4">
        <View className="flex-row flex-wrap items-center gap-2"><Button size="sm" variant={filter === "todas" ? "primary" : "secondary"} onPress={() => setFilter("todas")}>Todas</Button><Button size="sm" variant={filter === "futuras" ? "primary" : "secondary"} onPress={() => setFilter("futuras")}>Futuras</Button><Button size="sm" variant={filter === "pasadas" ? "primary" : "secondary"} onPress={() => setFilter("pasadas")}>Pasadas</Button><Button size="sm" variant="ghost" onPress={() => setSortAsc((value) => !value)}>{sortAsc ? "↑ Fecha" : "↓ Fecha"}</Button></View>
        <Button fullWidth onPress={() => { setDepartment(""); setCreateOpen(true); }}>+ Crear Reserva</Button>
      </View>
      <View className="gap-2.5 px-4">
        {reservations.length === 0 ? <Text className="px-4 py-10 text-center text-base text-gray-500">No hay reservas{filter !== "todas" ? ` ${filter === "futuras" ? "futuras" : "pasadas"}` : ""} para esta zona.</Text> : reservations.map((reservation) => {
          const status = ESTADO_STYLES[reservation.estadoVista] || ESTADO_STYLES.Disponible;
          return <View key={reservation.id} className="gap-2 rounded-2xl bg-white p-4" style={{ elevation: 3, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}>
            <View className="flex-row items-start gap-2"><View className="flex-1"><Text className="text-base font-semibold text-gray-900">{reservation.nombre || reservation.depto || "Reserva"}</Text><Text className="mt-0.5 text-sm text-gray-500">{reservation.depto} {reservation.reservaNum ? `· N° ${reservation.reservaNum}` : ""}</Text></View><Text className="rounded-full px-2.5 py-1 text-xs font-semibold" style={status}>{reservation.estadoVista}</Text></View>
            <View className="flex-row flex-wrap gap-2.5"><Text className="text-xs text-gray-400">📅 {reservation.fechaISO ? formatFecha(reservation.fechaISO) : "—"}</Text>{reservation.horaInicio && <Text className="text-xs text-gray-400">⏰ {reservation.horaInicio} - {reservation.horaFin}</Text>}</View>
            {reservation.comentarios && <Text className="text-xs leading-4 text-gray-500">💬 {reservation.comentarios}</Text>}
            <View className="flex-row flex-wrap gap-1.5"><View className="min-w-[45%] flex-1"><Button size="sm" variant="secondary" fullWidth onPress={() => setDetail(reservation)}>Detalle</Button></View><View className="min-w-[45%] flex-1"><Button size="sm" variant="secondary" fullWidth onPress={() => startEdit(reservation)}>Editar</Button></View><View className="min-w-[45%] flex-1"><Button size="sm" variant="secondary" fullWidth onPress={() => setCanceling(reservation)}>Cancelar</Button></View><View className="min-w-[45%] flex-1"><Button size="sm" variant="danger" fullWidth onPress={() => setDeleting(reservation)}>Eliminar</Button></View></View>
          </View>;
        })}
      </View>
    </ScrollView>

    <Modal visible={createOpen} onClose={() => setCreateOpen(false)} title="Nueva Reserva"><View className="gap-4"><Select label="¿Para qué departamento es la reserva?" value={department} options={DEPARTAMENTOS} onChange={(value) => setDepartment(String(value))} placeholder="Seleccione el departamento" /><Button fullWidth disabled={!department} onPress={() => { setCreateOpen(false); onCreate(department); }}>Continuar</Button></View></Modal>
    <Modal visible={!!editing} onClose={() => { setEditing(null); setFormError(""); }} title="Editar Reserva"><View className="gap-4"><Controller control={control} name="nombre" render={({ field }) => <Select label="Residente *" value={field.value} options={RESIDENTES} onChange={(value) => field.onChange(String(value))} placeholder="Seleccionar residente" />} /><Controller control={control} name="nombre" render={({ field }) => <Input label="Nombre del residente *" value={field.value} onChangeText={field.onChange} placeholder="Nombre completo" />} /><Controller control={control} name="depto" render={({ field }) => <Input label="Apartamento / Unidad *" value={field.value} onChangeText={field.onChange} placeholder="Ej: 506 C" />} /><Controller control={control} name="fecha" render={({ field }) => <PickerField label="Fecha *" value={field.value ? formatFecha(field.value) : ""} placeholder="Seleccionar fecha" onPress={() => setPicker("date")} icon="calendar-outline" />} /><View className="flex-row gap-2.5"><Controller control={control} name="horaInicio" render={({ field }) => <PickerField label="Hora inicio *" value={field.value} placeholder="Seleccionar hora" onPress={() => setPicker("horaInicio")} icon="time-outline" />} /><Controller control={control} name="horaFin" render={({ field }) => <PickerField label="Hora fin *" value={field.value} placeholder="Seleccionar hora" onPress={() => setPicker("horaFin")} icon="time-outline" />} /></View><Controller control={control} name="comentarios" render={({ field }) => <Input label="Observaciones" value={field.value} onChangeText={field.onChange} placeholder="Opcional" multiline rows={3} />} />{formError && <Text className="text-center text-sm text-red-600">{formError}</Text>}<Button fullWidth onPress={() => void handleSubmit(saveEdit)()}>Guardar Cambios</Button></View></Modal>
    {picker && <DateTimePicker mode={picker === "date" ? "date" : "time"} value={pickerDate()} display="default" onValueChange={handlePickerValueChange} onDismiss={() => setPicker(null)} />}
    <Modal visible={!!detail} onClose={() => setDetail(null)} title="Detalle de Reserva">{detail && <View className="gap-3"><InfoRow label="N° Reserva" value={detail.reservaNum} /><InfoRow label="Residente" value={detail.nombre} /><InfoRow label="Apartamento" value={detail.depto} /><InfoRow label="Fecha" value={formatFecha(detail.fechaISO)} /><InfoRow label="Horario" value={detail.horaInicio ? `${detail.horaInicio} - ${detail.horaFin}` : ""} /><View className="flex-row items-center justify-between gap-4"><Text className="text-sm text-gray-500">Estado</Text><Text className="rounded-full px-2.5 py-1 text-xs font-semibold" style={ESTADO_STYLES[detail.estadoVista] || ESTADO_STYLES.Disponible}>{detail.estadoVista}</Text></View>{detail.comentarios && <View><Text className="mb-1 text-sm text-gray-500">Observaciones</Text><Text className="text-sm leading-5 text-gray-900">{detail.comentarios}</Text></View>}</View>}</Modal>
    <Modal visible={!!canceling} onClose={() => setCanceling(null)} title="Cancelar Reserva"><View className="gap-4"><Text className="text-center text-base leading-6 text-gray-900">¿Deseas cancelar esta reserva?</Text>{canceling && <View className="gap-1 rounded-xl bg-gray-100 p-3"><Text className="text-sm text-gray-900"><Text className="font-bold">Residente:</Text> {canceling.nombre || canceling.depto}</Text><Text className="text-sm text-gray-900"><Text className="font-bold">Fecha:</Text> {formatFecha(canceling.fechaISO)}</Text><Text className="text-sm text-gray-900"><Text className="font-bold">Horario:</Text> {canceling.horaInicio} - {canceling.horaFin}</Text></View>}<View className="flex-row gap-2.5"><View className="flex-1"><Button variant="secondary" fullWidth onPress={() => setCanceling(null)}>Volver</Button></View><View className="flex-1"><Button variant="danger" fullWidth onPress={() => { if (canceling) updateEstado({ id: canceling.id, estado: "Cancelada" }); setCanceling(null); }}>Cancelar Reserva</Button></View></View></View></Modal>
    <Modal visible={!!deleting} onClose={() => setDeleting(null)} title="Eliminar Reserva"><View className="gap-4"><Text className="text-center text-base leading-6 text-gray-900">¿Deseas eliminar permanentemente esta reserva?</Text><Text className="text-center text-sm text-gray-500">Esta acción no puede deshacerse.</Text><View className="flex-row gap-2.5"><View className="flex-1"><Button variant="secondary" fullWidth onPress={() => setDeleting(null)}>Cancelar</Button></View><View className="flex-1"><Button variant="danger" fullWidth onPress={() => { if (deleting) deleteReserva(deleting.id); setDeleting(null); }}>Eliminar</Button></View></View></View></Modal>
  </>;
}
