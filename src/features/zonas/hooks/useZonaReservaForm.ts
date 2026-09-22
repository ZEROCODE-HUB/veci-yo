import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ZonaComun } from "@/shared/types";
import {
  participantTypes,
  reservaZonaSchema,
  type ReservaZonaFormData,
} from "../schemas";
import { useZonas } from "./useZonas";
import { useUnidadesDisponibles } from "@/shared/hooks";
import { useUIStore } from "@/stores/ui-store";
import { formatDate } from "@/shared/utils";

const getDateLabel = (date: Date) =>
  `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;

interface UseZonaReservaFormParams {
  zona: ZonaComun;
  rol: string | null;
  initialHour?: string;
  initialDate?: string;
  initialDepartment?: string;
  onSuccess?: (result: {
    depto: string;
    hora: string;
    reservaNum: string;
  }) => void;
}

export function useZonaReservaForm({
  zona,
  rol,
  initialHour,
  initialDate,
  initialDepartment,
  onSuccess,
}: UseZonaReservaFormParams) {
  const { resolver: resolverUnidad } = useUnidadesDisponibles();
  const addToast = useUIStore((st) => st.addToast);
  const { agregarReserva, zonasComunesConfig } = useZonas();
  // Antes, si la zona no estaba en el store se caia a `zonasComunesConfigInit`,
  // ocho zonas inventadas con sus horarios y reglas. Si la zona no esta, no hay
  // configuracion que inventar.
  const zonaConfig = zonasComunesConfig[zona.id];
  const defaultType =
    rol === "huesped-temporal" ? "Huésped Temporal" : "Residente";
  const maxDuration = zonaConfig?.duracionPermitida || zona.duracionMaxima;
  const opcionesHora = zonaConfig?.horariosDisponibles ?? [];
  const horaInicial = initialHour
    ? opcionesHora.find((option) =>
        option.startsWith(initialHour.replace(/:00$/, "")),
      ) || ""
    : "";

  const form = useForm<ReservaZonaFormData>({
    resolver: zodResolver(reservaZonaSchema),
    defaultValues: {
      hora: horaInicial,
      duracion: "1 hora",
      numero: "",
      fecha: initialDate ? new Date(initialDate) : new Date(),
      peopleCount: "",
      asistentes: [],
      comments: "",
      depto: initialDepartment || "506 C",
      chargeMaintenance: false,
      acceptTerms: false,
    },
  });

  const cantidadPersonas = useMemo(() => {
    const tope = zonaConfig?.capacidadMaxima ?? 0;
    return Array.from(
      { length: Math.max(tope, 0) },
      (_, i) => `${i + 1} ${i === 0 ? "persona" : "personas"}`,
    );
  }, [zonaConfig?.capacidadMaxima]);

  const peopleCount = form.watch("peopleCount");
  const acceptTerms = form.watch("acceptTerms");
  const hora = form.watch("hora");
  const asistentes = form.watch("asistentes");
  const durations = useMemo(
    () =>
      Array.from(
        { length: maxDuration },
        (_, index) => `${index + 1} ${index === 0 ? "hora" : "horas"}`,
      ),
    [maxDuration],
  );
  const numbers = useMemo(
    () =>
      Array.from(
        { length: zona.total || 4 },
        (_, index) => `${zona.nombre} N°${index + 1}`,
      ),
    [zona],
  );

  useEffect(() => {
    const count = Number(peopleCount?.split(" ")[0]) || 0;
    const current = form.getValues("asistentes");
    form.setValue(
      "asistentes",
      Array.from(
        { length: count },
        (_, index) =>
          current[index] || {
            nombre: "",
            tipoParticipante: defaultType as (typeof participantTypes)[number],
          },
      ),
      { shouldValidate: true },
    );
  }, [peopleCount, defaultType, form]);

  const submit = form.handleSubmit((data) => {
    const reservaNum = String(Math.floor(Math.random() * 900000 + 100000));
    // La reserva se ata a una unidad real por FK. `depto` era texto libre.
    const unidad = resolverUnidad(undefined, data.depto);
    if (!unidad) {
      addToast("No pudimos identificar el departamento de la reserva", "error");
      return;
    }

    const [horaInicio, horaFin] = String(data.hora)
      .split(/\s*-\s*/)
      .map((h) => h.trim());

    agregarReserva({
      zonaId: zona.id,
      unidadId: unidad.unidadId,
      numero: reservaNum,
      fecha: formatDate(data.fecha ?? new Date()),
      horaInicio: horaInicio || "00:00",
      horaFin: horaFin || horaInicio || "00:00",
      acompanantes: Math.max(
        0,
        data.asistentes.filter((person) => person.nombre).length - 1,
      ),
      participantes: data.asistentes
        .filter((person) => person.nombre)
        .map((person) => ({
          nombre: person.nombre,
          tipo: person.tipoParticipante,
        })),
    });

    onSuccess?.({ depto: data.depto, hora: data.hora, reservaNum });
  });

  return {
    form,
    control: form.control,
    errors: form.formState.errors,
    submit,
    zonaConfig,
    maxDuration,
    opcionesHora,
    durations,
    numbers,
    // La lista iba de 1 a 10 personas para cualquier zona; ahora la limita la
    // capacidad de esa zona.
    cantidadPersonas,
    participantTypes,
    hora,
    acceptTerms,
    asistentes,
  };
}
