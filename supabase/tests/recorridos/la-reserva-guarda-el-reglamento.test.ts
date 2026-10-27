import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio, supabase } from "./cliente";
import { crearReserva } from "@/features/zonas/services/zonas.repo";

/**
 * Recorrido: la reserva guarda el reglamento que se aceptó (27/10/2026,
 * hueco 41).
 *
 * Lo copia la base al reservar --`reserva_guarda_el_reglamento`--, con la hora
 * del servidor, y después no lo cambia nadie. Cada caso negativo lleva su
 * control al lado.
 */

const U102 = "44444444-4444-4444-4444-444444444443";
const VECINA = "vecino@veciyo.test";
const MARCA = "[prueba] reglamento aceptado";

let zonaId = "";
let reglamento = "";
const creadas: string[] = [];

function dia(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return [
    String(d.getDate()).padStart(2, "0"),
    String(d.getMonth() + 1).padStart(2, "0"),
    d.getFullYear(),
  ].join("/");
}

async function reservar(acepta: boolean, hora: string): Promise<string> {
  await entrarComo(VECINA);
  const { id } = await crearReserva({
    zonaId,
    unidadId: U102,
    fecha: dia(9),
    horaInicio: hora,
    horaFin: `${String(Number(hora.slice(0, 2)) + 1).padStart(2, "0")}:00`,
    comentarios: MARCA,
    aceptaReglamento: acepta,
  });
  await salir();
  creadas.push(id);
  return id;
}

async function fila(id: string) {
  const { data } = await servicio
    .from("reserva_zona")
    .select("reglamento_aceptado_en, reglamento_aceptado")
    .eq("id", id)
    .single();
  return data!;
}

beforeAll(async () => {
  await servicio.from("reserva_zona").delete().eq("comentarios", MARCA);
  // Una zona con reglamento escrito: sin texto, «se copió» no se distingue de «no».
  const { data } = await servicio
    .from("zona_comun")
    .select("id, reglamento")
    .eq("activa", true)
    .not("reglamento", "is", null)
    .order("nombre")
    .limit(1)
    .single();
  zonaId = data!.id;
  reglamento = String(data!.reglamento).trim();
  expect(reglamento.length).toBeGreaterThan(0);
});

afterAll(async () => {
  await salir();
  for (const id of creadas) {
    const { error } = await servicio.from("reserva_zona").delete().eq("id", id);
    if (error) throw new Error(`No se pudo borrar la reserva ${id}: ${error.message}`);
  }
});

describe("el reglamento que se aceptó", () => {
  it("queda copiado en la reserva, con la hora del servidor", async () => {
    const antes = Date.now();
    const id = await reservar(true, "16:00");
    const f = await fila(id);
    expect(f.reglamento_aceptado).toBe(reglamento);
    expect(new Date(f.reglamento_aceptado_en!).getTime()).toBeGreaterThan(antes - 60_000);
  });

  it("control: sin aceptarlo no queda nada", async () => {
    const id = await reservar(false, "17:00");
    const f = await fila(id);
    expect(f.reglamento_aceptado_en).toBeNull();
    expect(f.reglamento_aceptado).toBeNull();
  });

  it("quien reservó no puede cambiar lo que aceptó", async () => {
    const id = creadas[0];
    await entrarComo(VECINA);
    const { error } = await supabase
      .from("reserva_zona")
      .update({ reglamento_aceptado: "[prueba] otro texto" })
      .eq("id", id);
    await salir();
    expect(error?.message ?? "").toMatch(/constancia/);
    expect((await fila(id)).reglamento_aceptado).toBe(reglamento);
  });

  it("control: los comentarios de la misma reserva sí se cambian", async () => {
    const id = creadas[0];
    await entrarComo(VECINA);
    const { error } = await supabase
      .from("reserva_zona")
      .update({ comentarios: MARCA })
      .eq("id", id);
    await salir();
    expect(error).toBeNull();
  });
});
