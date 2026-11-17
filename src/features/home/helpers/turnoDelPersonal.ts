/**
 * El turno de la gente de la portería, para elegir a quién escribir
 * (17/11/2026, pedido aprobado por el cliente).
 *
 * Quién está de turno AHORA lo decide la base (`personal_de_porteria.de_turno`,
 * con el reloj del edificio): esto no lo sustituye. Lo que hace aquí es lo que
 * la base no escribe en palabras: «Entra mañana 7:00», «Turno: lun–vie
 * 7:00–15:00». Y repite la misma regla de «¿está de turno?» para poder
 * probarla sin red: el ajuste del día manda sobre la semana, un ajuste sin
 * horas es que ese día no trabaja, un turno que cruza la medianoche sigue al
 * día siguiente, y sin ningún horario cargado cuenta como de turno.
 *
 * Todo trabaja con la hora de PARED del edificio («2026-11-17T16:13:00»), que
 * llega de la base. Nunca con el reloj ni la zona del teléfono.
 */

export interface TurnoSemanal {
  /** 0 = domingo … 6 = sábado, como `turno_guardia.dia_semana`. */
  dia: number;
  /** «HH:MM». */
  inicio: string;
  fin: string;
}

export interface AjusteDelDia {
  /** «YYYY-MM-DD», día del edificio. */
  fecha: string;
  /** Sin horas: ese día no trabaja. */
  inicio: string | null;
  fin: string | null;
}

export interface HorarioDelPersonal {
  turnos: TurnoSemanal[];
  ajustes: AjusteDelDia[];
}

interface Tramo {
  inicio: number;
  fin: number;
}

const DIAS_CORTOS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const DIAS_LARGOS = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];
/** La semana se lee de lunes a domingo. */
const ORDEN_SEMANA = [1, 2, 3, 4, 5, 6, 0];

/** «07:30» → 450. «24:00» es el final del día: 1440. */
export function minutosDe(hora: string): number {
  const [h, m] = hora.split(":").map((n) => Number(n));
  return (h || 0) * 60 + (m || 0);
}

/** «07:00» → «7:00»; «24:00» se queda. */
export function horaCorta(hora: string): string {
  const [h, m = "00"] = hora.split(":");
  return `${Number(h)}:${m.padStart(2, "0").slice(0, 2)}`;
}

function partirAhora(ahoraLocal: string): { fecha: string; minutos: number } {
  const [fecha, hora = "00:00"] = ahoraLocal.split("T");
  return { fecha, minutos: minutosDe(hora.slice(0, 5)) };
}

