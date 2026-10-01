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

/**
 * En qué franja cae un turno, por su hora de entrada.
 *
 * Los límites **salen del prototipo**, que es el mockup con el que se acordó la
 * pantalla: mañana de 06 a 12, tarde de 12 a 18, el resto noche. La primera
 * versión de esta función los puso a ojo --la tarde hasta las 20:00-- y con eso
 * los dos filtros de la pantalla de seguridad decían cosas distintas del mismo
 * día: «Turnos» acababa la tarde a las 20:00 y «Horarios», que ofrece cuatro
 * tramos de seis horas, a las 18:00.
 *
 * Con 12–18 los dos hablan del mismo reparto, que es lo que hacía falta. Los
 * dos filtros se quedan porque el mockup los tenía, uno al lado del otro.
 */
export function shiftOfHour(hora: string) {
  const minutos = minutosDeHora(hora);
  if (minutos === null) return "Noche";
  if (minutos >= 6 * 60 && minutos < 12 * 60) return "Mañana";
  if (minutos >= 12 * 60 && minutos < 18 * 60) return "Tarde";
  return "Noche";
}

/**
 * Si un turno cae, aunque sea en parte, dentro de una franja.
 *
 * El filtro de «Horarios» comparaba el rango del turno con la etiqueta de la
 * franja **por igualdad de texto**, así que solo encontraba turnos creados
 * eligiendo exactamente una de las cuatro franjas de seis horas. Ninguno de los
 * de la portería de prueba lo era --06:00 a 14:00, 14:00 a 22:00, 01:00 a
 * 02:00--, así que filtrar por cualquier franja no devolvía a nadie.
 *
 * Al pasar el formulario a ofrecer horas cada media hora, la coincidencia
 * exacta se volvió aún menos probable. Lo que se quiere preguntar es «quién
 * trabaja por la mañana», y eso es solaparse, no coincidir.
 */
export function turnoSolapaFranja(
  turno: { horaInicio: string; horaFin: string },
  franja: { horaInicio: string; horaFin: string },
) {
  const inicioTurno = minutosDeHora(turno.horaInicio);
  const finTurno = minutosDeHora(turno.horaFin);
  const inicioFranja = minutosDeHora(franja.horaInicio);
  const finFranja = minutosDeHora(franja.horaFin);
  if (
    inicioTurno === null ||
    finTurno === null ||
    inicioFranja === null ||
    finFranja === null
  ) {
    return false;
  }

  /*
    Un turno de noche --22:00 a 06:00-- son dos tramos, y hay que comprobar los
    dos: si no, el turno más común de una portería se queda fuera de la franja
    de madrugada, que es justo la que lo contiene.
  */
  const tramos =
    finTurno <= inicioTurno
      ? [
          [inicioTurno, 24 * 60],
          [0, finTurno],
        ]
      : [[inicioTurno, finTurno]];

  return tramos.some(
    ([desde, hasta]) => desde < finFranja && hasta > inicioFranja,
  );
}
