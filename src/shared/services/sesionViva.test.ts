import { describe, expect, it, vi } from "vitest";
import {
  AVISO_SESION_MUERTA,
  fetchQueRenueva,
  marcarSalidaPorSesionMuerta,
  sesionMuerta,
  tomarMotivoDeSalida,
} from "./sesionViva";

/**
 * Que ninguna pantalla se quede con una sesión muerta (21/10/2026): el
 * intercomunicador respondía «Sesión no válida» porque la sesión del guardia
 * se había anulado en otro dispositivo.
 */
const FUNCION = "https://x.supabase.co/functions/v1/token-llamada";
const BASE = "https://x.supabase.co/rest/v1/visita";
const respuesta = (status: number) => new Response("{}", { status });

describe("fetchQueRenueva", () => {
  it("si una función responde 401, renueva y reintenta con el permiso nuevo", async () => {
    const base = vi
      .fn()
      .mockResolvedValueOnce(respuesta(401))
      .mockResolvedValueOnce(respuesta(200));
    const alMorir = vi.fn();
    const f = fetchQueRenueva(base, async () => "permiso-nuevo", alMorir);

    const r = await f(FUNCION, { headers: { Authorization: "Bearer viejo" } });

    expect(r.status).toBe(200);
    expect(base).toHaveBeenCalledTimes(2);
    const cabeceras = base.mock.calls[1][1].headers as Headers;
    expect(cabeceras.get("Authorization")).toBe("Bearer permiso-nuevo");
    expect(alMorir).not.toHaveBeenCalled();
  });

  it("si no se puede renovar, la sesión está muerta y se avisa", async () => {
    const base = vi.fn().mockResolvedValue(respuesta(401));
    const alMorir = vi.fn();
    const f = fetchQueRenueva(base, async () => null, alMorir);

    const r = await f(FUNCION, {});

    expect(r.status).toBe(401);
    expect(alMorir).toHaveBeenCalledTimes(1);
    expect(base).toHaveBeenCalledTimes(1);
  });

  it("un 401 de la base no se toca: la base ya tiene su propio camino", async () => {
    const base = vi.fn().mockResolvedValue(respuesta(401));
    const renovar = vi.fn();
    const f = fetchQueRenueva(base, renovar, vi.fn());

    await f(BASE, {});

    expect(renovar).not.toHaveBeenCalled();
  });

  it("lo que sale bien pasa tal cual, sin renovar nada", async () => {
    const base = vi.fn().mockResolvedValue(respuesta(200));
    const renovar = vi.fn();
    const f = fetchQueRenueva(base, renovar, vi.fn());

    const r = await f(FUNCION, {});

    expect(r.status).toBe(200);
    expect(renovar).not.toHaveBeenCalled();
  });
});

describe("sesionMuerta", () => {
  it("un no del servidor de acceso es una sesión muerta", () => {
    expect(sesionMuerta({ status: 401 })).toBe(true);
    expect(sesionMuerta({ status: 403 })).toBe(true);
  });

  it("también como la deja la librería: sesión que falta o no encontrada", () => {
    expect(sesionMuerta({ status: 400, name: "AuthSessionMissingError" })).toBe(true);
    expect(sesionMuerta({ status: 403, code: "session_not_found" })).toBe(true);
  });

  it("sin red no se saca a nadie", () => {
    expect(sesionMuerta({ status: 0, name: "AuthRetryableFetchError" })).toBe(false);
    expect(sesionMuerta({})).toBe(false);
    expect(sesionMuerta(null)).toBe(false);
  });
});

describe("el aviso al sacar a alguien", () => {
  it("se dice una vez y no se repite", () => {
    marcarSalidaPorSesionMuerta();
    expect(tomarMotivoDeSalida()).toBe(AVISO_SESION_MUERTA);
    expect(tomarMotivoDeSalida()).toBeNull();
  });
});
