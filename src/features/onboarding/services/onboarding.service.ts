import { supabase } from "@/shared/services/supabase";
import { BASE_ENLACE } from "@/shared/services/invitaciones";
import type { LoginFormData, RegistroFormData } from "../schemas";

const SIMULATED_REQUEST_DELAY = 150;

function esperar() {
  return new Promise<void>((resolve) =>
    setTimeout(resolve, SIMULATED_REQUEST_DELAY),
  );
}

export async function iniciarSesionRequest(data: {
  correo: string;
  rol?: string;
}) {
  await esperar();
  return data;
}

export async function registrarUsuarioRequest(data: RegistroFormData) {
  await esperar();
  return data;
}

/**
 * Los dos fallos que de verdad salen, dichos para quien los lee.
 *
 * El proveedor responde en inglés --«Email address "x" is invalid», «email rate
 * limit exceeded»-- y eso acababa tal cual en un aviso de la aplicación. Los
 * demás se dejan pasar como vengan: inventar una traducción para cada uno
 * esconde los que no se esperaban.
 */
function enEspanol(mensaje: string): string {
  if (/rate limit/i.test(mensaje)) {
    return "Se enviaron demasiados correos seguidos. Inténtalo dentro de una hora.";
  }
  if (/invalid/i.test(mensaje) && /email/i.test(mensaje)) {
    return "Ese correo no es válido para enviar el enlace.";
  }
  return mensaje;
}

/**
 * Pide a Supabase el correo con el enlace para poner una contraseña nueva.
 *
 * Antes era `await esperar(); return { correo }` --un simulacro heredado del
 * prototipo-- y la pantalla decía «te enviamos instrucciones» igual. Nadie
 * podía recuperar su contraseña, ni desde el login ni desde Perfil, y las dos
 * pantallas afirmaban lo contrario.
 *
 * El error **se propaga**: si Supabase no pudo enviarlo --el proyecto usa su
 * servidor de correo compartido, con dos por hora-- quien lo pidió tiene que
 * enterarse, en vez de quedarse esperando algo que no va a llegar. Es la misma
 * regla que el libro del huésped: tragarse el error deja una pantalla feliz
 * sobre una operación que no ocurrió.
 */
export async function solicitarRecuperacionRequest(correo: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(correo, {
    redirectTo: `${BASE_ENLACE}/nueva-contrasena`,
  });
  if (error) throw new Error(enEspanol(error.message));
  return { correo };
}

export async function completarVerificacionRequest() {
  await esperar();
  return true;
}

export type LoginRequestData = LoginFormData & { rol?: string };
