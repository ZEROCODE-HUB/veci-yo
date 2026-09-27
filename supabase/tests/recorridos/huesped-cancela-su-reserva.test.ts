import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  conEstanciaVigente,
  entrarComo,
  salir,
  supabase,
} from "./cliente";
import {
  cancelarReserva,
  crearReserva,
  obtenerReservas,
} from "@/features/zonas/services/zonas.repo";

/**
 * Recorrido: el huésped cancela la reserva que pidió.
 *
 * Y no la del propietario de la vivienda. Para un residente la reserva es de
 * la unidad; para el huésped es **personal**, porque está de paso y no
 * responde por lo que reserven los demás.
 *
 * Aquí hay una trampa que ya mordió en este proyecto: `eliminarReserva` hace
 * un `delete`, y **un `delete` sin política devuelve éxito y no borra nada**.
 * Si el huésped no tuviera permiso, el botón de cancelar diría que todo fue
 * bien y la reserva seguiría en pie. Por eso el recorrido no mira la respuesta
 * de la llamada: cuenta lo que queda.
 */

const U102 = "44444444-4444-4444-4444-444444444443";
const HUESPED = "nuevo.inquilino@veciyo.test";
const OTRO_HUESPED = "laura.invitada@veciyo.test";
const ANFITRIONA = "vecino@veciyo.test";
const ADMIN = "admin@veciyo.test";

const MARCA = "[prueba] recorrido cancelar";

let zonaCorta = "";
let miReserva = "";
let laDeLaAnfitriona = "";

function manana(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return [
    String(d.getDate()).padStart(2, "0"),
    String(d.getMonth() + 1).padStart(2, "0"),
    d.getFullYear(),
  ].join("/");
}

/**
 * El estado real de una reserva, **preguntado como administración**.
 *
 * La primera versión lo comprobaba con la sesión del huésped y daba por
 * cancelada la reserva de otro: el huésped no la *ve* --su política de lectura
 * es `solicitada_por = auth.uid()`-- y "no la veo" se confundía con "ya no
 * está". Es la misma trampa que este archivo advierte del `delete`, cometida
 * dentro del propio archivo.
 */
async function estadoReal(id: string): Promise<string | null> {
  const sesionPrevia = (await supabase.auth.getUser()).data.user?.email ?? null;
  await salir();
  await entrarComo(ADMIN);
  const { data } = await supabase
    .from("reserva_zona")
    .select("estado")
    .eq("id", id)
    .maybeSingle();
  await salir();
  if (sesionPrevia) await entrarComo(sesionPrevia);
  return data?.estado ?? null;
}

/**
 * Devuelve las fechas de la estancia como estaban.
 *
 * Las de prueba caducan --iban del 21/09 al 26/09-- y el dia siguiente
 * este recorrido se cae con un error de RLS que no menciona ninguna fecha.
 */
let devolverEstancia: () => Promise<void> = async () => {};

beforeAll(async () => {
  devolverEstancia = await conEstanciaVigente(U102, [HUESPED, OTRO_HUESPED]);
  await entrarComo(ANFITRIONA);
  const { data } = await supabase
    .from("zona_comun")
    .select("id")
    .eq("activa", true)
    .eq("permite_estancia_corta", true)
    .eq("permite_estancia_larga", true)
    .limit(1)
    .single();
  zonaCorta = data!.id;

  // Una reserva de la propietaria, para comprobar que el huésped no la toca.
  laDeLaAnfitriona = (await crearReserva({
    zonaId: zonaCorta,
    unidadId: U102,
    fecha: manana(),
    horaInicio: "16:00",
    horaFin: "17:00",
    comentarios: MARCA,
  })).id;

  await salir();
  await entrarComo(HUESPED);
  miReserva = (await crearReserva({
    zonaId: zonaCorta,
    unidadId: U102,
    fecha: manana(),
    horaInicio: "18:00",
    horaFin: "19:00",
    comentarios: MARCA,
  })).id;
});

afterAll(async () => {
  await devolverEstancia();
  await salir();
  await entrarComo(ADMIN);
  for (const id of [miReserva, laDeLaAnfitriona]) {
    if (id) await supabase.from("reserva_zona").delete().eq("id", id);
  }
  await salir();
});

describe("el huésped cancela su reserva", () => {
  it("la suya queda cancelada de verdad, no solo en la respuesta", async () => {
    /*
      Se comprueba el estado después, no si la llamada falló. La pantalla
      llamaba a `eliminarReserva`, un `delete` que el huésped no tiene permiso
      de hacer, y **PostgREST responde que todo fue bien**: el botón decía
      "listo" y la reserva seguía ocupando la franja.
    */
    await cancelarReserva(miReserva);
    expect(await estadoReal(miReserva)).toBe("cancelada");
  });

  it("y la ve cancelada en su lista, no desaparecida", async () => {
    // Una reserva que existió es un hecho: la zona estuvo apartada. Se queda,
    // con su estado.
    const reservas = await obtenerReservas();
    const mia = reservas.find((r) => r.uuid === miReserva);
    expect(mia?.estado).toBe("Cancelado");
  });

  it("pero no cancela la de la propietaria de la vivienda", async () => {
    /*
      El control que importa. Para un residente la reserva es de la unidad;
      para el huésped es personal. Una política que solo preguntara
      "¿perteneces a la 102?" le dejaría borrar la de Sofía.
    */
    await cancelarReserva(laDeLaAnfitriona).catch(() => {});
    expect(await estadoReal(laDeLaAnfitriona)).not.toBe("cancelada");
  });

  it("ni la de otro huésped de la misma vivienda", async () => {
    // Laura es huésped de la misma 102: mismo rol, misma unidad, distinta
    // persona.
    await salir();
    await entrarComo(OTRO_HUESPED);
    const suya = (await crearReserva({
      zonaId: zonaCorta,
      unidadId: U102,
      fecha: manana(),
      horaInicio: "20:00",
      horaFin: "21:00",
      comentarios: MARCA,
    })).id;

    await salir();
    await entrarComo(HUESPED);
    await cancelarReserva(suya).catch(() => {});
    expect(await estadoReal(suya)).not.toBe("cancelada");

    await salir();
    await entrarComo(ADMIN);
    await supabase.from("reserva_zona").delete().eq("id", suya);
    await salir();
    await entrarComo(HUESPED);
  });
});
