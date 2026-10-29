import { formatDateInput, formatRangoHoras, minutosDeHora } from "@/shared/utils";
import type { Usuario } from "@/shared/types";
import type { GuardiaPerfil } from "../types/perfil";

const DIAS_SEMANA_ES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

export const normalizarTexto = (valor: string) =>
  valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export const obtenerTurnoActual = (
  guardia: GuardiaPerfil | null,
  ahora: Date = new Date(),
) => {
  if (!guardia) return null;

  const diaActual = normalizarTexto(DIAS_SEMANA_ES[ahora.getDay()]);
  const minutosActuales = ahora.getHours() * 60 + ahora.getMinutes();

  /*
    El ajuste de hoy manda sobre el horario de la semana: un turno puntual que
    puso la administración, o el «terminé el turno» del propio guardia. No se
    miraba, así que la tarjeta seguía diciendo «en turno activo».
  */
  const ajuste = guardia.ajustes?.find(
    (a) => a.fecha === formatDateInput(ahora),
  );
  if (ajuste) {
    const inicio = minutosDeHora(ajuste.horaInicio);
    const fin = minutosDeHora(ajuste.horaFin);
    // Sin horas: ese día no trabaja.
    if (inicio === null || fin === null) return null;
    const dentro =
      fin <= inicio
        ? minutosActuales >= inicio || minutosActuales < fin
        : minutosActuales >= inicio && minutosActuales < fin;
    return dentro
      ? {
          dia: DIAS_SEMANA_ES[ahora.getDay()],
          horaInicio: ajuste.horaInicio,
          horaFin: ajuste.horaFin,
        }
      : null;
  }

  if (!guardia.turnos?.length) return null;

  for (const turno of guardia.turnos) {
    if (normalizarTexto(turno.dia) !== diaActual) continue;
    const inicio = minutosDeHora(turno.horaInicio);
    const fin = minutosDeHora(turno.horaFin);
    if (inicio === null || fin === null) continue;
    // Un turno que cruza medianoche --22:00 a 06:00-- son dos tramos.
    const dentro =
      fin <= inicio
        ? minutosActuales >= inicio || minutosActuales < fin
        : minutosActuales >= inicio && minutosActuales < fin;
    if (dentro) return turno;
  }

  /*
    La parte de después de medianoche de un turno que empezó ayer: el de
    22:00 a 06:00 del lunes sigue el martes a las 02:00 (29/10/2026).
  */
  const ayer = normalizarTexto(DIAS_SEMANA_ES[(ahora.getDay() + 6) % 7]);
  for (const turno of guardia.turnos) {
    if (normalizarTexto(turno.dia) !== ayer) continue;
    const inicio = minutosDeHora(turno.horaInicio);
    const fin = minutosDeHora(turno.horaFin);
    if (inicio === null || fin === null || fin > inicio) continue;
    if (minutosActuales < fin) return turno;
  }

  return null;
};

/**
 * Si el guardia tiene horario y ahora está fuera de él (Para Claude 164,
 * 29/10/2026): entonces solo puede entrar a su perfil. Sin ningún horario
 * puesto no se le bloquea nada, porque no hay contra qué comparar.
 */
export const estaFueraDeTurno = (
  guardia: GuardiaPerfil | null,
  ahora: Date = new Date(),
) => {
  if (!guardia) return false;
  const ajusteDeHoy = guardia.ajustes?.some((a) => a.fecha === formatDateInput(ahora));
  if (!guardia.turnos?.length && !ajusteDeHoy) return false;
  return obtenerTurnoActual(guardia, ahora) === null;
};

// La semana empieza el lunes al enseñar el horario.
const ORDEN_DE_LA_SEMANA = [1, 2, 3, 4, 5, 6, 0];

/**
 * El horario del guardia en pocas líneas: los días seguidos con las mismas
 * horas van juntos («Lunes a Domingo · 06:00 - 12:00»). Si hoy tiene un
 * ajuste, va primero.
 */
export const resumenDelHorario = (
  guardia: GuardiaPerfil | null,
  ahora: Date = new Date(),
): string[] => {
  if (!guardia) return [];
  const lineas: string[] = [];
  const ajuste = guardia.ajustes?.find((a) => a.fecha === formatDateInput(ahora));
  if (ajuste) {
    lineas.push(
      ajuste.horaInicio && ajuste.horaFin
        ? `Hoy · ${formatRangoHoras(ajuste.horaInicio, ajuste.horaFin)}`
        : "Hoy no tienes turno",
    );
  }
  const rangoDe = (dia: number) =>
    (guardia.turnos ?? [])
      .filter((t) => normalizarTexto(t.dia) === normalizarTexto(DIAS_SEMANA_ES[dia]))
      .map((t) => formatRangoHoras(t.horaInicio, t.horaFin))
      .sort()
      .join(" y ");
  let desde: number | null = null;
  let hasta: number | null = null;
  let rango = "";
  const cerrar = () => {
    if (desde === null || hasta === null || !rango) return;
    const dias =
      desde === hasta
        ? DIAS_SEMANA_ES[desde]
        : `${DIAS_SEMANA_ES[desde]} a ${DIAS_SEMANA_ES[hasta]}`;
    lineas.push(`${dias} · ${rango}`);
  };
  for (const dia of ORDEN_DE_LA_SEMANA) {
    const deEste = rangoDe(dia);
    if (deEste && deEste === rango) {
      hasta = dia;
      continue;
    }
    cerrar();
    desde = dia;
    hasta = dia;
    rango = deEste;
  }
  cerrar();
  return lineas;
};

/**
 * El nombre que se le enseña a la persona.
 *
 * Esto tenía debajo una tabla de nombres de demostración --«Demo Seguridad»,
 * «Demo Administrador», «Usuario demo»-- que se usaba cuando el perfil no traía
 * nombre. Con los botones de demostración retirados el 06/10/2026 eso dejaba un
 * defecto a la vista: **a una persona de verdad sin nombre en su perfil la
 * aplicación la habría llamado «Demo Administrador»**, por su rol.
 *
 * Y pasar puede pasar: hasta hoy mismo, quien entraba con Google se quedaba sin
 * fila de perfil.
 *
 * Ahora se dice «Vecino», que es lo que es y no afirma nada falso. El rol ya se
 * ve en la cabecera; repetirlo aquí no añadía nada.
 */
export const obtenerNombreUsuario = (
  usuario: Pick<Usuario, "nombre" | "apellido"> | null | undefined,
) => {
  if (usuario?.nombre)
    return `${usuario.nombre} ${usuario.apellido || ""}`.trim();
  return "Vecino";
};
