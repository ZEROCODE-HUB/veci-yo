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
    const partes = turno.hora.split(" a ");
    if (partes.length !== 2) continue;
    const [horaInicio, minutoInicio] = partes[0].split(":").map(Number);
    const [horaFin, minutoFin] = partes[1].split(":").map(Number);
    const inicio = horaInicio * 60 + minutoInicio;
    const fin = horaFin * 60 + minutoFin;
    if (minutosActuales >= inicio && minutosActuales < fin) return turno;
  }

  return null;
};

export const obtenerNombreUsuario = (
  usuario: any,
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
