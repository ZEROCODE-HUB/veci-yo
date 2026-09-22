import { useMemo, useState } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAuthStore, useUbicacionStore } from "@/stores";
import { useUnidadesDisponibles } from "@/shared/hooks";
import type { ReservaZona } from "@/shared/types";
import { useZonas } from "./useZonas";

/**
 * Estado y reglas de la pantalla de una zona comun.
 *
 * La pantalla tenia 758 lineas, con veinte `useState`, cuatro `useMemo` y las
 * funciones de parseo de horarios mezcladas con el JSX.
 */

const DAYS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];
const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

function parseHorario(horario: string) {
  const match = horario
    .toLowerCase()
    .match(/(\d{1,2})[:\s]*(\d{2})?.*?(?:a|-)\s*(\d{1,2})[:\s]*(\d{2})?/);
  if (!match) return null;
  const from = Number(match[1]) * 60 + Number(match[2] || 0);
  const to = Number(match[3]) * 60 + Number(match[4] || 0);
  if (Number.isNaN(from) || Number.isNaN(to)) return null;
  return { from, to };
}
/**
 * Medias horas dentro del horario de la zona.
 *
 * Era una lista fija de 08:00 a 22:00 para todas: el gimnasio abre a las 06:00
 * y el salon de eventos cierra a las 23:00, asi que la grilla ocultaba horas
 * reservables y ofrecia otras con la zona cerrada.
 */
