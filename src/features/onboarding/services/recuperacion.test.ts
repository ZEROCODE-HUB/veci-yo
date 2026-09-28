import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * El correo para poner una contraseña nueva.
 *
 * Esta función era `await esperar(); return { correo }` --un simulacro del
 * prototipo-- mientras las dos pantallas que la usan decían «te enviamos
 * instrucciones». Nadie podía recuperar su contraseña en toda la aplicación,
 * ni desde el login ni desde Perfil, y nada lo delataba: la promesa se
 * resolvía siempre.
 *
 * Por eso la prueba mira **que se llama a Supabase** y que un fallo se
 * propaga. Un caso que solo comprobara que no revienta habría pasado igual
 * con el simulacro.
 */
const resetPasswordForEmail = vi.fn();

vi.mock("@/shared/services/supabase", () => ({
  supabase: { auth: { resetPasswordForEmail: (...args: unknown[]) => resetPasswordForEmail(...args) } },
}));

const { solicitarRecuperacionRequest } = await import("./onboarding.service");

beforeEach(() => resetPasswordForEmail.mockReset());

describe("pedir el enlace de contraseña nueva", () => {
  it("se lo pide a Supabase, con el destino del enlace", async () => {
    resetPasswordForEmail.mockResolvedValue({ error: null });

    await solicitarRecuperacionRequest("sofia@veciyo.test");

    expect(resetPasswordForEmail).toHaveBeenCalledTimes(1);
    const [correo, opciones] = resetPasswordForEmail.mock.calls[0] as [
      string,
      { redirectTo: string },
    ];
    expect(correo).toBe("sofia@veciyo.test");
    expect(opciones.redirectTo).toMatch(/\/nueva-contrasena$/);
  });

  it("y si no se pudo enviar, revienta en vez de decir que sí", async () => {
    /*
      El proyecto usa el servidor de correo compartido de Supabase, con dos
      envíos por hora: fallar no es hipotético. Quien lo pidió tiene que
      enterarse en vez de esperar un correo que no va a llegar.
    */
    resetPasswordForEmail.mockResolvedValue({
      error: new Error("email rate limit exceeded"),
    });

    // Y dicho para quien lo lee, no en el inglés del proveedor.
    await expect(
      solicitarRecuperacionRequest("sofia@veciyo.test"),
    ).rejects.toThrow(/demasiados correos/i);
  });
});
