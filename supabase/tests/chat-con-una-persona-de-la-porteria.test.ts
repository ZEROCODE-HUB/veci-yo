import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  CLAVE_SERVICIO,
  CUENTA,
  MARCA_PRUEBA,
  UNIDAD,
  URL,
  entrar,
  insertar,
  leer,
  rpc,
  type Sesion,
} from "./apoyo";

/**
 * Un chat con cada persona de la portería (18/11/2026, pedido del cliente).
 *
 * Quien vive en una vivienda elige a una persona de la portería y se abre un
 * chat solo con ella, esté o no de turno. Lo leen sus dos participantes y la
 * administración; nadie más. Cada negativo tiene su positivo al lado.
 */

let sofia: Sesion; // propietaria de la 102
let guardia: Sesion; // portería, con el chat habilitado
let marcela: Sesion; // administradora
let guillermo: Sesion; // propietario de la 101 y la 205: otra vivienda
let bruno: Sesion; // de otro edificio

let membresiaGuardia: string;
let conversacion: string;

function servicio(ruta: string, opciones: RequestInit = {}) {
  return fetch(`${URL}/rest/v1/${ruta}`, {
    ...opciones,
    headers: {
      apikey: CLAVE_SERVICIO,
      Authorization: `Bearer ${CLAVE_SERVICIO}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(opciones.headers ?? {}),
    },
  });
}

/** Borra el chat de la 102 con esa persona, con lo que cuelga de él. */
async function limpiar() {
  if (!membresiaGuardia) return;
  const r = await servicio(
    `conversacion?select=id&tipo=eq.directa&unidad_id=eq.${UNIDAD.u102}&porteria_membresia_id=eq.${membresiaGuardia}`,
  );
  const filas = (await r.json()) as { id: string }[];
  for (const { id } of filas) {
    for (const ruta of [
      `notificacion?entidad_id=eq.${id}`,
      `mensaje?conversacion_id=eq.${id}`,
      `participante_conversacion?conversacion_id=eq.${id}`,
      `conversacion?id=eq.${id}`,
    ]) {
      const borrado = await servicio(ruta, { method: "DELETE" });
      expect(borrado.ok, `${ruta}: ${await borrado.text()}`).toBe(true);
    }
  }
}

beforeAll(async () => {
  [sofia, guardia, marcela, guillermo, bruno] = await Promise.all([
    entrar(CUENTA.vecino),
    entrar(CUENTA.guardia),
    entrar(CUENTA.admin),
    entrar(CUENTA.propietario),
    entrar(CUENTA.vecinoAjeno),
  ]);
  const r = await servicio(
    `membresia_condominio?select=id&usuario_id=eq.${guardia.usuarioId}&rol=eq.guardia&activo=eq.true`,
  );
  const [fila] = (await r.json()) as { id: string }[];
  expect(fila?.id, "el guardia de prueba tiene membresía").toBeTruthy();
  membresiaGuardia = fila.id;
  // El propio cero.
  await limpiar();
});

afterAll(limpiar);

describe("un chat con una persona de la portería", () => {
  it("quien vive en la 102 lo abre, y la segunda vez es el mismo", async () => {
    const abierto = await rpc<string>(sofia, "abrir_chat_con_la_porteria", {
      p_unidad_id: UNIDAD.u102,
      p_membresia_id: membresiaGuardia,
    });
    expect(abierto.estado, abierto.mensaje).toBe(200);
    conversacion = abierto.datos;

    const otraVez = await rpc<string>(sofia, "abrir_chat_con_la_porteria", {
      p_unidad_id: UNIDAD.u102,
      p_membresia_id: membresiaGuardia,
    });
    expect(otraVez.datos).toBe(conversacion);
  });

  it("no se abre desde una vivienda ajena ni desde otro edificio", async () => {
    const ajena = await rpc(guillermo, "abrir_chat_con_la_porteria", {
      p_unidad_id: UNIDAD.u102,
      p_membresia_id: membresiaGuardia,
    });
    expect(ajena.estado).toBeGreaterThanOrEqual(400);
    expect(ajena.mensaje).toMatch(/Solo quien vive en esa vivienda/);

    const deFuera = await rpc(bruno, "abrir_chat_con_la_porteria", {
      p_unidad_id: UNIDAD.u102,
      p_membresia_id: membresiaGuardia,
    });
    expect(deFuera.mensaje).toMatch(/Solo quien vive en esa vivienda/);
  });

  it("lo ven la vecina, el guardia y la administración; otro vecino no", async () => {
    const ver = async (s: Sesion) =>
      (await leer<{ id: string }[]>(s, `conversacion?select=id&id=eq.${conversacion}`)).datos;
    expect(await ver(sofia)).toHaveLength(1);
    expect(await ver(guardia)).toHaveLength(1);
    expect(await ver(marcela)).toHaveLength(1);
    expect(await ver(guillermo)).toHaveLength(0);
    expect(await ver(bruno)).toHaveLength(0);
  });

  it("cada uno lo ve con el nombre que le toca", async () => {
    const nombre = async (s: Sesion) => {
      const r = await rpc<{ conversacion_id: string; nombre: string }[]>(s, "con_quien_hablo");
      expect(r.estado, r.mensaje).toBe(200);
      return r.datos.find((f) => f.conversacion_id === conversacion)?.nombre;
    };
    // La vecina: el cargo y el nombre de la persona de la portería.
    expect(await nombre(sofia)).toMatch(/^(Seguridad|Conserje|[^·]+) · .+/);
    expect(await nombre(sofia)).not.toMatch(/Dpto/);
    // El guardia: quién le escribe y desde qué vivienda.
    expect(await nombre(guardia)).toMatch(/ · Dpto 102$/);
    // La administración: los dos lados.
    expect(await nombre(marcela)).toMatch(/^Dpto 102 con /);
    // Otro vecino: nada.
    expect(await nombre(guillermo)).toBeUndefined();
  });

  it("un mensaje de la vecina le avisa al guardia con el nombre de quien escribe", async () => {
    const escrito = await insertar(sofia, "mensaje?select=id", {
      conversacion_id: conversacion,
      autor_id: sofia.usuarioId,
      autor_nombre: MARCA_PRUEBA,
      texto: `${MARCA_PRUEBA} hola`,
    });
    expect(escrito.estado, escrito.mensaje).toBe(201);

    const r = await servicio(
      `notificacion?select=usuario_id,titulo&entidad_id=eq.${conversacion}`,
    );
    const avisos = (await r.json()) as { usuario_id: string; titulo: string }[];
    const alGuardia = avisos.filter((a) => a.usuario_id === guardia.usuarioId);
    expect(alGuardia).toHaveLength(1);
    // El nombre lo pone la base desde el perfil, no lo que mande la app.
    const m = await servicio(`mensaje?select=autor_nombre&conversacion_id=eq.${conversacion}`);
    const [{ autor_nombre }] = (await m.json()) as { autor_nombre: string }[];
    expect(alGuardia[0].titulo).toBe(autor_nombre);
    expect(alGuardia[0].titulo).not.toBe("Mensaje nuevo");
    // A quien escribió, no.
    expect(avisos.some((a) => a.usuario_id === sofia.usuarioId)).toBe(false);
  });
});
