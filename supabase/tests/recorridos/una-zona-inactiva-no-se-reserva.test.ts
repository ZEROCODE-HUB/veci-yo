import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio } from "./cliente";
import {
  crearReserva,
  guardarZonaEntera,
} from "@/features/zonas/services/zonas.repo";

/**
 * Una zona apagada no se reserva (17/10/2026).
 *
 * `zona_comun.activa` se guardaba y solo pintaba la etiqueta «Inactiva»: una
 * zona apagada se podía reservar igual. Ahora lo cierra el disparador
 * `reservar_solo_zonas_activas`.
 *
 * La zona es de este recorrido, con todos los días abiertos y cinco cupos,
 * para que el único motivo de rechazo posible sea el que se comprueba.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const ADMIN = "admin@veciyo.test";
const VECINA = "vecino@veciyo.test";
const MARCA = "[prueba] zona apagada";

let zonaId = "";

/** Lejos de hoy, para que una hora de desfase no la mueva de día. */
function fecha(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  // Como la pantalla: dd/MM/yyyy, que es lo que recibe `crearReserva`.
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

const reservar = (dia: number) =>
  crearReserva({
    zonaId,
    unidadId: U102,
    fecha: fecha(dia),
    horaInicio: "10:00",
    horaFin: "11:00",
    comentarios: MARCA,
  });

const encender = async (activa: boolean) => {
  const { error } = await servicio.from("zona_comun").update({ activa }).eq("id", zonaId);
  if (error) throw new Error(error.message);
};

beforeAll(async () => {
  await servicio.from("zona_comun").delete().eq("nombre", MARCA);
  await entrarComo(ADMIN);
  zonaId = await guardarZonaEntera({
    zona: {
      condominioId: CONDOMINIO,
      nombre: MARCA,
      tipo: "recreacion",
      horarioApertura: "08:00",
      horarioCierre: "22:00",
      diasHabilitados: [0, 1, 2, 3, 4, 5, 6],
      duracionMinimaMin: 30,
      duracionMaximaMin: 240,
      tiempoMinimoEntreReservas: 0,
      cuposSimultaneos: 5,
      activa: false,
      permiteCorta: true,
      permiteLarga: true,
    },
    fechas: [],
  });
  await salir();
  await entrarComo(VECINA);
});

afterAll(async () => {
  await salir();
  if (!zonaId) return;
  const { error: e1 } = await servicio.from("reserva_zona").delete().eq("zona_id", zonaId);
  expect(e1).toBeNull();
  const { error: e2 } = await servicio.from("zona_comun").delete().eq("id", zonaId);
  expect(e2).toBeNull();
});

describe("una zona apagada", () => {
  it("no se puede reservar", async () => {
    await encender(false);
    await expect(reservar(40)).rejects.toThrow(/no está disponible para reservas/i);
  });

  it("encendida, la misma reserva pasa", async () => {
    // Control positivo: sin él, una zona que no dejara reservar nunca pasaría.
    await encender(true);
    await expect(reservar(41)).resolves.toBeTruthy();
  });

  it("y lo ya reservado se puede cancelar aunque se apague después", async () => {
    await encender(false);
    const { data } = await servicio
      .from("reserva_zona")
      .select("id")
      .eq("zona_id", zonaId)
      .limit(1)
      .single();
    const { error } = await servicio
      .from("reserva_zona")
      .update({ estado: "cancelada" })
      .eq("id", data!.id);
    expect(error).toBeNull();
  });
});
