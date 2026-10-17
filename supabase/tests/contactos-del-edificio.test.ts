import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  CLAVE_SERVICIO,
  CONDOMINIO,
  CUENTA,
  MARCA_PRUEBA,
  URL,
  api,
  entrar,
  insertar,
  leer,
  type Sesion,
} from "./apoyo";

/**
 * Los contactos del edificio (16/10/2026): el equipo administrativo y las
 * empresas de seguridad y limpieza. Los carga la administración y los ven los
 * miembros del edificio en Soporte → Contacto.
 *
 * Cada «no» lleva su «sí» al lado: que la vecina no pueda cargar uno no prueba
 * nada si la administración tampoco pudiera.
 */

const AJENO = "22222222-2222-2222-2222-222222222222";
const NOMBRE = `${MARCA_PRUEBA} Contadora del edificio`;

let marcela: Sesion;
let sofia: Sesion;
let juan: Sesion;
let bruno: Sesion;
let tomas: Sesion;

function servicio(ruta: string, opciones: RequestInit = {}) {
  return fetch(`${URL}/rest/v1/${ruta}`, {
    ...opciones,
    headers: {
      apikey: CLAVE_SERVICIO,
      Authorization: `Bearer ${CLAVE_SERVICIO}`,
      "Content-Type": "application/json",
      ...(opciones.headers ?? {}),
    },
  });
}

async function limpiar() {
  const r = await servicio(
    `contacto_condominio?nombre=like.${encodeURIComponent(`${MARCA_PRUEBA}*`)}`,
    { method: "DELETE" },
  );
  expect(r.ok, "la limpieza tiene que poder borrar").toBe(true);
}

beforeAll(async () => {
  [marcela, sofia, juan, bruno, tomas] = await Promise.all([
    entrar(CUENTA.admin),
    entrar(CUENTA.vecino),
    entrar(CUENTA.guardia),
    entrar(CUENTA.vecinoAjeno),
    entrar(CUENTA.huesped),
  ]);
  // Una corrida que murió a mitad puede haber dejado el suyo.
  await limpiar();
});

afterAll(limpiar);

const nombresQueVe = async (sesion: Sesion) => {
  const r = await leer<Array<{ nombre: string }>>(
    sesion,
    `contacto_condominio?select=nombre&condominio_id=eq.${CONDOMINIO}&deleted_at=is.null`,
  );
  expect(r.estado).toBe(200);
  return (r.datos ?? []).map((f) => f.nombre);
};

describe("quién carga los contactos del edificio", () => {
  it("una vecina no puede", async () => {
    const r = await api(sofia, "/rest/v1/contacto_condominio", {
      metodo: "POST",
      cuerpo: { condominio_id: CONDOMINIO, tipo: "equipo", nombre: `${MARCA_PRUEBA} Intrusa` },
      prefer: "return=minimal",
    });
    expect(r.estado).toBe(403);
  });

  it("un vecino de otro edificio tampoco, en el nuestro", async () => {
    const r = await api(bruno, "/rest/v1/contacto_condominio", {
      metodo: "POST",
      cuerpo: { condominio_id: CONDOMINIO, tipo: "equipo", nombre: `${MARCA_PRUEBA} Intrusa` },
      prefer: "return=minimal",
    });
    expect(r.estado).toBe(403);
  });

  it("la administración sí", async () => {
    const r = await insertar(marcela, "contacto_condominio", {
      condominio_id: CONDOMINIO,
      tipo: "equipo",
      nombre: NOMBRE,
      cargo: "Contadora",
      telefono: "3105551234",
      codigo_pais: "CO",
    });
    expect(r.estado).toBe(201);
  });
});

describe("quién los ve", () => {
  it("la vecina y la portería del edificio", async () => {
    expect(await nombresQueVe(sofia)).toContain(NOMBRE);
    expect(await nombresQueVe(juan)).toContain(NOMBRE);
  });

  it("nadie de otro edificio", async () => {
    expect(await nombresQueVe(bruno)).not.toContain(NOMBRE);
    // El control positivo de la misma lectura: Marcela sí lo ve.
    expect(await nombresQueVe(marcela)).toContain(NOMBRE);
  });

  it("un huésped temporal no: vive aquí unos días, no pertenece al edificio", async () => {
    expect(await nombresQueVe(tomas)).not.toContain(NOMBRE);
  });

  it("y un vecino de otro edificio solo ve los de su edificio", async () => {
    const r = await leer<Array<{ condominio_id: string }>>(
      bruno,
      "contacto_condominio?select=condominio_id",
    );
    expect(r.estado).toBe(200);
    expect((r.datos ?? []).every((f) => f.condominio_id === AJENO)).toBe(true);
  });
});

describe("quitar uno", () => {
  it("la vecina no puede; la administración sí, y deja de verse", async () => {
    const fila = await leer<Array<{ id: string }>>(
      marcela,
      `contacto_condominio?select=id&nombre=eq.${encodeURIComponent(NOMBRE)}`,
    );
    const id = fila.datos[0].id;

    const deSofia = await api<unknown[]>(sofia, `/rest/v1/contacto_condominio?id=eq.${id}`, {
      metodo: "PATCH",
      cuerpo: { deleted_at: new Date().toISOString() },
    });
    // Un update que la política filtra no falla: no toca ninguna fila.
    expect(deSofia.datos).toEqual([]);
    expect(await nombresQueVe(sofia)).toContain(NOMBRE);

    const deMarcela = await api(marcela, `/rest/v1/contacto_condominio?id=eq.${id}`, {
      metodo: "PATCH",
      cuerpo: { deleted_at: new Date().toISOString() },
      prefer: "return=minimal",
    });
    expect(deMarcela.estado).toBe(204);
    expect(await nombresQueVe(sofia)).not.toContain(NOMBRE);
  });
});
