import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, supabase } from "./cliente";
import { crearReserva } from "@/features/zonas/services/zonas.repo";

/**
 * Recorrido: no se reserva una zona para un día que ya pasó.
 *
 * Lo reportó el cliente el 24/09/2026: el calendario dejaba marcar fechas
 * pasadas y la base las aceptaba. No lo impedía nada.
 *
 * La comprobación vive en un disparador, no en el calendario: una pantalla
 * puede dejar de ofrecer los días pasados y la base seguiría aceptando la
 * fila --basta otra pantalla, una versión vieja de la app, o una llamada
 * directa--.
 *
 * Y cuenta el día **en la zona horaria del condominio**. `current_date` es
 * UTC, y entre las 19:00 y la medianoche de Bogotá en UTC ya es mañana: una
 * reserva para hoy se habría rechazado cinco horas cada día. Por eso el caso
 * de "hoy sí se puede" es tan importante como el de "ayer no".
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const ANFITRIONA = "vecino@veciyo.test";
const ADMIN = "admin@veciyo.test";

const MARCA = "[prueba] recorrido pasado";

let zonaId = "";
const creadas: string[] = [];

/** Una fecha relativa a hoy, en el formato que usa la pantalla. */
function fecha(diasDesdeHoy: number): string {
  const d = new Date();
  d.setDate(d.getDate() + diasDesdeHoy);
  return [
    String(d.getDate()).padStart(2, "0"),
    String(d.getMonth() + 1).padStart(2, "0"),
    d.getFullYear(),
  ].join("/");
}

beforeAll(async () => {
  await entrarComo(ANFITRIONA);
  const { data } = await supabase
    .from("zona_comun")
    .select("id")
    .eq("activa", true)
    .eq("permite_estancia_larga", true)
    .limit(1)
    .single();
  zonaId = data!.id;
});

afterAll(async () => {
  await salir();
  await entrarComo(ADMIN);
  for (const id of creadas) {
    await supabase.from("reserva_zona").delete().eq("id", id);
  }
  await salir();
});

describe("la fecha de una reserva", () => {
  it("ayer no se puede reservar", async () => {
    await expect(
      crearReserva({
        zonaId,
        unidadId: U102,
        fecha: fecha(-1),
        horaInicio: "09:00",
        horaFin: "10:00",
        comentarios: MARCA,
      }),
    ).rejects.toThrow();
  });

  it("ni la semana pasada", async () => {
    await expect(
      crearReserva({
        zonaId,
        unidadId: U102,
        fecha: fecha(-7),
        horaInicio: "09:00",
        horaFin: "10:00",
        comentarios: MARCA,
      }),
    ).rejects.toThrow();
  });

  it("hoy sí, porque el día se cuenta donde está el condominio", async () => {
    /*
      El control que hace comprobable lo de arriba. Con `current_date` --UTC--
      este caso se pondría rojo cada noche a partir de las 19:00 de Bogotá, y
      alguien acabaría "arreglándolo" quitando la restricción.
    */
    const id = await crearReserva({
      zonaId,
      unidadId: U102,
      fecha: fecha(0),
      horaInicio: "07:00",
      horaFin: "08:00",
      comentarios: MARCA,
    });
    creadas.push(id);
    expect(id).toBeTruthy();
  });

  it("y mañana también", async () => {
    const id = await crearReserva({
      zonaId,
      unidadId: U102,
      fecha: fecha(1),
      horaInicio: "07:00",
      horaFin: "08:00",
      comentarios: MARCA,
    });
    creadas.push(id);
    expect(id).toBeTruthy();
  });

  it("una reserva antigua se puede seguir cancelando", async () => {
    /*
      El disparador solo mira cuando la fecha entra o cambia. Si mirara siempre,
      la administración no podría cerrar el histórico: cancelar una reserva del
      mes pasado fallaría por una fecha que nadie está tocando.
    */
    await salir();
    await entrarComo(ADMIN);

    const { data: antigua } = await supabase
      .from("reserva_zona")
      .insert({
        zona_id: zonaId,
        unidad_id: U102,
        fecha: "2026-09-24",
        hora_inicio: "05:00",
        hora_fin: "06:00",
        comentarios: MARCA,
      })
      .select("id")
      .single();
    creadas.push(antigua!.id);

    // Se la lleva al pasado por la puerta de atrás, que es como estaría una
    // reserva vieja de verdad, y se comprueba que aun así se puede cancelar.
    const { error } = await supabase
      .from("reserva_zona")
      .update({ estado: "cancelada" })
      .eq("id", antigua!.id);
    expect(error).toBeNull();

    await salir();
    await entrarComo(ANFITRIONA);
  });
});
