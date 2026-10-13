import { formatDateInput, minutosDeHora } from "@/shared/utils";
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

  return null;
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
