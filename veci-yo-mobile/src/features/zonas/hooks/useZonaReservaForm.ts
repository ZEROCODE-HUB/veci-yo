import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cantidadPersonas, horasReserva, zonasComunesConfigInit } from "@/data";
import type { ZonaComun } from "@/shared/types";
import {
  participantTypes,
  reservaZonaSchema,
  type ReservaZonaFormData,
} from "../schemas";
import { useZonas } from "./useZonas";

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
  const { agregarReserva, zonasComunesConfig } = useZonas();
  const configuredZone = zonasComunesConfig[zona.id];
  const zonaConfig = configuredZone || zonasComunesConfigInit[zona.id];
  const defaultType =
    rol === "huesped-temporal" ? "Huésped Temporal" : "Residente";
  const maxDuration = zonaConfig?.duracionPermitida || zona.duracionMaxima;
  const opcionesHora = zonaConfig?.horariosDisponibles || horasReserva;

  const form = useForm<ReservaZonaFormData>({
    resolver: zodResolver(reservaZonaSchema),
    defaultValues: {
      hora: initialHour ? initialHour.replace(/:00$/, "") : "",
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
    agregarReserva({
      zonaId: zona.id,
      depto: `Departamento ${data.depto}`,
      nombre: data.asistentes[0]?.nombre || data.depto,
      acompanantes: Math.max(
        0,
        data.asistentes.filter((person) => person.nombre).length - 1,
      ),
      reservaNum,
      horario: data.hora,
      duracion: data.duracion,
      estado: zonaConfig?.requiereAprobacion ? "Pendiente" : "Aprobado",
      personas: data.asistentes.map((person, index) => ({
        nombre: person.nombre || `Asistente ${index + 1}`,
        llego: false,
        tipoParticipante: person.tipoParticipante,
      })),
      fecha: getDateLabel(data.fecha),
      esMia: true,
      comentarios: data.comments,
      requiereAprobacion: zonaConfig?.requiereAprobacion || false,
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
    cantidadPersonas,
    participantTypes,
    hora,
    acceptTerms,
    asistentes,
  };
}
