import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { enDias, entrarComo, salir, servicio, supabase } from "./cliente";
import {
  actualizarParticipante,
  cancelarReserva,
  crearReserva,
} from "@/features/zonas/services/zonas.repo";

/**
 * Recorrido: la portería ve las reservas de las zonas comunes (15/10/2026).
 *
 * El cliente, entrando como guardia: «en Zonas comunes el guardia debería ver
 * las reservas, actualmente le sale para reservar». La pantalla se cambió, y
 * entonces se vio que la lista salía vacía siempre: la base no dejaba a la
 * portería leer ninguna reserva —aunque sí escribirlas: es personal del
 * edificio y registra usos por una vivienda—. Aquí se comprueba que ahora la
 * ve, ve quién la pidió y marca quién llegó, y que otro edificio no la ve.
 */

const PISCINA = "55555555-5555-5555-5555-555555555551";
const U102 = "44444444-4444-4444-4444-444444444443";
const VECINA = "vecino@veciyo.test"; // Sofía, 102
const GUARDIA = "guardia@veciyo.test"; // Juan, portería del mismo edificio
const AJENO = "vecino2@veciyo.test"; // Bruno, otro edificio
const MARCA = "[prueba] la porteria ve las reservas";

let reservaId = "";
let participanteId = "";

beforeAll(async () => {
  await entrarComo(VECINA);
  reservaId = (
    await crearReserva({
      zonaId: PISCINA,
      unidadId: U102,
      fecha: enDias(3),
      horaInicio: "16:00",
      horaFin: "17:00",
      comentarios: MARCA,
      participantes: [{ nombre: "Invitada de Sofía" }],
    })
  ).id;
  await salir();
  const { data } = await servicio
    .from("participante_reserva")
    .select("id")
    .eq("reserva_id", reservaId)
    .limit(1)
    .single();
  participanteId = data!.id;
});

afterAll(async () => {
  await servicio.from("participante_reserva").delete().eq("reserva_id", reservaId);
  await servicio.from("reserva_zona").delete().eq("id", reservaId);
  await salir();
});

describe("la portería del edificio", () => {
  it("ve la reserva", async () => {
    await entrarComo(GUARDIA);
    const { data } = await supabase.from("reserva_zona").select("id").eq("id", reservaId);
    await salir();
    expect(data).toEqual([{ id: reservaId }]);
  });

  it("y quién la pidió", async () => {
    await entrarComo(GUARDIA);
    const { data } = await supabase.rpc("solicitantes_de_reservas", { p_reservas: [reservaId] });
    await salir();
    expect((data as unknown[]).length).toBe(1);
  });

  it("marca que la invitada llegó", async () => {
    await entrarComo(GUARDIA);
    await actualizarParticipante(participanteId, { llego: true });
    await salir();
    const { data } = await servicio
      .from("participante_reserva")
      .select("asistencia")
      .eq("id", participanteId)
      .single();
    expect(data!.asistencia).not.toBeNull();
    expect(data!.asistencia).not.toBe("pendiente");
  });
});

describe("la portería no reserva por nadie (15/10/2026)", () => {
  it("no crea una reserva para una vivienda", async () => {
    await entrarComo(GUARDIA);
    await expect(
      crearReserva({
        zonaId: PISCINA,
        unidadId: U102,
        fecha: enDias(4),
        horaInicio: "18:00",
        horaFin: "19:00",
        comentarios: `${MARCA} por la porteria`,
      }),
    ).rejects.toThrow(/row-level security/);
    await salir();
  });

  it("ni cancela la de un vecino", async () => {
    await entrarComo(GUARDIA);
    await cancelarReserva(reservaId).catch(() => {});
    await salir();
    const { data } = await servicio.from("reserva_zona").select("estado").eq("id", reservaId).single();
    expect(data!.estado).not.toBe("cancelada");
  });

  it("pero sí anota el reemplazo de quien salió", async () => {
    await entrarComo(GUARDIA);
    const { error } = await supabase
      .from("participante_reserva")
      .insert({ reserva_id: reservaId, nombre: "Reemplazo de la invitada", tipo: "visitante" }, { count: "exact" });
    await salir();
    expect(error).toBeNull();
  });

  it("y no borra asistentes", async () => {
    await entrarComo(GUARDIA);
    await supabase.from("participante_reserva").delete().eq("id", participanteId);
    await salir();
    const { data } = await servicio.from("participante_reserva").select("id").eq("id", participanteId);
    expect(data).toHaveLength(1);
  });
});

describe("alguien de otro edificio", () => {
  it("no ve la reserva", async () => {
    await entrarComo(AJENO);
    const { data } = await supabase.from("reserva_zona").select("id").eq("id", reservaId);
    await salir();
    expect(data).toEqual([]);
  });
});
