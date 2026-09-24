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
import { horasMaximas } from "../helpers";
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
  /*
    `duracion_maxima_min` esta en MINUTOS, y esto construia el desplegable con
    `Array.from({length: maxDuration})`: para la piscina, 120 opciones, de "1
    hora" a "120 horas". El formulario de la administracion tenia ademas dos
    campos sobre la misma columna, uno etiquetado "(min)" y otro "(horas)".
  */
  const maxDuracionMin = zona.duracionMaximaMin || 60;
  const maxHoras = horasMaximas(maxDuracionMin);
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
        { length: maxHoras },
        (_, index) => `${index + 1} ${index === 0 ? "hora" : "horas"}`,
      ),
    [maxHoras],
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
      fecha: formatDate(data.fecha ?? new Date()),
      horaInicio: horaInicio || "00:00",
      horaFin: horaFin || horaInicio || "00:00",
      acompanantes: Math.max(
        0,
        data.asistentes.filter((person) => person.nombre).length - 1,
      ),
      // Se escribia y se tiraba: el formulario lo pedia y el payload no lo
      // llevaba, asi que «Comentarios u observaciones» no llegaba a ninguna
      // parte.
      comentarios: data.comments,
      participantes: data.asistentes
        .filter((person) => person.nombre)
        .map((person) => ({
          nombre: person.nombre,
          tipo: person.tipoParticipante,
        })),
    }, {
      /*
        El numero se ensena **cuando vuelve de la base**, no antes. Sorteandolo
        aqui, la pantalla ensenaba uno y la fila guardaba el mismo por pura
        inercia --el repositorio lo reenviaba-- de modo que la secuencia de la
        base no se usaba nunca.
      */
      onSuccess: (creada) =>
        onSuccess?.({
          depto: data.depto,
          hora: data.hora,
          reservaNum: creada.numero,
        }),
    });
  });

  return {
    form,
    control: form.control,
    errors: form.formState.errors,
    submit,
    zonaConfig,
    maxDuracionMin,
    maxHoras,
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
