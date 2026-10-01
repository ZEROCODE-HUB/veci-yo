import { minutosDeHora } from "@/shared/utils";
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

export const obtenerTurnoActual = (guardia: GuardiaPerfil | null) => {
  if (!guardia?.turnos?.length) return null;

  const ahora = new Date();
  const diaActual = normalizarTexto(DIAS_SEMANA_ES[ahora.getDay()]);
  const minutosActuales = ahora.getHours() * 60 + ahora.getMinutes();

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

export const obtenerNombreUsuario = (
  usuario: Pick<Usuario, "nombre" | "apellido"> | null | undefined,
  rolActivo: string | null,
  modo: string | null,
) => {
  if (usuario?.nombre)
    return `${usuario.nombre} ${usuario.apellido || ""}`.trim();
  if (rolActivo) {
    const nombres: Record<string, string> = {
      guardia: "Demo Seguridad",
      administrador: "Demo Administrador",
      "inquilino-lider": "Demo Residente Inquilino Lider",
      "huesped-temporal": "Demo Huésped Temporal",
    };
    return nombres[rolActivo] || "Usuario demo";
  }
  if (modo === "incognito") return "Invitado";
  return "Usuario";
};
