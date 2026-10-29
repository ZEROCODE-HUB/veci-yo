import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio, supabase } from "./cliente";
import { enviarComprobante, subirComprobante } from "@/features/zonas/services/zonas.repo";

/**
 * Recorrido: el comprobante de pago de una reserva.
 *
 * El KT lo decide en el flujo 4.4: *«Residente envía el comprobante de pago
 * por el chat de la app al Administrador. El Administrador revisa el
 * comprobante y aprueba manualmente — no hay verificación automática contra el
 * banco»*. El cliente lo confirmó el 25/09/2026: cobro manual.
 *
 * La pieza estaba entera y sin usar: `subirComprobante` escribe en el bucket
 * `reservas` y guarda la ruta en `reserva_zona.comprobante_path`, y el bucket
 * tiene sus dos políticas --alta y lectura-- colgando de `puede_ver_reserva`.
 * Lo que no había era ninguna pantalla que la llamara, así que nadie había
 * comprobado nunca si el circuito funciona de verdad.
 *
 * Aquí se comprueba eso: que quien reserva pueda subirlo, que la
 * administración --que es quien aprueba-- pueda leerlo, y que un vecino de
 * otra vivienda no.
 */

const ZONA_PISCINA = "55555555-5555-5555-5555-555555555551";
const U102 = "44444444-4444-4444-4444-444444444443";
const ANFITRIONA = "vecino@veciyo.test"; // Sofía, de la 102
const ADMIN = "admin@veciyo.test";
const AJENO = "propietario@veciyo.test"; // Guillermo, de la 101 y la 205

const MARCA = "[prueba] comprobante de pago";

let reservaId = "";
let ruta = "";

/** Un PNG de un píxel: lo justo para que sea un archivo de verdad. */
const archivo = () =>
  new Blob(
    [
      Uint8Array.from(
        atob(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        ),
        (c) => c.charCodeAt(0),
      ),
    ],
    { type: "image/png" },
  );

beforeAll(async () => {
  await entrarComo(ANFITRIONA);
  const manana = new Date();
  manana.setDate(manana.getDate() + 3);

  const { data, error } = await supabase
    .from("reserva_zona")
    .insert({
      zona_id: ZONA_PISCINA,
      unidad_id: U102,
      fecha: manana.toISOString().slice(0, 10),
      hora_inicio: "16:00",
      hora_fin: "18:00",
      comentarios: MARCA,
    })
    .select("id")
    .single();

  expect(error?.message ?? null).toBeNull();
  reservaId = data!.id;
});

afterAll(async () => {
  await servicio.from("notificacion").delete().eq("entidad_id", reservaId);
  await entrarComo(ANFITRIONA);
  if (ruta) await supabase.storage.from("reservas").remove([ruta]);
  await supabase.from("reserva_zona").delete().eq("id", reservaId);
  await salir();
});

describe("el comprobante de una reserva de pago", () => {
  it("lo sube quien reservó, y queda apuntado en la reserva", async () => {
    await entrarComo(ANFITRIONA);
    ruta = await subirComprobante(reservaId, await archivo().arrayBuffer(), "image/png");

    expect(ruta).toContain(reservaId);

    const { data } = await supabase
      .from("reserva_zona")
      .select("comprobante_path")
      .eq("id", reservaId)
      .single();
    await salir();

    // No basta con que el archivo esté: la reserva tiene que saber dónde.
    expect(data!.comprobante_path).toBe(ruta);
  });

  it("por el botón de la pantalla también se manda un PDF, y queda como PDF", async () => {
    // `enviarComprobante` es lo que llama el menú de la reserva (hueco 10).
    await entrarComo(ANFITRIONA);
    const rutaPdf = await enviarComprobante(reservaId, {
      uri: "data:application/pdf;base64,JVBERi0xLjQKJSVFT0YK",
      nombre: "comprobante.pdf",
      tipoMime: "application/pdf",
    });
    await supabase.storage.from("reservas").remove([rutaPdf]);
    // Se deja apuntado el de antes, que es el que miran los casos de abajo.
    await supabase.from("reserva_zona").update({ comprobante_path: ruta }).eq("id", reservaId);
    await salir();
    expect(rutaPdf.endsWith(".pdf")).toBe(true);
  });

  it("y la administración lo puede leer, que es lo que necesita para aprobar", async () => {
    /*
      Es el punto del flujo 4.4: la administracion mira el comprobante y
      aprueba a mano. Si no pudiera leerlo, la aprobacion seria a ciegas.
    */
    await entrarComo(ADMIN);
    const { data, error } = await supabase.storage
      .from("reservas")
      .download(ruta);
    await salir();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect((data as Blob).size).toBeGreaterThan(0);
  });

  it("pero el dueño de otra vivienda no", async () => {
    /*
      El control que importa. Guillermo es propietario de OTRAS dos viviendas
      del mismo edificio: tiene sesion, tiene reservas propias y no tiene nada
      que hacer mirando el comprobante de pago de la 102.
    */
    await entrarComo(AJENO);
    const { data, error } = await supabase.storage
      .from("reservas")
      .download(ruta);
    await salir();

    // Storage responde con error o con nada; lo que no puede es dar el archivo.
    expect(error !== null || data === null).toBe(true);
  });
});

/*
  La administración se entera (15/10/2026, hueco 10): de la reserva que tiene
  que aprobar y del comprobante cuando llega. La piscina requiere aprobación,
  así que la reserva de arriba nació pendiente.
*/
describe("la administración se entera de lo que tiene que aprobar", () => {
  const avisosDeMarcela = async () => {
    const marcela = await entrarComo(ADMIN);
    await salir();
    const { data } = await servicio
      .from("notificacion")
      .select("titulo, mensaje")
      .eq("usuario_id", marcela)
      .eq("entidad_id", reservaId)
      .eq("tipo", "reserva_por_aprobar")
      .order("created_at");
    return (data ?? []).map((n) => n.titulo);
  };

  it("le llegó el aviso al pedirse y otro al llegar el comprobante", async () => {
    // Uno al pedirse; y uno por cada comprobante que llegó (arriba se mandaron varios).
    const avisos = await avisosDeMarcela();
    expect(avisos[0]).toBe("Reserva por aprobar");
    expect(avisos.filter((t) => t === "Reserva por aprobar")).toHaveLength(1);
    expect(avisos.slice(1).every((t) => t === "Llegó un comprobante de pago")).toBe(true);
    expect(avisos.length).toBeGreaterThan(1);
  });

  it("y a quien reservó, no", async () => {
    const sofia = await entrarComo(ANFITRIONA);
    await salir();
    const { data } = await servicio
      .from("notificacion")
      .select("id")
      .eq("usuario_id", sofia)
      .eq("entidad_id", reservaId)
      .eq("tipo", "reserva_por_aprobar");
    expect(data).toEqual([]);
  });
});
