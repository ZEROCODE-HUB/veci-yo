import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Crear una cuenta con correo y contraseña.
 *
 * Hasta el 12/10/2026 el formulario «Registrarse» no llamaba a esto: esperaba
 * 150 ms y marcaba a la persona como dentro, sin cuenta ninguna. Nadie podía
 * registrarse desde la aplicación --ni un huésped, ni un propietario
 * invitado-- y la pantalla decía que sí. Salió al aceptar una invitación
 * recién «registrado»: «Se requiere una sesión iniciada».
 *
 * Por eso se mira **que se llama a Supabase** y qué se hace con cada una de
 * sus tres respuestas. Un caso que solo comprobara que no revienta habría
 * pasado igual con el simulacro.
 */
const signUp = vi.fn();

vi.mock("@/shared/services/supabase", () => ({
  supabase: { auth: { signUp: (...args: unknown[]) => signUp(...args) } },
}));

const { registrarConCorreo } = await import("./sesion");

const DATOS = {
  correo: "  Marie@Ejemplo.com ",
  password: "Prueba123!",
  nombre: "María José",
  apellido: "Rodríguez Paz",
  telefono: "+57 3001234567",
  tipoDocumento: "pasaporte",
  identificacion: "AB123456",
};

beforeEach(() => signUp.mockReset());

describe("registrarse con correo", () => {
  it("le pide la cuenta a Supabase, con los datos del perfil dentro", async () => {
    signUp.mockResolvedValue({
      data: { user: { id: "u1", identities: [{}] }, session: null },
      error: null,
    });

    await registrarConCorreo(DATOS);

    expect(signUp).toHaveBeenCalledTimes(1);
    const enviado = signUp.mock.calls[0][0];
    expect(enviado.email).toBe("marie@ejemplo.com");
    expect(enviado.password).toBe("Prueba123!");
    /*
      El nombre y el apellido por separado: con solo el completo, «María José
      Rodríguez Paz» se partía por el primer espacio.
    */
    expect(enviado.options.data).toMatchObject({
      given_name: "María José",
      family_name: "Rodríguez Paz",
      telefono: "+57 3001234567",
      tipo_documento: "pasaporte",
      identificacion: "AB123456",
    });
  });

  it("sin sesión de vuelta, dice que falta confirmar el correo", async () => {
    signUp.mockResolvedValue({
      data: { user: { id: "u1", identities: [{}] }, session: null },
      error: null,
    });

    await expect(registrarConCorreo(DATOS)).resolves.toEqual({
      sesionAbierta: false,
    });
  });

  it("y con sesión, que ya está dentro", async () => {
    signUp.mockResolvedValue({
      data: { user: { id: "u1", identities: [{}] }, session: { user: {} } },
      error: null,
    });

    await expect(registrarConCorreo(DATOS)).resolves.toEqual({
      sesionAbierta: true,
    });
  });

  it("un correo que ya tiene cuenta no se despacha con «revisa tu correo»", async () => {
    // Supabase responde como si fuera nueva, con las identidades vacías.
    signUp.mockResolvedValue({
      data: { user: { id: "u1", identities: [] }, session: null },
      error: null,
    });

    await expect(registrarConCorreo(DATOS)).rejects.toThrow(/ya hay una cuenta/i);
  });

  it("y el fallo de Supabase llega a quien llamó", async () => {
    signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: new Error("Password should be at least 8 characters"),
    });

    await expect(registrarConCorreo(DATOS)).rejects.toThrow(/at least 8/);
  });
});