export function mediasHoras(apertura?: string, cierre?: string): string[] {
  const aMinutos = (hora: string) => {
    const [h, m] = hora.split(":").map(Number);
    return h * 60 + (m || 0);
  };
  if (!apertura || !cierre) return [];
  const desde = aMinutos(apertura);
  const hasta = aMinutos(cierre);
  if (hasta <= desde) return [];

  const resultado: string[] = [];
  for (let minuto = desde; minuto < hasta; minuto += 30) {
    resultado.push(
      `${String(Math.floor(minuto / 60)).padStart(2, "0")}:${String(minuto % 60).padStart(2, "0")}`,
    );
  }
  return resultado;
}
export function useZonaDetalles() {
  const navigation = useNavigation<any>();
  // Los departamentos salen de las unidades reales del edificio, no de una
  // lista fija con codigos que no existen.
  const { codigosDe } = useUnidadesDisponibles();
  const route = useRoute<any>();
  const zonaId = route.params?.zonaId as string;
  const rol = useAuthStore((state) => state.rolActivo);
  const usuario = useAuthStore((state) => state.usuario);
  const ubicaciones = useUbicacionStore((state) => state.ubicaciones);
  const {
    reservas,
    zonasComunesConfig,
    cargando,
    actualizarEstadoReserva,
    eliminarReserva,
    actualizarPersonaReserva,
  } = useZonas();
  // Antes caia a `zonasComunes[0]` -- la piscina inventada -- cuando el id no
  // existia, asi que una zona borrada mostraba los datos de otra.
  const zonaConfig = zonasComunesConfig[zonaId];
  const zona = zonaConfig;
  const esGuardiaAdmin = rol === "guardia" || rol === "administrador";
  const esGuardia = rol === "guardia";
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [dayFilter, setDayFilter] = useState<"hoy" | "manana" | null>("hoy");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [fechaDesde, setFechaDesde] = useState<Date | null>(null);
  const [fechaHasta, setFechaHasta] = useState<Date | null>(null);
  const [datePicker, setDatePicker] = useState<"desde" | "hasta" | null>(null);
  const [deptoReservaOpen, setDeptoReservaOpen] = useState(false);
  const [deptoReserva, setDeptoReserva] = useState("");
  const [deptoReservaTarget, setDeptoReservaTarget] = useState<{
    horaPre?: string;
    fechaPre?: string;
  } | null>(null);
  const [menuItem, setMenuItem] = useState<ReservaZona | null>(null);
  const [detailItem, setDetailItem] = useState<ReservaZona | null>(null);
  const [deleteItem, setDeleteItem] = useState<ReservaZona | null>(null);
  const [incidenciaItem, setIncidenciaItem] = useState<ReservaZona | null>(
    null,
  );
  const [incidenciaTexto, setIncidenciaTexto] = useState("");
  const [ruleOpen, setRuleOpen] = useState(false);
  const [personNames, setPersonNames] = useState<string[]>([]);

  const abrirReserva = (horaPre = "", fechaPre = "") => {
    if (esGuardiaAdmin) {
      setDeptoReserva("");
      setDeptoReservaTarget({ horaPre, fechaPre });
      setDeptoReservaOpen(true);
      return;
    }
    navigation.navigate("ZonaReservar", {
      zonaId,
      horaPre,
      fechaPre,
      deptoReserva:
        ubicaciones.find((item) => item.favorito)?.codigo ?? codigosDe()[0] ?? "",
    });
  };

  const dateInRange = (value: string | undefined) => {
    if (!fechaDesde && !fechaHasta) return true;
    if (!value) return false;
    const [day, month, year] = value.split("/").map(Number);
    const date = new Date(year, month - 1, day);
    const start = fechaDesde
      ? new Date(
          fechaDesde.getFullYear(),
          fechaDesde.getMonth(),
          fechaDesde.getDate(),
        )
      : null;
    const end = fechaHasta
      ? new Date(
          fechaHasta.getFullYear(),
          fechaHasta.getMonth(),
          fechaHasta.getDate(),
        )
      : null;
    return (!start || date >= start) && (!end || date <= end);
  };

  const zoneReservations = useMemo(
    () =>
      reservas.filter((reservation) => {
        if (reservation.zonaId !== zonaId) return false;
        if (esGuardiaAdmin) return true;
        const name = usuario?.nombre?.toLowerCase() || "";
        return (
          !name ||
          reservation.esMia ||
          reservation.nombre.toLowerCase().includes(name)
        );
      }),
    [reservas, zonaId, esGuardiaAdmin, usuario?.nombre],
  );
  const allZoneReservations = useMemo(
    () => reservas.filter((reservation) => reservation.zonaId === zonaId),
    [reservas, zonaId],
  );

  const filtered = useMemo(
    () =>
      zoneReservations.filter((reservation) => {
        const term = search.toLowerCase();
        if (term && !reservation.depto.toLowerCase().includes(term))
          return false;
        if (activeTab && reservation.estado !== activeTab) return false;
        if (!dateInRange(reservation.fecha)) return false;
        if (dayFilter) {
          const target = new Date();
          if (dayFilter === "manana") target.setDate(target.getDate() + 1);
          const day = DAYS[target.getDay()].toLowerCase();
          if (!reservation.horario.toLowerCase().startsWith(day)) return false;
        }
        if (selectedDate) {
          const date = reservation.fecha?.split("/").reverse().join("-");
          const selected = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
          if (date && date !== selected) return false;
        }
        return true;
      }),
    [
      zoneReservations,
      search,
      activeTab,
      dayFilter,
      selectedDate,
      fechaDesde,
      fechaHasta,
    ],
  );

  const relevantDays = useMemo(() => {
    if (dayFilter === "hoy") return [normalizeText(DAYS[new Date().getDay()])];
    if (dayFilter === "manana") {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return [normalizeText(DAYS[tomorrow.getDay()])];
    }
    return [];
  }, [dayFilter]);

  const freeHours = mediasHoras(
    (zonaConfig as any)?.horarioApertura,
    (zonaConfig as any)?.horarioCierre,
  ).map((hour) => {
    const start = Number(hour.slice(0, 2)) * 60 + Number(hour.slice(3));
    const reservations = allZoneReservations.filter((reservation) => {
      const parsed = parseHorario(reservation.horario);
      if (!parsed) return false;
      const horarioNormalizado = normalizeText(reservation.horario);
      const reservationDay = DAYS.find((day) =>
        horarioNormalizado.includes(normalizeText(day)),
      );
      // Los horarios con un día explícito pertenecen al listado histórico y
      // no deben ocupar los slots de la grilla, igual que en la web.
      if (reservationDay) return false;
      return start >= parsed.from && start < parsed.to;
    });
    return { hour, reservations };
  });

  const openPeople = (item: ReservaZona) => {
    setDetailItem(item);
    setPersonNames(item.personas.map((person) => person.nombre));
  };

  // La zona puede no existir: la pantalla se abre con un id de la ruta.
  return {
    // Contexto
    navigation,
    zonaId,
    zona,
    zonaConfig,
    cargando,
    rol,
    usuario,
    esGuardiaAdmin,
    esGuardia,
    codigosDe,
    ubicaciones,
    actualizarEstadoReserva,
    eliminarReserva,
    actualizarPersonaReserva,

    // Filtros
    search, setSearch,
    activeTab, setActiveTab,
    filtersOpen, setFiltersOpen,
    dayFilter, setDayFilter,
    selectedDate, setSelectedDate,
    fechaDesde, setFechaDesde,
    fechaHasta, setFechaHasta,
    datePicker, setDatePicker,

    // Modales
    deptoReservaOpen, setDeptoReservaOpen,
    deptoReserva, setDeptoReserva,
    deptoReservaTarget, setDeptoReservaTarget,
    menuItem, setMenuItem,
    detailItem, setDetailItem,
    deleteItem, setDeleteItem,
    incidenciaItem, setIncidenciaItem,
    incidenciaTexto, setIncidenciaTexto,
    ruleOpen, setRuleOpen,
    personNames, setPersonNames,

    // Derivados
    zoneReservations,
    allZoneReservations,
    filtered,
    relevantDays,
    freeHours,

    abrirReserva,
    openPeople,
  };
}
