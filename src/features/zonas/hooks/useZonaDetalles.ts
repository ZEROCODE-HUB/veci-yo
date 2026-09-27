import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore, useUbicacionStore } from "@/stores";
import { useUnidadesDisponibles, useNavegacion, useParametros } from "@/shared/hooks";
import type { ReservaZona } from "@/shared/types";
import { formatDate } from "@/shared/utils";
import { obtenerOcupacion } from "../services/zonas.repo";
import { OCUPACION_QUERY_KEY, useZonas } from "./useZonas";
import { ocupaLaFranja } from "../services/puestosDeLaZona";

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
export function mediasHoras(
  apertura?: string,
  cierre?: string,
  /**
   * La hora a partir de la cual se ofrece, en `HH:MM`.
   *
   * Se pasa solo cuando la grilla pinta **hoy** y quien mira no es personal
   * del condominio: a las 18:45 se ofrecia la franja de las 06:00 de hoy y la
   * base la aceptaba (R-15). La base ya no, pero sin esto la pantalla seguiria
   * ofreciendo una franja que va a ser rechazada, que es peor que no
   * ofrecerla.
   *
   * Porteria y administracion no lo pasan: registran usos ya ocurridos, y eso
   * es parte de su trabajo.
   */
  desdeHora?: string,
): string[] {
  const aMinutos = (hora: string) => {
    const [h, m] = hora.split(":").map(Number);
    return h * 60 + (m || 0);
  };
  if (!apertura || !cierre) return [];
  const desde = Math.max(
    aMinutos(apertura),
    desdeHora ? aMinutos(desdeHora) : 0,
  );
  const hasta = aMinutos(cierre);
  if (hasta <= desde) return [];

  const resultado: string[] = [];
  // El primer paso se alinea con la media hora: si son las 18:45, la primera
  // franja que se ofrece es la de las 19:00, no una a las 18:45.
  const primera = Math.ceil(desde / 30) * 30;
  for (let minuto = primera; minuto < hasta; minuto += 30) {
    resultado.push(
      `${String(Math.floor(minuto / 60)).padStart(2, "0")}:${String(minuto % 60).padStart(2, "0")}`,
    );
  }
  return resultado;
}
export function useZonaDetalles() {
  const navigation = useNavegacion();
  // Los departamentos salen de las unidades reales del edificio, no de una
  // lista fija con codigos que no existen.
  const { codigosDe } = useUnidadesDisponibles();
  const parametros = useParametros("ZonaDetalles");
  const zonaId = parametros?.zonaId as string;
  const rol = useAuthStore((state) => state.rolActivo);
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

  /*
    Aqui vivian `zoneReservations`, `filtered` y `relevantDays`, y ninguno se
    pintaba. Alimentaban una «Lista de reservas» que la pantalla anunciaba con
    su buscador y sus seis chips de estado y que **no existe**: el valor
    llegaba al componente y nadie lo renderizaba. Lo vio el cliente probando
    los filtros. Con la seccion fuera, el calculo tambien sobra.
  */
  const allZoneReservations = useMemo(
    () => reservas.filter((reservation) => reservation.zonaId === zonaId),
    [reservas, zonaId],
  );

  /**
   * El día que muestra la grilla.
   *
   * La versión anterior no lo tenía: cruzaba **todas** las reservas de la zona
   * contra las franjas sin mirar la fecha, así que una reserva de octubre
   * pintaba ocupada la misma hora de junio.
   */
  const diaDeLaGrilla = useMemo(() => {
    const fecha = new Date();
    if (dayFilter === "manana") fecha.setDate(fecha.getDate() + 1);
    else if (dayFilter !== "hoy" && (fechaDesde || selectedDate))
      return fechaDesde ?? selectedDate!;
    return fecha;
  }, [dayFilter, fechaDesde, selectedDate]);

  const diaISO = `${diaDeLaGrilla.getFullYear()}-${String(
    diaDeLaGrilla.getMonth() + 1,
  ).padStart(2, "0")}-${String(diaDeLaGrilla.getDate()).padStart(2, "0")}`;

  /**
   * Lo que está tomado ese día, incluidas las reservas de los demás.
   *
   * `reserva_zona_lectura` solo entrega las propias, así que sin esto la
   * grilla le decía a cada vecino que estaba todo libre.
   */
  const { data: ocupacion = [] } = useQuery({
    queryKey: [...OCUPACION_QUERY_KEY, zonaId, diaISO],
    queryFn: () => obtenerOcupacion(zonaId, diaISO, diaISO),
    enabled: Boolean(zonaId),
  });

  /** Cuántas reservas caben a la vez: 1 en la piscina, 4 en la lavandería. */
  const cupos = Math.max(1, zonaConfig?.total ?? 1);

  /*
    Si la grilla pinta hoy y quien mira no es porteria ni administracion, no
    se ofrecen las franjas que ya pasaron. La regla vive tambien en la base
    --`reserva_no_en_el_pasado`-- pero una pantalla que ofrece algo que la
    base va a rechazar es peor que una que no lo ofrece.
  */
  const hoyISO = new Date().toISOString().slice(0, 10);
  const desdeHora =
    !esGuardiaAdmin && diaISO === hoyISO
      ? new Date().toTimeString().slice(0, 5)
      : undefined;

  const freeHours = mediasHoras(
    zonaConfig?.horarioApertura,
    zonaConfig?.horarioCierre,
    desdeHora,
  ).map((hour) => {
    const start = Number(hour.slice(0, 2)) * 60 + Number(hour.slice(3));
    const aMinutos = (hhmm: string) =>
      Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

    const tomadas = ocupacion.filter(
      (franja) =>
        start >= aMinutos(franja.desde) && start < aMinutos(franja.hasta),
    );

    // Las insignias detalladas salen de las reservas que la base entrega:
    // las propias, y todas si quien mira es la administración o la portería.
    const reservations = allZoneReservations.filter((reservation) => {
      /*
        Una reserva cancelada no ocupa nada, y la base ya lo sabe: la excluye
        en `ocupacion_zona()`, de donde sale el contador. La grilla las pintaba
        igual, asi que sobre «quedan 2 de 4» salian tres tarjetas.
      */
      if (!ocupaLaFranja(reservation.estado)) return false;
      const parsed = parseHorario(reservation.horario);
      if (!parsed) return false;
      const horarioNormalizado = normalizeText(reservation.horario);
      const reservationDay = DAYS.find((day) =>
        horarioNormalizado.includes(normalizeText(day)),
      );
      // Los horarios con un día explícito pertenecen al listado histórico y
      // no deben ocupar los slots de la grilla, igual que en la web.
      if (reservationDay) return false;
      if (reservation.fecha !== formatDate(diaDeLaGrilla)) return false;
      return start >= parsed.from && start < parsed.to;
    });

    return {
      hour,
      reservations,
      ajenas: tomadas.filter((franja) => !franja.propia).length,
      libres: Math.max(0, cupos - tomadas.length),
      cupos,
    };
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
    esGuardiaAdmin,
    esGuardia,
    codigosDe,
    ubicaciones,
    actualizarEstadoReserva,
    eliminarReserva,
    actualizarPersonaReserva,

    // Filtros
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
    allZoneReservations,
    freeHours,
    /** El dia que esta pintando la grilla. Lo necesita la tira de dias. */
    diaDeLaGrilla,

    abrirReserva,
    openPeople,
  };
}
