import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, supabase, servicio } from "./cliente";
import { crearVisita } from "@/features/visitas/services/visitas.repo";
import { buscarEstanciaPorCodigo } from "@/features/visitas/services/porteria.repo";

/**
 * Recorrido: la portería busca una estancia por su QR o su código (26/10/2026).
 *
 * El cliente escaneó un QR y «no me llevó a la reserva»: era de otro día, la
 * portería solo ve hoy, mañana y a quien está dentro, y la pantalla se quedaba
 * igual sin decir nada. `buscar_estancia_por_codigo` dice si la portería ya la
 * puede abrir y, si no, de qué vivienda y qué fechas es.
 *
 * Los códigos los pone la base al terminar el preregistro; aquí se escriben con
 * la clave de servicio sobre dos visitas que crea la prueba.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const GUARDIA = "guardia@veciyo.test";
const ANFITRIONA = "vecino@veciyo.test";
const MARCA = "[prueba] busca por codigo";

const HOY_COD = `A1B2C3${Date.now().toString(16).slice(-6).toUpperCase()}`;
const LUEGO_COD = `D4E5F6${Date.now().toString(16).slice(-6).toUpperCase()}`;
const visitas: string[] = [];
let hoy = "";
let luego = "";

function masDias(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

async function nueva(codigo: string, desde: string, hasta: string) {
  const id = await crearVisita({
    condominioId: CONDOMINIO,
    unidadId: U102,
    tipo: "amigos",
    profesion: MARCA,
    instruccionDocumento: "no_verificar",
    invitados: [{ nombre: "[prueba] con su QR" }],
  });
  visitas.push(id);
  const { error } = await servicio
    .from("visita")
    .update({ codigo_acceso: codigo, fecha_desde: desde, fecha_hasta: hasta })
    .eq("id", id);
  if (error) throw error;
  return id;
}

beforeAll(async () => {
  // El día del edificio, que es con el que cuenta la ventana de la portería.
  const { data, error } = await servicio.rpc("hoy_en_el_edificio", { p_condominio_id: CONDOMINIO });
  if (error) throw error;
  hoy = String(data);
  luego = masDias(hoy, 10);
  await entrarComo(ANFITRIONA);
  await nueva(HOY_COD, hoy, hoy);
  await nueva(LUEGO_COD, luego, masDias(luego, 3));
  await salir();
  await entrarComo(GUARDIA);
});

afterAll(async () => {
  await salir();
  if (visitas.length) {
    const { error } = await servicio.from("visita").delete().in("id", visitas);
    if (error) throw error;
  }
});

describe("buscar una estancia por su código", () => {
  it("la de hoy, la portería la puede abrir", async () => {
    const e = await buscarEstanciaPorCodigo(HOY_COD);
    expect(e).toMatchObject({ visitaId: visitas[0], laVe: true, unidad: "102" });
  });

  it("acepta el texto del QR de la app y minúsculas", async () => {
    expect((await buscarEstanciaPorCodigo(`VECIYO:${HOY_COD.toLowerCase()}`))?.visitaId).toBe(visitas[0]);
  });

  it("la de otro día, la encuentra y dice que no la ve todavía, con sus fechas", async () => {
    const e = await buscarEstanciaPorCodigo(LUEGO_COD);
    expect(e).toMatchObject({
      visitaId: visitas[1],
      laVe: false,
      unidad: "102",
      fechaDesde: luego,
      fechaHasta: masDias(luego, 3),
    });
  });

  it("un código que no existe, nada", async () => {
    expect(await buscarEstanciaPorCodigo("FFFFFFFFFFFF")).toBeNull();
  });

  it("quien no es de la portería no encuentra nada, ni la de hoy", async () => {
    await salir();
    await entrarComo(ANFITRIONA);
    expect(await buscarEstanciaPorCodigo(HOY_COD)).toBeNull();
    await salir();
    await entrarComo(GUARDIA);
  });
});
