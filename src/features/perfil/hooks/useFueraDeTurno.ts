import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores";
import { useCondominioActivo } from "@/shared/hooks";
import { ahora, ahoraMs } from "@/shared/utils/reloj.util";
import { resumenDelHorario } from "../helpers/perfil.helpers";
import { obtenerMiProrroga } from "../services/prorroga.repo";
import {
  MI_PUESTO,
  obtenerMiEstadoDeTurno,
  obtenerMiPuestoDeGuardia,
} from "../services/miTurno.repo";

/** Cada cuánto se le pregunta a la base si sigue de turno. */
const CADA_MS = 30_000;

/**
 * Si quien entra como guardia está fuera de su turno, y su horario.
 *
 * Fuera de turno solo puede entrar a su perfil (Para Claude 164, 29/10/2026).
 * **Lo decide la base** (`mi_estado_de_turno`), con el reloj del edificio: lo
 * decidía la app con el del teléfono, y un celular con la hora mal se
 * equivocaba --o se podía cambiar la hora para seguir entrando-- (04/11/2026).
 * Se le pregunta cada medio minuto, para que al empezar el turno se abra todo
 * sin salir de la app. Entre pregunta y pregunta, el final se cuenta desde lo
 * que dijo la base. Mientras carga, o si falla, no se bloquea nada.
 */
export function useFueraDeTurno() {
  const rolActivo = useAuthStore((s) => s.rolActivo);
  const condominioId = useCondominioActivo() ?? "";
  const esGuardia = rolActivo === "guardia";
  const activo = esGuardia && Boolean(condominioId);

  // El horario, solo para enseñarlo.
  const puesto = useQuery({
    queryKey: [...MI_PUESTO, condominioId],
    queryFn: () => obtenerMiPuestoDeGuardia(condominioId),
    enabled: activo,
    refetchInterval: 5 * 60_000,
  });

  const estado = useQuery({
    queryKey: [...MI_PUESTO, "estado", condominioId],
    queryFn: async () => {
      const e = await obtenerMiEstadoDeTurno(condominioId);
      return e
        ? {
            ...e,
            // El final en el reloj de la app, para contar hacia atrás sin preguntar.
            finMs: e.segundosRestantes === null ? null : ahoraMs() + e.segundosRestantes * 1000,
          }
        : null;
    },
    enabled: activo,
    refetchInterval: CADA_MS,
  });

  const [momento, setMomento] = useState(() => ahoraMs());
  useEffect(() => {
    if (!esGuardia) return;
    const reloj = setInterval(() => setMomento(ahoraMs()), CADA_MS);
    return () => clearInterval(reloj);
  }, [esGuardia]);

  // La prórroga que pidió (Para Claude 178), para el aviso: pendiente, aceptada o rechazada.
  const prorroga = useQuery({
    queryKey: [...MI_PUESTO, "prorroga", condominioId],
    queryFn: () => obtenerMiProrroga(condominioId),
    enabled: activo,
    refetchInterval: 60_000,
  });

  const e = activo ? (estado.data ?? null) : null;
  const terminoYa = e?.finMs != null && e.finMs <= momento;
  const enTurno = Boolean(e?.enTurno) && !terminoYa;
  const { refetch } = estado;
  useEffect(() => {
    // Se acabó según la cuenta atrás: que lo confirme la base.
    if (terminoYa) void refetch();
  }, [terminoYa, refetch]);

  return {
    fueraDeTurno: Boolean(e?.tieneHorario) && !enTurno,
    horario: resumenDelHorario(esGuardia ? (puesto.data ?? null) : null, ahora()),
    /** Lo que le queda: hasta el fin de la prórroga aceptada, o del turno. */
    minutosRestantes:
      enTurno && e?.finMs != null
        ? Math.max(1, Math.ceil((e.finMs - momento) / 60_000))
        : null,
    prorroga: esGuardia ? (prorroga.data ?? null) : null,
    recargarProrroga: () => {
      void prorroga.refetch();
      void estado.refetch();
    },
  };
}
