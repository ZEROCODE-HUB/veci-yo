import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  enDias,
  entrarComo,
  retirarEstancia,
  salir,
  servicio,
  supabase,
  ventanaDe,
} from "./cliente";
import { crearVisita } from "@/features/visitas/services/visitas.repo";
import { crearReserva, nombresDeMiEstancia } from "@/features/zonas/services/zonas.repo";

/** Sus fechas, lejos de las de los demas: ver `ventanaDe`. */
const V = ventanaDe("el-huesped-no-mete-gente-de-fuera");

/**
 * Recorrido: un huésped no mete gente de fuera en una zona común (27/10/2026,
 * hueco 42).
 *
 * Tomás se aloja en la 102 con un acompañante que pasó por el preregistro.
 * Al reservar una zona puede apuntar a ese acompañante, y a nadie más. La
 * vecina de la 102, que vive ahí, sigue escribiendo a quien quiera: es el
 * control que dice que la regla no cerró la tabla entera.
 */

const U102 = "44444444-4444-4444-4444-444444444443";
const HUESPED = "nuevo.inquilino@veciyo.test";
const VECINA = "vecino@veciyo.test";
/** Marcela administra el edificio y no vive en la 102. */
const ADMINISTRACION = "admin@veciyo.test";
const MARCA = "[prueba] gente de fuera";
const ACOMPANANTE = "[prueba] Acompañante De Tomás";

let zonaId = "";
let estancia = "";
const reservas: string[] = [];

function dia(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return [
    String(d.getDate()).padStart(2, "0"),
    String(d.getMonth() + 1).padStart(2, "0"),
    d.getFullYear(),
  ].join("/");
}

async function reservar(hora: string, participantes: { nombre: string; tipo?: string }[]) {
  const { id } = await crearReserva({
    zonaId,
    unidadId: U102,
    fecha: dia(5),
    horaInicio: hora,
    horaFin: `${String(Number(hora.slice(0, 2)) + 1).padStart(2, "0")}:00`,
    comentarios: MARCA,
    participantes,
  });
  reservas.push(id);
  return id;
}

/** Las reservas de esta prueba que siguen en pie: una rechazada no debe quedar. */
async function vivas(): Promise<number> {
  const { data } = await servicio
    .from("reserva_zona")
    .select("id")
    .eq("comentarios", MARCA)
    .neq("estado", "cancelada");
  return data?.length ?? 0;
}

beforeAll(async () => {
  await servicio.from("reserva_zona").delete().eq("comentarios", MARCA);
  const { data: viejas } = await servicio.from("visita").select("id").eq("anotaciones_ingreso", MARCA);
  for (const v of viejas ?? []) await retirarEstancia(v.id);

  // La zona de más puestos: el aforo no es el asunto.
  const { data: zona } = await servicio
    .from("zona_comun")
    .select("id, cupos_simultaneos")
    .eq("activa", true)
    .eq("permite_estancia_corta", true)
    .order("cupos_simultaneos", { ascending: false })
    .limit(1)
    .single();
  zonaId = zona!.id;

  // La estancia de Tomás, como la deja el preregistro: él y su acompañante.
  const tomas = await entrarComo(HUESPED);
  await salir();
  await entrarComo(VECINA);
  estancia = await crearVisita({
    condominioId: "11111111-1111-1111-1111-111111111111",
    unidadId: U102,
    tipo: "huesped_temporal",
    fechaDesde: enDias(V + 1),
    fechaHasta: enDias(V + 4),
    anotacionesIngreso: MARCA,
    invitados: [
      { nombre: "Tomás Huésped", documentoNumero: "93009993", tipoDocumento: "cedula_ciudadania" },
      { nombre: ACOMPANANTE, documentoNumero: "93009994", tipoDocumento: "cedula_ciudadania" },
    ],
  });
  await salir();
  const { error } = await servicio
    .from("invitado")
    .update({ usuario_id: tomas })
    .eq("visita_id", estancia)
    .eq("es_titular", true);
  if (error) throw error;
});

afterAll(async () => {
  await salir();
  for (const id of reservas) await servicio.from("reserva_zona").delete().eq("id", id);
  await servicio.from("reserva_zona").delete().eq("comentarios", MARCA);
  if (estancia) {
    const { error } = await retirarEstancia(estancia);
    if (error) throw new Error(`No se pudo retirar la estancia: ${error.message}`);
  }
});

describe("a quién puede apuntar un huésped en una zona", () => {
  it("la lista que le ofrece la pantalla es la gente de su estancia", async () => {
    await entrarComo(HUESPED);
    const nombres = await nombresDeMiEstancia(U102);
    await salir();
    expect(nombres).toContain(ACOMPANANTE);
    expect(nombres).toContain("Tomás Huésped");
  });

  it("apunta a su acompañante, de una sola llamada", async () => {
    await entrarComo(HUESPED);
    const id = await reservar("09:00", [{ nombre: ACOMPANANTE, tipo: "Huésped Temporal" }]);
    await salir();
    const { data } = await servicio.from("participante_reserva").select("nombre").eq("reserva_id", id);
    expect(data?.map((p) => p.nombre)).toEqual([ACOMPANANTE]);
  });

  it("no apunta a alguien de fuera, y la reserva no queda a medias", async () => {
    const antes = await vivas();
    await entrarComo(HUESPED);
    await expect(
      reservar("11:00", [{ nombre: "[prueba] Alguien De Fuera", tipo: "Huésped Temporal" }]),
    ).rejects.toThrow(/personas de su estancia/);
    await salir();
    expect(await vivas()).toBe(antes);
  });

  it("ni a su acompañante disfrazado de visitante", async () => {
    await entrarComo(HUESPED);
    await expect(
      reservar("13:00", [{ nombre: ACOMPANANTE, tipo: "Visitante" }]),
    ).rejects.toThrow(/personas de su estancia/);
    await salir();
  });

  it("control: la vecina, que vive en la 102, escribe a quien quiera", async () => {
    await entrarComo(VECINA);
    const id = await reservar("15:00", [{ nombre: "[prueba] Invitada De Sofía", tipo: "Visitante" }]);
    await salir();
    const { data } = await servicio.from("participante_reserva").select("nombre").eq("reserva_id", id);
    expect(data).toHaveLength(1);
  });

  it("control: la administración, que reserva para la 102 sin vivir ahí, también", async () => {
    /*
      Separa las dos salidas de la regla: la vecina se libra por vivir en la
      102 y por no ser huésped a la vez, así que sola no dice cuál de las dos
      funciona. Marcela no vive ahí: se libra solo por no ser huésped.
    */
    await entrarComo(ADMINISTRACION);
    const id = await reservar("17:00", [{ nombre: "[prueba] Invitado De La Administración", tipo: "Visitante" }]);
    await salir();
    const { data } = await servicio.from("participante_reserva").select("nombre").eq("reserva_id", id);
    expect(data).toHaveLength(1);
  });
});
