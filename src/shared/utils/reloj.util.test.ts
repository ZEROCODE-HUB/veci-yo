import { afterEach, describe, expect, it } from "vitest";
import {
  ahora,
  desdeLaBase,
  desfasesDelReloj,
  fijarRelojDelEdificio,
  haciaLaBase,
  olvidarRelojDelEdificio,
} from "./reloj.util";

/** La hora de pared del teléfono en `ms`, escrita como la manda la base. */
function paredDelTelefono(ms: number) {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

const HORA = 60 * 60_000;

afterEach(() => olvidarRelojDelEdificio());

describe("el reloj del edificio", () => {
  it("con el celular bien puesto no corrige nada", () => {
    const t = Date.now();
    fijarRelojDelEdificio({ ahoraMs: t + 20_000, ahoraLocal: paredDelTelefono(t + 20_000) }, t);
    expect(desfasesDelReloj()).toEqual({ reloj: 0, zona: 0 });
    const iso = "2026-11-04T20:30:00.000Z";
    expect(desdeLaBase(iso).getTime()).toBe(new Date(iso).getTime());
  });

  it("un reloj atrasado una hora se corrige, y la hora de pared queda bien", () => {
    // El caso del 217: el servidor va una hora por delante del teléfono y la
    // hora de pared del edificio es la del servidor en su zona.
    const telefono = Date.now();
    const servidor = telefono + HORA;
    fijarRelojDelEdificio({ ahoraMs: servidor, ahoraLocal: paredDelTelefono(telefono) }, telefono);
    expect(desfasesDelReloj().reloj).toBe(HORA);
    expect(desfasesDelReloj().zona).toBe(-HORA);
    // La pared del edificio es la que ya enseñaba el teléfono…
    expect(Math.abs(ahora().getTime() - Date.now())).toBeLessThan(1000);
    // …y un instante de la base se pinta una hora antes, en la zona del edificio.
    const iso = new Date(servidor).toISOString();
    expect(desdeLaBase(iso).getTime()).toBe(servidor - HORA);
  });

  it("lo que sale hacia la base es el instante real", () => {
    const telefono = Date.now();
    fijarRelojDelEdificio({ ahoraMs: telefono, ahoraLocal: paredDelTelefono(telefono - 2 * HORA) }, telefono);
    expect(desfasesDelReloj().zona).toBe(-2 * HORA);
    const iso = "2026-11-04T20:30:00.000Z";
    expect(haciaLaBase(desdeLaBase(iso))).toBe(iso);
  });

  it("sin edificio solo corrige el reloj", () => {
    const telefono = Date.now();
    fijarRelojDelEdificio({ ahoraMs: telefono + 5 * 60_000, ahoraLocal: null }, telefono);
    expect(desfasesDelReloj()).toEqual({ reloj: 5 * 60_000, zona: 0 });
  });
});
