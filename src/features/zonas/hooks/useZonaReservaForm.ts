import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ZonaComun } from "@/shared/types";
import {
  construirReservaZonaSchema,
  participantTypes,
  type ReservaZonaFormData,
} from "../schemas";
import { useZonas } from "./useZonas";
import { useUnidadesDisponibles } from "@/shared/hooks";
import { useUIStore } from "@/stores/ui-store";
import { horasMaximas } from "../helpers";
import { cuentaDeAcompanantes } from "../services/acompanantes";
import { cuantosAsistentes, opcionesDeAsistentes } from "../services/asistentes";
import { frasede, loQueFalta } from "../services/loQueFalta";
import {
  numeroDelPuesto,
  puestosDisponibles,
  puestosOcupados,
} from "../services/puestosDeLaZona";
import { obtenerOcupacion } from "../services/zonas.repo";
import { OCUPACION_QUERY_KEY } from "./useZonas";
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
    /** Que puesto toco. Nulo en las zonas de un solo puesto. */
    puesto: number | null;
    zona: string;
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
  /** La zona tiene mas de un puesto, asi que hay que elegir cual. */
  const pideNumero = (zona.total ?? 1) > 1;
  const maxDuracionMin = zona.duracionMaximaMin || 60;
  const maxHoras = horasMaximas(maxDuracionMin);
  const opcionesHora = zonaConfig?.horariosDisponibles ?? [];
  const horaInicial = initialHour
    ? opcionesHora.find((option) =>
        option.startsWith(initialHour.replace(/:00$/, "")),
      ) || ""
    : "";

  const form = useForm<ReservaZonaFormData>({
    // La zona decide si hay numero que elegir: cuatro lavadoras si, una
    // piscina no.
    resolver: zodResolver(construirReservaZonaSchema(pideNumero)),
    defaultValues: {
      hora: horaInicial,
      numero: "",
      fecha: initialDate ? new Date(initialDate) : new Date(),
      peopleCount: "",
      asistentes: [],
      comments: "",
      depto: initialDepartment || "506 C",
      acceptTerms: false,
    },
  });

  const cantidadPersonas = useMemo(
    () => opcionesDeAsistentes(zonaConfig?.capacidadMaxima ?? 0),
    [zonaConfig?.capacidadMaxima],
  );

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
  const fecha = form.watch("fecha");
  const fechaISO = useMemo(() => {
    const dia = fecha instanceof Date ? fecha : new Date();
    const mes = String(dia.getMonth() + 1).padStart(2, "0");
    return `${dia.getFullYear()}-${mes}-${String(dia.getDate()).padStart(2, "0")}`;
  }, [fecha]);

  /*
    Que puestos estan cogidos ese dia. No se puede deducir de las reservas que
    el cliente ve --`reserva_zona_lectura` solo le entrega las suyas--, asi que
    sale de `ocupacion_zona()`, que devuelve lo tomado sin decir de quien es.
  */
  const { data: ocupacion = [] } = useQuery({
    queryKey: [...OCUPACION_QUERY_KEY, zona.id, fechaISO],
    queryFn: () => obtenerOcupacion(zona.id, fechaISO, fechaISO),
    enabled: Boolean(zona.id),
  });

  const tramo = useMemo(() => {
    const [desde, hasta] = String(hora ?? "")
      .split(/\s*-\s*/)
      .map((h) => h.trim());
    return desde && hasta ? { desde, hasta } : null;
  }, [hora]);

  const numbers = useMemo(() => {
    const todos = Array.from(
      { length: zona.total || 4 },
      (_, index) => `${zona.nombre} N°${index + 1}`,
    );
    // Sin tramo elegido todavia no hay nada que descartar.
    if (!tramo) return todos;
    return puestosDisponibles({
      nombreZona: zona.nombre,
      puestos: zona.total || 4,
      ocupados: puestosOcupados(ocupacion, fechaISO, tramo),
    });
  }, [zona, ocupacion, fechaISO, tramo]);

  /*
    Si el puesto elegido deja de estar libre --porque se cambia la hora o el
    dia-- se suelta la eleccion en vez de mandar a la base algo que va a
    rechazar.
  */
  const numeroElegido = form.watch("numero");
  useEffect(() => {
    if (numeroElegido && !numbers.includes(numeroElegido)) {
      form.setValue("numero", "", { shouldValidate: true });
    }
  }, [numbers, numeroElegido, form]);

  useEffect(() => {
    const count = cuantosAsistentes(peopleCount);
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
      // Restaba uno, como si el primer nombre fuera el del titular. La
      // pantalla pide «personas que asistiran **junto al titular**», asi que
      // no lo es: dos nombres quedaban asentados como un acompañante.
      acompanantes: cuentaDeAcompanantes(data.asistentes),
      // El desplegable lo pedia como obligatorio y su valor no se mandaba:
      // dos vecinos podian reservar la misma lavadora a la misma hora.
      numeroRecurso: numeroDelPuesto(data.numero),
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
          // El que toco, no el que se pidio: si la reserva llega sin numero
          // lo asigna la base.
          puesto: creada.numeroRecurso,
          zona: zona.nombre,
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
    /** La zona tiene mas de un puesto que elegir. */
    pideNumero,
    /*
      Lo que impide guardar, dicho. El boton se apagaba con
      `!hora || !acceptTerms` y no decia por que --y el numero ni siquiera
      entraba en esa cuenta, asi que se podia reservar sin elegir lavadora--.
    */
    falta: frasede(
      loQueFalta({
        hora: hora ?? "",
        pideNumero,
        numero: numeroElegido ?? "",
        aceptaReglamento: Boolean(acceptTerms),
      }),
    ),
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
