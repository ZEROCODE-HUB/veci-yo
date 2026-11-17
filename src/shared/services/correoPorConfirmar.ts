import { almacenamientoLocal } from "./supabase";

/*
  El correo que alguien acaba de registrar y todavía no confirma (16/11/2026).

  Después de registrarse, la persona va a su app de correo a pulsar el enlace.
  El enlace confirma la cuenta en el servidor aunque VeciYo esté cerrada, pero
  si el celular cerró VeciYo mientras tanto, la contraseña que se tenía en
  memoria para entrar sola se perdió, y la persona aparecía en «Iniciar
  sesión» sin saber por qué. Ahora se recuerda **solo el correo** --nunca la
  contraseña--: el inicio de sesión lo trae puesto y dice que, si ya confirmó,
  solo falta la contraseña.
*/
const CLAVE = "veciyo.correo_por_confirmar";

export async function recordarCorreoPorConfirmar(correo: string) {
  try {
    await almacenamientoLocal.setItem(CLAVE, correo.trim().toLowerCase());
  } catch {
    // Sin almacenamiento, la persona escribe su correo: no pasa nada.
  }
}

export async function correoPorConfirmar(): Promise<string | null> {
  try {
    return (await almacenamientoLocal.getItem(CLAVE)) || null;
  } catch {
    return null;
  }
}

export async function olvidarCorreoPorConfirmar() {
  try {
    await almacenamientoLocal.removeItem(CLAVE);
  } catch {
    // Nada que olvidar.
  }
}
