import { useEffect, useMemo, useState } from "react";
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
import { useParametrosDeLaBase, useUnidadesDisponibles } from "@/shared/hooks";
import { useUIStore } from "@/stores/ui-store";
import { horasMaximas } from "../helpers";
import { cuentaDeAcompanantes } from "../services/acompanantes";
import {
  cuantosAsistentes,
  opcionesDeAsistentes,
  SOLO_YO,
} from "../services/asistentes";
import { useMiAlojamiento } from "@/features/huesped/hooks/useMiAlojamiento";
import { frasede, loQueFalta } from "../services/loQueFalta";
import {
  numeroDelPuesto,
  puestosDisponibles,
  puestosOcupados,
} from "../services/puestosDeLaZona";
import { franjas, nombresDeMiEstancia, obtenerOcupacion } from "../services/zonas.repo";
import { OCUPACION_QUERY_KEY } from "./useZonas";
import { formatDate, formatDateInput } from "@/shared/utils";

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
  const { agregarReserva, creandoReserva, zonasComunesConfig } = useZonas();
  // Antes, si la zona no estaba en el store se caia a `zonasComunesConfigInit`,
  // ocho zonas inventadas con sus horarios y reglas. Si la zona no esta, no hay
  // configuracion que inventar.
  const zonaConfig = zonasComunesConfig[zona.id];
  /*
    Lo que la zona no dice lo pone el edificio. `ZonaReservaForm` no monta
    este hook hasta que los parámetros llegaron, así que aquí ya están.
    Antes cada respaldo era un número distinto: 60 minutos aquí, 120 en las
    franjas y 240 al crear la zona; 4 puestos aquí y 1 en el resto.
  */
  const parametrosDeLaBase = useParametrosDeLaBase();
  const duracionPorDefecto = parametrosDeLaBase.numero(
    "zona_duracion_maxima_por_defecto",
  );
  const franjaMin = parametrosDeLaBase.numero("zona_franja_minutos");
  const cuposPorDefecto = parametrosDeLaBase.numero("zona_cupos_por_defecto");
  /** Cuántos puestos tiene la zona: lavadoras, canchas… */
  const puestos = zona.total || cuposPorDefecto;
  const defaultType =
    rol === "huesped-temporal" ? "Huésped Temporal" : "Residente";
  /*
    `duracion_maxima_min` esta en MINUTOS, y esto construia el desplegable con
    `Array.from({length: maxDuration})`: para la piscina, 120 opciones, de "1
    hora" a "120 horas". El formulario de la administracion tenia ademas dos
    campos sobre la misma columna, uno etiquetado "(min)" y otro "(horas)".
  */
  /** La zona tiene mas de un puesto, asi que hay que elegir cual. */
  const pideNumero = puestos > 1;
  const maxDuracionMin = zona.duracionMaximaMin || duracionPorDefecto;
  const maxHoras = horasMaximas(maxDuracionMin);
  /*
    Las franjas que se ofrecen, con el mismo paso que la grilla de la zona
    (`zona_franja_minutos`): si no, pulsar una hora de la grilla abría el
    formulario con la hora en blanco.
  */
  const opcionesHora = useMemo(
    () =>
      franjas(
        zonaConfig?.horarioApertura || null,
        zonaConfig?.horarioCierre || null,
        maxDuracionMin,
        franjaMin,
      ),
    [zonaConfig?.horarioApertura, zonaConfig?.horarioCierre, maxDuracionMin, franjaMin],
  );
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
      // «Solo yo» de salida: es lo que mas se reserva, y dejarlo vacio
      // obligaba a contestar una pregunta que casi siempre tiene la misma
      // respuesta.
      peopleCount: SOLO_YO,
      asistentes: [],
      comments: "",
      depto: initialDepartment || "506 C",
      acceptTerms: false,
    },
  });

  /*
    Un huesped temporal no puede llevar mas gente de la que cabe en el
    alojamiento: la piscina admite veinte y la 102 se alquila para cinco. Sus
    acompañantes son la gente de su estancia, asi que manda el tope mas
    pequeño de los dos. A un residente no le aplica: `config` es null.
  */
  const { config: alojamiento, unidad: alojadoEn } = useMiAlojamiento();
  const esHuesped = rol === "huesped-temporal";
  const maxHuespedes = esHuesped ? alojamiento?.maxHuespedes : null;
  /*
    Un huésped no apunta gente de fuera (hueco 42, 27/10/2026): elige entre las
    personas de su estancia, que pasaron por el preregistro. La base lo exige.
  */
  const { data: genteDeMiEstancia = [], isSuccess: genteCargada } = useQuery({
    queryKey: ["zonas", "gente-de-mi-estancia", alojadoEn?.uuid],
    queryFn: () => nombresDeMiEstancia(alojadoEn?.uuid ?? ""),
    enabled: esHuesped && Boolean(alojadoEn?.uuid),
  });

  const cantidadPersonas = useMemo(
    () =>
      opcionesDeAsistentes(
        zonaConfig?.capacidadMaxima ?? 0,
        maxHuespedes,
        // Mientras no llega la lista no se recorta: se recortaría a cero.
        esHuesped && genteCargada ? genteDeMiEstancia.length : null,
      ),
    [zonaConfig?.capacidadMaxima, maxHuespedes, esHuesped, genteCargada, genteDeMiEstancia.length],
  );

  /*
    Cuánto tiempo se reserva (pedido del cliente, 29/10/2026: «no deja
    seleccionar cuánto tiempo quiero reservar, se selecciona el máximo»). La
    franja de la grilla dura lo máximo de la zona; aquí se elige desde la
    duración mínima de la zona (o el paso de la grilla) hasta esa máxima, de
    paso en paso, sin pasar del cierre. Por defecto, lo mínimo.
  */
  const horaElegida = form.watch("hora");
  const aMinutos = (h: string) => {
    const [hh, mm] = h.split(":").map(Number);
    return (hh || 0) * 60 + (mm || 0);
  };
  const aTexto = (m: number) =>
    `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  const inicioElegido = String(horaElegida ?? "").split(/\s*-\s*/)[0]?.trim() ?? "";
  const pasoDuracion = franjaMin > 0 ? franjaMin : 30;
  const duracionMinima = Math.max(
    pasoDuracion,
    (zona as typeof zona & { duracionMinimaMin?: number }).duracionMinimaMin || 0,
  );
  const opcionesDuracion = useMemo(() => {
    const cierre = zonaConfig?.horarioCierre ? aMinutos(zonaConfig.horarioCierre) : null;
    const inicio = inicioElegido ? aMinutos(inicioElegido) : null;
    const tope =
      cierre !== null && inicio !== null ? Math.min(maxDuracionMin, cierre - inicio) : maxDuracionMin;
    const opciones: { value: number; label: string }[] = [];
    for (let d = duracionMinima; d <= tope; d += pasoDuracion) {
      const h = Math.floor(d / 60);
      const m = d % 60;
      const label = h && m ? `${h} h ${m} min` : h ? `${h} ${h === 1 ? "hora" : "horas"}` : `${m} min`;
      opciones.push({ value: d, label });
    }
    return opciones;
  }, [inicioElegido, maxDuracionMin, duracionMinima, pasoDuracion, zonaConfig?.horarioCierre]);
  const [duracionElegida, setDuracionElegida] = useState<number | null>(null);
  const duracion =
    duracionElegida && opcionesDuracion.some((o) => o.value === duracionElegida)
      ? duracionElegida
      : (opcionesDuracion[0]?.value ?? null);
  /** «07:30 - 08:00»: la hora de inicio y la de fin según el tiempo elegido. */
  const horaConDuracion =
    inicioElegido && duracion ? `${inicioElegido} - ${aTexto(aMinutos(inicioElegido) + duracion)}` : (horaElegida ?? "");

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
    return formatDateInput(dia);
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
      { length: puestos },
      (_, index) => `${zona.nombre} N°${index + 1}`,
    );
    // Sin tramo elegido todavia no hay nada que descartar.
    if (!tramo) return todos;
    return puestosDisponibles({
      nombreZona: zona.nombre,
      puestos,
      ocupados: puestosOcupados(ocupacion, fechaISO, tramo),
    });
  }, [zona, puestos, ocupacion, fechaISO, tramo]);

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

    // La hora de fin sale del tiempo elegido (29/10/2026), no de la franja.
    const [horaInicio, horaFin] = String(horaConDuracion || data.hora)
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
      // El formulario no deja reservar sin aceptarlo; la base guarda el texto.
      aceptaReglamento: Boolean(data.acceptTerms),
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
    /** La reserva va camino de la base: el botón espera y lo dice. */
    creandoReserva,
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
    /** Cuánto tiempo se puede reservar desde la hora elegida, y el elegido. */
    opcionesDuracion,
    duracion,
    elegirDuracion: setDuracionElegida,
    horaConDuracion,
    // La lista iba de 1 a 10 personas para cualquier zona; ahora la limita la
    // capacidad de esa zona.
    cantidadPersonas,
    participantTypes,
    hora,
    acceptTerms,
    asistentes,
    /** Solo para un huésped: los nombres que puede elegir. `null` si escribe libre. */
    genteDeMiEstancia: esHuesped ? genteDeMiEstancia : null,
  };
}
