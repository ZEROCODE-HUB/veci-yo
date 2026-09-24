import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, supabase } from "./cliente";
import {
  crearAnuncio,
  detalleVotacion,
  eliminarAnuncio,
  miVoto,
  obtenerAnuncios,
  votar,
} from "@/features/anuncios/services/anuncios.repo";

/**
 * Recorrido: la administración publica un anuncio con votación y se vota.
 *
 * Es el flujo con más superficie de seguridad de todo el producto: un voto
 * dice qué opina un vecino concreto sobre algo del edificio, y el secreto del
 * voto **lo decide la base, no la pantalla**. Una interfaz que oculte los
 * nombres mientras la consulta los devuelve no es una votación secreta; es una
 * votación pública mal pintada.
 *
 * Por eso el caso del secreto se comprueba pidiendo el detalle nominal
 * directamente: si la base lo entrega, da igual lo que haga la pantalla.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const ADMIN = "admin@veciyo.test"; // Marcela, administradora
const VECINA = "vecino@veciyo.test"; // Sofía, propietaria de la 102
const OTRO = "propietario@veciyo.test"; // Guillermo, 101 y 205

const MARCA = "[prueba] recorrido votacion";

let abierta = "";
let secreta = "";
let opcionesAbierta: { id: string; etiqueta: string }[] = [];
let opcionesSecreta: { id: string; etiqueta: string }[] = [];

async function opcionesDe(publicacionId: string) {
  const { data } = await supabase
    .from("opcion_voto")
    .select("id, etiqueta")
    .eq("publicacion_id", publicacionId)
    .order("orden");
  return (data ?? []) as { id: string; etiqueta: string }[];
}

beforeAll(async () => {
  await entrarComo(ADMIN);

  abierta = await crearAnuncio({
    condominioId: CONDOMINIO,
    // El enum de la base es `anuncio` o `encuesta`: una votacion es una
    // encuesta con opciones.
    tipo: "encuesta",
    categoria: "general",
    titulo: `${MARCA} — pintar la fachada`,
    descripcion: "Con resultados a la vista.",
    opciones: ["Sí", "No"],
  });

  secreta = await crearAnuncio({
    condominioId: CONDOMINIO,
    // El enum de la base es `anuncio` o `encuesta`: una votacion es una
    // encuesta con opciones.
    tipo: "encuesta",
    categoria: "general",
    titulo: `${MARCA} — cambiar de administración`,
    descripcion: "Voto secreto.",
    ocultarResultados: true,
    opciones: ["A favor", "En contra"],
  });

  opcionesAbierta = await opcionesDe(abierta);
  opcionesSecreta = await opcionesDe(secreta);
});

afterAll(async () => {
  await salir();
  await entrarComo(ADMIN);
  for (const id of [abierta, secreta]) {
    if (id) await eliminarAnuncio(id).catch(() => {});
  }
  await salir();
});

describe("un anuncio con votación", () => {
  it("nace con sus opciones", async () => {
    expect(opcionesAbierta).toHaveLength(2);
    expect(opcionesAbierta.map((o) => o.etiqueta)).toEqual(["Sí", "No"]);
  });

  it("los vecinos lo ven en su lista", async () => {
    await salir();
    await entrarComo(VECINA);
    const anuncios = await obtenerAnuncios();
    expect(anuncios.some((a) => a.uuid === abierta)).toBe(true);
  });

  it("una vecina vota, y su voto queda", async () => {
    await votar(abierta, opcionesAbierta[0].id, U102);
    const mio = await miVoto(abierta);
    expect(mio).toContain(opcionesAbierta[0].id);
  });

  it("y no vota dos veces", async () => {
    await expect(
      votar(abierta, opcionesAbierta[1].id, U102),
    ).rejects.toThrow();
  });

  it("no ve el detalle nominal de los demás: no administra el condominio", async () => {
    /*
      Quién votó qué es de la administración. Una vecina puede ver el recuento,
      no la lista con nombres.
    */
    const detalle = await detalleVotacion(abierta);
    expect(detalle).toHaveLength(0);
  });

  it("la administración sí ve el detalle de una votación abierta", async () => {
    // Control positivo: sin esto, el caso del secreto pasaría igual con una
    // función que no devuelve nada nunca.
    await salir();
    await entrarComo(ADMIN);
    const detalle = await detalleVotacion(abierta);
    expect(detalle.length).toBeGreaterThan(0);
    expect(detalle[0].votante).toBeTruthy();
  });

  it("pero en una votación secreta no lo ve nadie, ni la administración", async () => {
    /*
      El caso que de verdad protege algo. El secreto lo impone la base: si
      `detalle_votacion` devolviera los nombres, ocultarlos en la pantalla
      sería un adorno --y bastaría abrir la consola del navegador--.
    */
    await salir();
    await entrarComo(OTRO);
    await votar(secreta, opcionesSecreta[0].id);
    await salir();

    await entrarComo(ADMIN);
    const detalle = await detalleVotacion(secreta);
    expect(detalle).toHaveLength(0);

    /*
      Y sin embargo el voto cuenta: lo que se oculta es **quién**, no cuántos.
      El recuento llega por el camino de la pantalla --`obtenerAnuncios`--,
      porque la tabla `voto` no la lee nadie salvo su autor: el secreto está en
      la fila, no en una consulta que alguien pudiera esquivar.
    */
    const anuncios = await obtenerAnuncios();
    const suya = anuncios.find((a) => a.uuid === secreta);
    expect(suya?.totalVotos).toBe(1);
  });
});
