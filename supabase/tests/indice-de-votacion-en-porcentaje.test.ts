import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  CLAVE_SERVICIO,
  CONDOMINIO,
  CUENTA,
  MARCA_PRUEBA,
  UNIDAD,
  URL,
  actualizar,
  entrar,
  insertar,
  rpc,
  type Sesion,
} from "./apoyo";

/**
 * El índice de votación es un porcentaje (18/11/2026, pedido del cliente).
 *
 * Cada departamento va de más de 0 a 100, entre todos no pasan de 100, una
 * encuesta «según el índice» solo se crea con el 100 %, y mientras una está
 * abierta los índices no se mueven. Cada rechazo tiene su control positivo.
 */

const TITULO = `${MARCA_PRUEBA} encuesta según el índice`;
const UNIDADES = [UNIDAD.u101, UNIDAD.u102, UNIDAD.u205, UNIDAD.u206, UNIDAD.u301];

let marcela: Sesion; // administradora
let bruno: Sesion; // de otro edificio

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

/** Borra las encuestas de esta prueba (con lo que cuelga) y vacía los índices. */
async function limpiar() {
  const r = await servicio(
    `publicacion?select=id&condominio_id=eq.${CONDOMINIO}&titulo=eq.${encodeURIComponent(TITULO)}`,
  );
  const filas = (await r.json()) as { id: string }[];
  for (const { id } of filas) {
    for (const ruta of [`notificacion?entidad_id=eq.${id}`, `opcion_voto?publicacion_id=eq.${id}`, `publicacion?id=eq.${id}`]) {
      const borrado = await servicio(ruta, { method: "DELETE" });
      expect(borrado.ok, `${ruta}: ${await borrado.text()}`).toBe(true);
    }
  }
  const vaciado = await servicio(`unidad?condominio_id=eq.${CONDOMINIO}`, {
    method: "PATCH",
    body: JSON.stringify({ indice_votacion: null }),
  });
  expect(vaciado.ok, await vaciado.text()).toBe(true);
}

const ponerIndice = (unidad: string, indice: number | null) =>
  actualizar(marcela, `unidad?id=eq.${unidad}`, { indice_votacion: indice });

const crearEncuestaPorIndice = () =>
  insertar(marcela, "publicacion?select=id", {
    condominio_id: CONDOMINIO,
    categoria: "administracion",
    titulo: TITULO,
    tipo: "encuesta",
    creada_por: marcela.usuarioId,
    para_propietarios: false,
    para_residentes: false,
    para_huespedes: false,
    para_porteria: true,
    quien_vota: "vivienda",
    como_se_cuenta: "indice",
  });

beforeAll(async () => {
  [marcela, bruno] = await Promise.all([entrar(CUENTA.admin), entrar(CUENTA.vecinoAjeno)]);
  // El edificio de pruebas tiene exactamente estas cinco viviendas.
  const r = await servicio(`unidad?select=id&condominio_id=eq.${CONDOMINIO}&deleted_at=is.null`);
  const ids = ((await r.json()) as { id: string }[]).map((f) => f.id).sort();
  expect(ids).toEqual([...UNIDADES].sort());
  // El propio cero.
  await limpiar();
});

afterAll(limpiar);

describe("el índice de votación es un porcentaje", () => {
  it("empieza vacío, y el edificio lo dice", async () => {
    const r = await rpc(marcela, "indice_de_votacion_del_edificio", { p_condominio_id: CONDOMINIO });
    expect(r.estado, r.mensaje).toBe(200);
    expect(r.datos).toMatchObject({ suma: 0, viviendas: 5, sin_indice: 5, completo: false });
    // Alguien de otro edificio no lo ve.
    const ajeno = await rpc(bruno, "indice_de_votacion_del_edificio", { p_condominio_id: CONDOMINIO });
    expect(ajeno.datos).toBeNull();
  });

  it("cada uno va de más de 0 a 100", async () => {
    expect((await ponerIndice(UNIDAD.u101, 0)).estado).toBeGreaterThanOrEqual(400);
    expect((await ponerIndice(UNIDAD.u101, 100.5)).estado).toBeGreaterThanOrEqual(400);
    // Control positivo.
    const bien = await ponerIndice(UNIDAD.u101, 12.5);
    expect(bien.estado, bien.mensaje).toBe(200);
  });

  it("entre todos no pasan de 100", async () => {
    // 12,5 + 90 = 102,5: no.
    const demasiado = await ponerIndice(UNIDAD.u102, 90);
    expect(demasiado.estado).toBeGreaterThanOrEqual(400);
    expect(demasiado.mensaje).toMatch(/no puede pasar de 100 %/);
    expect(demasiado.mensaje).toMatch(/como máximo 87,5 %/);
    // 12,5 + 87,5 = 100: sí.
    const justo = await ponerIndice(UNIDAD.u102, 87.5);
    expect(justo.estado, justo.mensaje).toBe(200);
    // Y bajar siempre se puede.
    const baja = await ponerIndice(UNIDAD.u102, 27.5);
    expect(baja.estado, baja.mensaje).toBe(200);
  });

  it("una encuesta según el índice no se crea sin el 100 %", async () => {
    // Van 12,5 + 27,5 = 40, y tres sin índice.
    const sinCien = await crearEncuestaPorIndice();
    expect(sinCien.estado).toBeGreaterThanOrEqual(400);
    expect(sinCien.mensaje).toMatch(/suman 40 % y 3 no tienen índice/);

    // Todos con índice y 100 exactos: sí.
    for (const [unidad, indice] of [
      [UNIDAD.u205, 20],
      [UNIDAD.u206, 20],
      [UNIDAD.u301, 20],
    ] as const) {
      const r = await ponerIndice(unidad, indice);
      expect(r.estado, r.mensaje).toBe(200);
    }
    const estado = await rpc(marcela, "indice_de_votacion_del_edificio", { p_condominio_id: CONDOMINIO });
    expect(estado.datos).toMatchObject({ suma: 100, sin_indice: 0, completo: true });
    const conCien = await crearEncuestaPorIndice();
    expect(conCien.estado, conCien.mensaje).toBe(201);
  });

  it("con una encuesta según el índice abierta, los índices no se mueven", async () => {
    const r = await ponerIndice(UNIDAD.u301, 10);
    expect(r.estado).toBeGreaterThanOrEqual(400);
    expect(r.mensaje).toMatch(/encuesta abierta/);
    const fila = await servicio(`unidad?select=indice_votacion&id=eq.${UNIDAD.u301}`);
    const [{ indice_votacion }] = (await fila.json()) as { indice_votacion: number }[];
    expect(Number(indice_votacion)).toBe(20);
  });
});
