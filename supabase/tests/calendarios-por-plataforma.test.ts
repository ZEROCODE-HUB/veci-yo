import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  api,
  CUENTA,
  UNIDAD,
  entrar,
  fueRechazada,
  insertar,
  leer,
  rpc,
  type Sesion,
} from "./apoyo";

/**
 * Un calendario por plataforma (21/10/2026).
 *
 * La vivienda tenía un solo enlace, el de Airbnb; ahora cada plataforma tiene
 * el suyo en `calendario_vivienda`. El enlace es privado --quien lo tiene ve
 * las fechas reservadas--, así que solo lo ve y lo cambia quien configura el
 * alojamiento: Sofía en la 102. La portería y el dueño de otra vivienda, no.
 */
const ENLACE = "https://ical.booking.com/v1/export?t=prueba-de-la-suite";

let sofia: Sesion;
let guardia: Sesion;
let guillermo: Sesion;

const retirarElDePrueba = () =>
  api(sofia, `/rest/v1/calendario_vivienda?unidad_id=eq.${UNIDAD.u102}&plataforma=eq.booking`, {
    metodo: "DELETE",
  });

beforeAll(async () => {
  sofia = await entrar(CUENTA.vecino);
  guardia = await entrar(CUENTA.guardia);
  guillermo = await entrar(CUENTA.propietario);
  // Se trae su propio cero: una corrida interrumpida pudo dejar el suyo.
  await retirarElDePrueba();
});

afterAll(async () => {
  const r = await retirarElDePrueba();
  expect(r.estado).toBeLessThan(300);
});

describe("el calendario de Booking de la 102", () => {
  it("Sofía lo guarda y lo ve en los calendarios de su vivienda", async () => {
    const alta = await insertar(sofia, "calendario_vivienda", {
      unidad_id: UNIDAD.u102,
      plataforma: "booking",
      url: ENLACE,
    });
    expect(alta.estado).toBe(201);

    const r = await rpc<{ plataforma: string; url: string }[]>(sofia, "calendarios_de_unidad", {
      p_unidad_id: UNIDAD.u102,
    });
    expect(r.estado).toBe(200);
    expect(r.datos.find((c) => c.plataforma === "booking")?.url).toBe(ENLACE);
  });

  it("la portería no ve el enlace", async () => {
    const r = await leer<unknown[]>(
      guardia,
      `calendario_vivienda?unidad_id=eq.${UNIDAD.u102}&plataforma=eq.booking`,
    );
    expect(r.datos).toEqual([]);
    const porRpc = await rpc(guardia, "calendarios_de_unidad", { p_unidad_id: UNIDAD.u102 });
    expect(fueRechazada(porRpc)).toBe(true);
  });

  it("el dueño de otra vivienda tampoco, ni puede ponerle uno", async () => {
    const r = await leer<unknown[]>(
      guillermo,
      `calendario_vivienda?unidad_id=eq.${UNIDAD.u102}&plataforma=eq.booking`,
    );
    expect(r.datos).toEqual([]);

    const ajeno = await api(guillermo, "/rest/v1/calendario_vivienda", {
      metodo: "POST",
      cuerpo: { unidad_id: UNIDAD.u102, plataforma: "otra", url: "https://otro.test/x" },
      prefer: "return=minimal",
    });
    expect(fueRechazada(ajeno)).toBe(true);
  });
});

describe("lo que no es un calendario", () => {
  it("una reserva «directa» no tiene calendario que leer", async () => {
    const r = await api(sofia, "/rest/v1/calendario_vivienda", {
      metodo: "POST",
      cuerpo: { unidad_id: UNIDAD.u102, plataforma: "directo", url: "https://otro.test/x" },
      prefer: "return=minimal",
    });
    expect(fueRechazada(r)).toBe(true);
  });

  it("un enlace sin http no se guarda", async () => {
    const r = await api(sofia, `/rest/v1/calendario_vivienda?unidad_id=eq.${UNIDAD.u102}&plataforma=eq.booking`, {
      metodo: "PATCH",
      cuerpo: { url: "no es un enlace" },
      prefer: "return=minimal",
    });
    expect(fueRechazada(r)).toBe(true);
  });
});
