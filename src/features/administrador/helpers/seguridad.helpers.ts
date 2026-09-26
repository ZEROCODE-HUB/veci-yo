import type { Guardia } from "@/shared/types";
import { minutosDeHora } from "@/shared/utils";
import { daysByIndex } from "../types";

/**
 * Si el guardia está trabajando ahora mismo.
 *
 * Es lo que enciende el borde verde de la lista. **No se encendía nunca**: el
 * turno llegaba como «08:00 - 16:00» y esto lo partía por « a », así que la
 * hora de fin quedaba `undefined` y la comparación siempre salía falsa. El
 * mismo código en el perfil del guardia sí funcionaba, porque el otro mapeo
 * del mismo dato usaba el otro separador.
 *
 * Ahora el turno son dos horas y no hay nada que partir.
 */
export function isOnShift(guardia: Guardia) {
  const now = new Date();
  const today = daysByIndex[now.getDay()];
  const minutes = now.getHours() * 60 + now.getMinutes();
  return guardia.turnos.some((turno) => {
    if (turno.dia !== today) return false;
    const start = minutosDeHora(turno.horaInicio);
    const end = minutosDeHora(turno.horaFin);
    if (start === null || end === null) return false;
    // Un turno que cruza medianoche —22:00 a 06:00— son dos tramos.
    if (end <= start) return minutes >= start || minutes < end;
    return minutes >= start && minutes < end;
  });
}

export function shiftOfHour(hora: string) {
  const minutos = minutosDeHora(hora);
  if (minutos === null) return "Noche";
  if (minutos >= 6 * 60 && minutos < 12 * 60) return "Mañana";
  if (minutos >= 12 * 60 && minutos < 20 * 60) return "Tarde";
  return "Noche";
}
