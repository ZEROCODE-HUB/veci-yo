import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore, useUIStore } from "@/stores";
import { useCondominioActivo, useUnidadesDisponibles } from "@/shared/hooks";
import {
  obtenerHistorialLlamadas,
  registrarLlamada as registrarLlamadaRepo,
} from "../services/chat.repo";

const LLAMADAS_QUERY_KEY = ["chat", "llamadas"];

/**
 * Llamadas.
 *
 * Las opciones venían de listas fijas —tres torres, diez pisos, veinte
 * departamentos, cuatro "personas de torre"— y el historial de ocho llamadas
 * inventadas identificadas por nombre. La app no cursa la llamada: la delega
 * al teléfono. Lo que se guarda es la bitácora de a quién se llamó.
 */
export function useLlamada() {
  const queryClient = useQueryClient();
  const rolActivo = useAuthStore((s) => s.rolActivo);
  const usuarioId = useAuthStore((s) => s.usuarioId ?? "");
  const unidadesPropias = useAuthStore((s) => s.unidades);
  const condominioId = useCondominioActivo() ?? "";
  const addToast = useUIStore((s) => s.addToast);
  const { unidades } = useUnidadesDisponibles();

  const esPersonal = rolActivo === "guardia" || rolActivo === "administrador";

  // Un residente llama a la portería o a la administración; el personal llama
  // a una vivienda.
  const opcionesTorre = useMemo(
    () =>
      esPersonal
        ? [...new Set(unidades.map((u) => u.torre))].sort()
        : ["Seguridad", "Administrador"],
    [esPersonal, unidades],
  );

  const [torre, setTorre] = useState(opcionesTorre[0] ?? "");
  const [depto, setDepto] = useState("");

  const opcionesDepartamento = useMemo(
    () =>
      esPersonal
        ? unidades
            .filter((u) => !torre || u.torre === torre)
            .map((u) => `Departamento ${u.codigo}`)
        : unidadesPropias.map((u) => `Departamento ${u.codigo}`),
    [esPersonal, unidades, unidadesPropias, torre],
  );

  // El destinatario es el área o la vivienda, no una persona con nombre: quien
  // atiende es quien esté de turno.
  const persona = esPersonal ? depto || opcionesDepartamento[0] || "" : torre;

  const historial = useQuery({
    queryKey: [...LLAMADAS_QUERY_KEY, usuarioId],
    queryFn: obtenerHistorialLlamadas,
    enabled: Boolean(usuarioId),
  });

  const registrar = useMutation({
    mutationFn: (datos: { persona: string; tipo?: string; duracion?: string }) => {
      const unidad = esPersonal
        ? unidades.find((u) => `Departamento ${u.codigo}` === datos.persona)
        : unidadesPropias[0];

      return registrarLlamadaRepo({
        condominioId,
        usuarioId,
        aNombre: datos.persona,
        unidadId: unidad?.unidadId ?? null,
        tipo: (datos.tipo as "saliente" | "perdida") ?? "saliente",
        duracionSegundos: segundosDe(datos.duracion),
      });
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: LLAMADAS_QUERY_KEY }),
    onError: (error: Error) => addToast(error.message, "error"),
  });

  const historialPersona = useMemo(
    () =>
      (historial.data ?? [])
        .filter((item) => item.contacto === persona)
        .slice(0, 10),
    [historial.data, persona],
  );

  return {
    torre,
    depto,
    persona,
    opcionesTorre,
    opcionesPersona: opcionesDepartamento,
    opcionesDepartamento,
    esPersonal,
    avatarEmoji: esPersonal ? "🏢" : torre === "Seguridad" ? "👮" : "🛡️",
    historialPersona,
    cambiarTorre: (valor: string) => {
      setTorre(valor);
      setDepto("");
    },
    setDepto,
    setPersona: setDepto,
    registrarLlamada: (datos: {
      depto: string;
      persona: string;
      tipo?: string;
      duracion?: string;
    }) => registrar.mutate(datos),
  };
}

/** "03:25" a segundos; la pantalla todavía cuenta en mm:ss. */
function segundosDe(duracion?: string): number {
  if (!duracion) return 0;
  const [minutos, segundos] = duracion.split(":").map(Number);
  if (Number.isNaN(minutos)) return 0;
  return minutos * 60 + (segundos || 0);
}