/** Suma días a una fecha «YYYY-MM-DD» sin pasar por la zona del teléfono. */
export function fechaMas(fecha: string, dias: number): string {
  const [a, m, d] = fecha.split("-").map(Number);
  const f = new Date(Date.UTC(a, m - 1, d + dias));
  return [
    f.getUTCFullYear(),
    String(f.getUTCMonth() + 1).padStart(2, "0"),
    String(f.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function diaDeLaSemana(fecha: string): number {
  const [a, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay();
}

/** Los tramos que se trabajan ESE día (empiezan ese día). */
function tramosDelDia(horario: HorarioDelPersonal, fecha: string): Tramo[] {
  const ajuste = horario.ajustes.find((a) => a.fecha === fecha);
  if (ajuste) {
    if (!ajuste.inicio || !ajuste.fin) return [];
    return [{ inicio: minutosDe(ajuste.inicio), fin: minutosDe(ajuste.fin) }];
  }
  const dia = diaDeLaSemana(fecha);
  return horario.turnos
    .filter((t) => t.dia === dia)
    .map((t) => ({ inicio: minutosDe(t.inicio), fin: minutosDe(t.fin) }))
    .sort((a, b) => a.inicio - b.inicio);
}

export function tieneHorario(horario: HorarioDelPersonal): boolean {
  return horario.turnos.length > 0 || horario.ajustes.length > 0;
}

/** ¿Está de turno a esta hora del edificio? Sin horario cargado: sí. */
export function estaDeTurno(horario: HorarioDelPersonal, ahoraLocal: string): boolean {
  if (!tieneHorario(horario)) return true;
  const { fecha, minutos } = partirAhora(ahoraLocal);

  const hoy = tramosDelDia(horario, fecha).some(
    (t) => minutos >= t.inicio && (t.fin <= t.inicio || minutos < t.fin),
  );
  if (hoy) return true;

  // La parte de después de medianoche de un turno que empezó ayer.
  return tramosDelDia(horario, fechaMas(fecha, -1)).some(
    (t) => t.fin <= t.inicio && minutos < t.fin,
  );
}

export interface ProximaEntrada {
  fecha: string;
  /** «HH:MM». */
  inicio: string;
  /** 0 hoy, 1 mañana… */
  enDias: number;
}

const aHora = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/** La próxima vez que entra, mirando hasta ocho días por delante. */
export function proximaEntrada(
  horario: HorarioDelPersonal,
  ahoraLocal: string,
): ProximaEntrada | null {
  const { fecha, minutos } = partirAhora(ahoraLocal);
  for (let d = 0; d <= 8; d += 1) {
    const dia = fechaMas(fecha, d);
    const tramo = tramosDelDia(horario, dia).find((t) => d > 0 || t.inicio > minutos);
    if (tramo) return { fecha: dia, inicio: aHora(tramo.inicio), enDias: d };
  }
  return null;
}

/** «Entra hoy 22:00», «Entra mañana 7:00», «Entra el lunes 7:00». */
export function textoDeProximaEntrada(
  horario: HorarioDelPersonal,
  ahoraLocal: string,
): string | null {
  const proxima = proximaEntrada(horario, ahoraLocal);
  if (!proxima) return null;
  const hora = horaCorta(proxima.inicio);
  if (proxima.enDias === 0) return `Entra hoy ${hora}`;
  if (proxima.enDias === 1) return `Entra mañana ${hora}`;
  return `Entra el ${DIAS_LARGOS[diaDeLaSemana(proxima.fecha)]} ${hora}`;
}

/** [1,2,3,4,5] → «lun–vie»; [1,3] → «lun, mié». En orden de lunes a domingo. */
function textoDeDias(dias: number[]): string {
  const posiciones = [...new Set(dias)]
    .map((d) => ORDEN_SEMANA.indexOf(d))
    .filter((p) => p >= 0)
    .sort((a, b) => a - b);

  const tramos: string[] = [];
  let i = 0;
  while (i < posiciones.length) {
    let j = i;
    while (j + 1 < posiciones.length && posiciones[j + 1] === posiciones[j] + 1) j += 1;
    const desde = DIAS_CORTOS[ORDEN_SEMANA[posiciones[i]]];
    const hasta = DIAS_CORTOS[ORDEN_SEMANA[posiciones[j]]];
    if (j - i >= 2) tramos.push(`${desde}–${hasta}`);
    else if (j === i) tramos.push(desde);
    else tramos.push(`${desde}, ${hasta}`);
    i = j + 1;
  }
  return tramos.join(", ");
}

/** «Turno: lun–vie 7:00–15:00 · sáb 8:00–12:00». Sin turnos: null. */
export function resumenDelHorario(turnos: TurnoSemanal[]): string | null {
  if (!turnos.length) return null;
  const grupos = new Map<string, number[]>();
  for (const t of turnos) {
    const clave = `${t.inicio}|${t.fin}`;
    grupos.set(clave, [...(grupos.get(clave) ?? []), t.dia]);
  }
  const partes = [...grupos.entries()]
    .map(([clave, dias]) => {
      const [inicio, fin] = clave.split("|");
      const primero = Math.min(...dias.map((d) => ORDEN_SEMANA.indexOf(d)));
      return {
        primero,
        texto: `${textoDeDias(dias)} ${horaCorta(inicio)}–${horaCorta(fin)}`,
      };
    })
    .sort((a, b) => a.primero - b.primero)
    .map((p) => p.texto);
  return `Turno: ${partes.join(" · ")}`;
}

/** «Conserje · Federico Valverde». */
export function etiquetaDelPersonal(cargo: string, nombre: string): string {
  return cargo ? `${cargo} · ${nombre}` : nombre;
}
