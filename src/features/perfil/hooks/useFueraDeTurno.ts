import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores";
import { useCondominioActivo } from "@/shared/hooks";
import { estaFueraDeTurno, resumenDelHorario } from "../helpers/perfil.helpers";
import { MI_PUESTO, obtenerMiPuestoDeGuardia } from "../services/miTurno.repo";

/**
 * Si quien entra como guardia está fuera de su turno, y su horario.
 *
 * Fuera de turno solo puede entrar a su perfil (Para Claude 164, 29/10/2026).
 * Se vuelve a mirar cada medio minuto, para que al empezar el turno se abra
 * todo sin salir de la app, y el horario se pide de nuevo cada pocos minutos
 * por si la administración lo cambia. Mientras carga, o si falla, no se
 * bloquea nada.
 */
export function useFueraDeTurno() {
  const rolActivo = useAuthStore((s) => s.rolActivo);
  const condominioId = useCondominioActivo() ?? "";
  const esGuardia = rolActivo === "guardia";

  const puesto = useQuery({
    queryKey: [...MI_PUESTO, condominioId],
    queryFn: () => obtenerMiPuestoDeGuardia(condominioId),
    enabled: esGuardia && Boolean(condominioId),
    refetchInterval: 5 * 60_000,
  });

  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    if (!esGuardia) return;
    const reloj = setInterval(() => setAhora(new Date()), 30_000);
    return () => clearInterval(reloj);
  }, [esGuardia]);

  const guardia = esGuardia ? (puesto.data ?? null) : null;
  return {
    fueraDeTurno: estaFueraDeTurno(guardia, ahora),
    horario: resumenDelHorario(guardia, ahora),
  };
}
