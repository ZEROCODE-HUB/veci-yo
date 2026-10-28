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
import { abrirPrecheckin } from "@/features/visitas/services/precheckin.repo";
import {
  estacionamientosDelPrecheckin,
  guardarVehiculo,
} from "../../../../veciyo-web/src/lib/precheckin";

/** Sus fechas, lejos de las de los demas: ver `ventanaDe`. */
const V = ventanaDe("los-estacionamientos-del-alojamiento");

/**
 * Recorrido: los estacionamientos del alojamiento limitan los vehículos del
 * preregistro.
 *
 * Hueco 17, decidido con el cliente el 25/10/2026: el número lo pone el
 * anfitrión en «Huéspedes temporales». Vacío no limita; 0 no admite ninguno;
 * un número es el máximo. Lo hace cumplir `guardar_vehiculo_precheckin`, que
 * es por donde registra el huésped, sin sesión.
 *
 * Tres adultos, para que el tope de un vehículo por adulto
 * (`vehiculos_no_pasan_de_los_adultos`) no tape a este.
 *
 * El número de la 102 se fija aquí y se devuelve como estaba.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const ANFITRIONA = "vecino@veciyo.test";
const MARCA = "[prueba] estacionamientos";

let visitaId = "";
let token = "";
let adultos: string[] = [];
let antes: number | null = null;

async function fijar(cantidad: number | null) {
  const { error } = await servicio
    .from("suscripcion_renta_corta")
    .update({ estacionamientos_huesped: cantidad })
    .eq("unidad_id", U102);
  if (error) throw new Error(`No se pudo fijar el número: ${error.message}`);
}

async function vaciarVehiculos() {
  const { error } = await servicio.from("vehiculo_visita").delete().eq("visita_id", visitaId);
  if (error) throw new Error(`No se pudieron quitar los vehículos: ${error.message}`);
}

const registrar = (placa: string, i: number) =>
  guardarVehiculo(
    token,
    { placa, marca: "Mazda", color: "Gris", responsableId: adultos[i] },
    supabase as never,
  );

beforeAll(async () => {
  const { data, error } = await servicio
    .from("suscripcion_renta_corta")
    .select("estacionamientos_huesped")
    .eq("unidad_id", U102)
    .single();
  if (error) throw new Error(`No se pudo leer la 102: ${error.message}`);
  antes = data.estacionamientos_huesped;
  await fijar(2);

  await entrarComo(ANFITRIONA);
  visitaId = await crearVisita({
    condominioId: CONDOMINIO,
    unidadId: U102,
    tipo: "huesped_temporal",
    fechaDesde: enDias(V + 3),
    fechaHasta: enDias(V + 6),
    anotacionesIngreso: MARCA,
    invitados: [
      { nombre: `${MARCA} titular` },
      { nombre: `${MARCA} segunda` },
      { nombre: `${MARCA} tercera` },
    ],
  });
  const { enlace } = await abrirPrecheckin(visitaId);
  token = enlace.split("/access/")[1];
  await salir();

  const { data: invitados, error: errorInvitados } = await servicio
    .from("invitado")
    .select("id")
    .eq("visita_id", visitaId);
  if (errorInvitados) throw new Error(errorInvitados.message);
  adultos = (invitados ?? []).map((i: { id: string }) => i.id);
  expect(adultos).toHaveLength(3);
});

afterAll(async () => {
  await fijar(antes);
  if (visitaId) {
    const { error } = await retirarEstancia(visitaId);
    if (error) throw new Error(`No se pudo retirar la estancia: ${error.message}`);
  }
});

describe("con el enlace del preregistro", () => {
  it("el huésped lee los estacionamientos que fijó su anfitrión", async () => {
    // Sin sesión, como el huésped de verdad.
    expect(await estacionamientosDelPrecheckin(token, supabase as never)).toBe(2);
  });

  it("con un enlace que no vale no se lee nada", async () => {
    expect(await estacionamientosDelPrecheckin("no-es-un-enlace", supabase as never)).toBeNull();
  });
});

describe("los vehículos que registra el huésped", () => {
  it("con 2 estacionamientos caben dos y el tercero se rechaza", async () => {
    await vaciarVehiculos();
    await registrar("PRB001", 0);
    await registrar("PRB002", 1);
    await expect(registrar("PRB003", 2)).rejects.toThrow(/no caben más vehículos/);
  });

  it("vacío no limita", async () => {
    await fijar(null);
    await expect(registrar("PRB003", 2)).resolves.toBeTruthy();
    expect(await estacionamientosDelPrecheckin(token, supabase as never)).toBeNull();
  });

  it("con 0 no se registra ninguno", async () => {
    await fijar(0);
    await vaciarVehiculos();
    await expect(registrar("PRB004", 0)).rejects.toThrow(/no tiene estacionamiento para huéspedes/);
  });
});

describe("marca y color (Para Claude 116)", () => {
  it("sin marca o sin color no se apunta, y con las dos sí", async () => {
    await fijar(null);
    await vaciarVehiculos();
    await expect(
      guardarVehiculo(token, { placa: "PRB005", color: "Gris", responsableId: adultos[0] }, supabase as never),
    ).rejects.toThrow(/marca y el color/);
    await expect(
      guardarVehiculo(token, { placa: "PRB005", marca: "Mazda", responsableId: adultos[0] }, supabase as never),
    ).rejects.toThrow(/marca y el color/);
    await expect(registrar("PRB005", 0)).resolves.toBeTruthy();
  });
});

describe("si el anfitrión baja los estacionamientos después (Para Claude 117)", () => {
  /*
    El huésped apunta su vehículo, el anfitrión pone 0 y el huésped envía.
    Se cierra escribiendo la marca de cierre con la clave de servicio: el
    disparador corre igual, y así el caso no depende de tener la ficha entera
    completa, que es asunto de otro archivo.
  */
  const cerrar = () =>
    servicio
      .from("visita")
      .update({ precheckin_completado_en: new Date().toISOString() })
      .eq("id", visitaId);
  const reabrir = () =>
    servicio.from("visita").update({ precheckin_completado_en: null }).eq("id", visitaId);

  it("con el vehículo dentro y 0 estacionamientos no se cierra", async () => {
    await fijar(null);
    await vaciarVehiculos();
    await registrar("PRB006", 0);
    await fijar(0);

    const { error } = await cerrar();
    expect(error?.message).toMatch(/Quita el vehículo de la lista/);
  });

  it("con 1 estacionamiento y 2 vehículos tampoco", async () => {
    await fijar(null);
    await registrar("PRB007", 1);
    await fijar(1);

    const { error } = await cerrar();
    expect(error?.message).toMatch(/1 estacionamiento .* hay 2 vehículos/);
  });

  it("y con los que caben sí se cierra", async () => {
    // El positivo: sin él, un disparador que rechazara siempre pasaría.
    await fijar(2);
    const { error } = await cerrar();
    expect(error).toBeNull();
    const { error: errorReabrir } = await reabrir();
    expect(errorReabrir).toBeNull();
  });
});
