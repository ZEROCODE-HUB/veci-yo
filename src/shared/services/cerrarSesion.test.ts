import { describe, expect, it, vi } from "vitest";

/**
 * Salir de la aplicación cierra la sesión solo en este dispositivo.
 *
 * Con el alcance global, salir en el celular mataba la sesión del computador y
 * el intercomunicador respondía «Sesión no válida» (21/10/2026).
 */
const signOut = vi.fn().mockResolvedValue({ error: null });

vi.mock("@/shared/services/supabase", () => ({
  supabase: { auth: { signOut: (...args: unknown[]) => signOut(...args) } },
}));

const { cerrarSesionSupabase } = await import("./sesion");

describe("cerrar sesión", () => {
  it("cierra solo en este dispositivo, no en todos", async () => {
    await cerrarSesionSupabase();

    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
  });
});
