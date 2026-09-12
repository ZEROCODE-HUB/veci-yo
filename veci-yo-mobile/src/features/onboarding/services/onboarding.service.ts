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

export async function solicitarRecuperacionRequest(correo: string) {
  await esperar();
  return { correo };
}

export async function completarVerificacionRequest() {
  await esperar();
  return true;
}

export type LoginRequestData = LoginFormData & { rol?: string };
