import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  enDias,
  entrarComo,
  isoEnDias,
  retirarEstancia,
  salir,
  servicio,
  supabase,
  ventanaDe,
} from "./cliente";
import {
  agregarVehiculoDeEstancia,
  crearVisita,
  eliminarVisita,
} from "@/features/visitas/services/visitas.repo";

/** Sus fechas, lejos de las de los demas: ver `ventanaDe`. */
const V = ventanaDe("borrar-la-reserva-lo-cierra-todo");

/**
 * Recorrido: borrar o terminar una reserva cierra lo que colgaba de ella, y
 * una estancia no lleva más vehículos que adultos (QA 23/10/2026).
 *
 * - El enlace del acompañante seguía sirviendo después de borrar la reserva.
 * - Tomás seguía entrando a «Mi alojamiento» por estancias borradas.
 * - En el preregistro se podían añadir vehículos sin fin (T-101).
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const ANFITRIONA = "vecino@veciyo.test";
/** Hace de huésped con cuenta: solo hace falta un usuario que exista. */
const CON_CUENTA = "propietario@veciyo.test";

const MARCA = "[prueba] borrar la reserva";

const estancias: string[] = [];
const membresias: string[] = [];
let usuarioId = "";

async function estanciaConHuesped(desde: number, hasta: number, conMenor = false) {
  await entrarComo(ANFITRIONA);
  const visitaId = await crearVisita({
    condominioId: CONDOMINIO,
    unidadId: U102,
    tipo: "huesped_temporal",
    fechaDesde: enDias(V + desde),
    fechaHasta: enDias(V + hasta),
    anotacionesIngreso: MARCA,
    invitados: [
      { nombre: `${MARCA} titular`, documentoNumero: `9300${desde}1`, tipoDocumento: "cedula_ciudadania" },
      ...(conMenor
        ? [{ nombre: `${MARCA} menor`, documentoNumero: `9300${desde}2`, tipoDocumento: "registro_civil" as const, esMenor: true }]
        : []),
    ],
  });
  estancias.push(visitaId);
  await salir();

  const { data: titular } = await servicio
    .from("invitado")
    .select("id")
    .eq("visita_id", visitaId)
    .ilike("nombre", "%titular")
    .single();
  await servicio.from("invitado").update({ usuario_id: usuarioId }).eq("id", titular!.id);
  const { data: m, error } = await servicio
    .from("membresia_unidad")
    .insert({
      unidad_id: U102,
      usuario_id: usuarioId,
      rol: "huesped_temporal",
      nombre: MARCA,
      activo: true,
      vigente_desde: isoEnDias(V + desde),
      vigente_hasta: isoEnDias(V + hasta),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  membresias.push(m!.id);

  // Un enlace vivo, como el que deja «Enviar preregistro».
  await servicio
    .from("visita")
    .update({ precheckin_expira_en: new Date(Date.now() + 3 * 86_400_000).toISOString() })
    .eq("id", visitaId);
  return { visitaId, membresiaId: m!.id as string, titularId: titular!.id as string };
}

beforeAll(async () => {
  usuarioId = await entrarComo(CON_CUENTA);
  await salir();
  // Lo que haya dejado una corrida anterior que murió a medias.
  await servicio.from("membresia_unidad").delete().eq("nombre", MARCA);
});

afterAll(async () => {
  await servicio.from("membresia_unidad").delete().in("id", membresias);
  await servicio.from("membresia_unidad").delete().eq("nombre", MARCA);
  for (const id of estancias) {
    const { error } = await retirarEstancia(id);
    if (error) throw new Error(`No se pudo retirar la estancia ${id}: ${error.message}`);
  }
});

describe("borrar la reserva", () => {
  it("vence su enlace de preregistro y apaga el acceso del huésped", async () => {
    const { visitaId, membresiaId } = await estanciaConHuesped(2, 4);

    // Control: antes de borrar, el enlace vive y el acceso está encendido.
    const { data: antes } = await servicio
      .from("visita")
      .select("precheckin_expira_en")
      .eq("id", visitaId)
      .single();
    expect(new Date(antes!.precheckin_expira_en!).getTime()).toBeGreaterThan(Date.now());

    await entrarComo(ANFITRIONA);
    await eliminarVisita(visitaId);
    await salir();

    const { data: despues } = await servicio
      .from("visita")
      .select("precheckin_expira_en")
      .eq("id", visitaId)
      .single();
    expect(new Date(despues!.precheckin_expira_en!).getTime()).toBeLessThanOrEqual(Date.now());

    const { data: m } = await servicio
      .from("membresia_unidad")
      .select("activo")
      .eq("id", membresiaId)
      .single();
    expect(m!.activo).toBe(false);
  });

  it("cancelarla hace lo mismo", async () => {
    const { visitaId, membresiaId } = await estanciaConHuesped(6, 8);
    const { error } = await servicio.from("visita").update({ estado: "cancelada" }).eq("id", visitaId);
    expect(error).toBeNull();

    const { data: m } = await servicio
      .from("membresia_unidad")
      .select("activo")
      .eq("id", membresiaId)
      .single();
    expect(m!.activo).toBe(false);
  });

  it("terminarla antes de su fecha acorta el acceso (y si no había empezado, lo apaga)", async () => {
    const { visitaId, membresiaId } = await estanciaConHuesped(10, 14);
    const { data: antes } = await servicio
      .from("membresia_unidad")
      .select("vigente_hasta, activo")
      .eq("id", membresiaId)
      .single();
    expect(antes!.vigente_hasta).toBe(isoEnDias(V + 14));
    expect(antes!.activo).toBe(true);

    // El error se mira: la primera versión de la regla hacía fallar el cambio
    // de estado entero, y un `update` sin mirar el error lo escondía.
    const { error } = await servicio.from("visita").update({ estado: "finalizada" }).eq("id", visitaId);
    expect(error).toBeNull();

    const { data: m } = await servicio
      .from("membresia_unidad")
      .select("vigente_hasta, activo")
      .eq("id", membresiaId)
      .single();
    expect(m!.vigente_hasta! < isoEnDias(V + 14)).toBe(true);
    // Esta estancia aún no había empezado: no queda acceso que dejarle.
    expect(m!.activo).toBe(false);
  });
});

describe("los vehículos de la estancia", () => {
  it("no pasan de uno por adulto; añadiendo a otro adulto, cabe otro", async () => {
    const { visitaId, titularId } = await estanciaConHuesped(16, 18, true);

    await entrarComo(ANFITRIONA);
    // Un adulto (y un menor, que no cuenta): el primero entra.
    await agregarVehiculoDeEstancia({ visitaUuid: visitaId, placa: "PRB101", responsableUuid: titularId });
    await expect(
      agregarVehiculoDeEstancia({ visitaUuid: visitaId, placa: "PRB102", responsableUuid: titularId }),
    ).rejects.toThrow(/un vehículo por cada adulto/i);
    await salir();

    // Control positivo: con otro adulto en la reserva, el segundo sí entra.
    await servicio.from("invitado").insert({
      visita_id: visitaId,
      nombre: `${MARCA} adulto dos`,
      documento_numero: "93001699",
      tipo_documento: "cedula_ciudadania",
      orden: 3,
    });
    await entrarComo(ANFITRIONA);
    await agregarVehiculoDeEstancia({ visitaUuid: visitaId, placa: "PRB102", responsableUuid: titularId });
    await salir();

    const { count } = await supabase
      .from("vehiculo_visita")
      .select("id", { count: "exact", head: true })
      .eq("visita_id", visitaId);
    // Leído con la sesión cerrada: RLS no deja ver nada, así que se cuenta con servicio.
    expect(count ?? 0).toBe(0);
    const { count: reales } = await servicio
      .from("vehiculo_visita")
      .select("id", { count: "exact", head: true })
      .eq("visita_id", visitaId);
    expect(reales).toBe(2);
  });
});
