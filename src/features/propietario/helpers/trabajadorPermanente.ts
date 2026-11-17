/**
 * El formulario de «Agregar trabajador permanente» (17/11/2026). La base
 * vuelve a comprobarlo todo; esto solo dice qué falta antes de llamarla.
 */
export interface FormularioTrabajador {
  nombre: string;
  oficio: string;
  codigoPais: string;
  telefono: string;
  /** «¿Le das usuario en la app?» */
  conApp: boolean;
  correo: string;
}

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function errorDelTrabajador(form: FormularioTrabajador): string | null {
  if (!form.nombre.trim()) return "Falta el nombre";
  if (form.telefono.trim() && !/^[\d\s-]{6,}$/.test(form.telefono.trim()))
    return "El teléfono lleva solo cifras";
  if (form.conApp && !CORREO.test(form.correo.trim()))
    return "Para darle usuario en la app hace falta su correo";
  return null;
}

/** Cómo se presenta en la lista: oficio y si tiene la app. */
export function detalleDelTrabajador(t: {
  oficio: string | null;
  conApp: boolean;
  tieneCuenta: boolean;
}): string {
  const app = !t.conApp
    ? "sin app"
    : t.tieneCuenta
      ? "con app: contesta el intercomunicador"
      : "con app: falta que acepte la invitación";
  return `${t.oficio?.trim() || "Trabajador permanente"} · ${app}`;
}
