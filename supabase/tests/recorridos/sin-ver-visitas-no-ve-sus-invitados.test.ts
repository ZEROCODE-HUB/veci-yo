import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio, supabase } from "./cliente";

/**
 * Recorrido: sin «ver visitas», tampoco lo que cuelga de ellas (15/10/2026,
 * hueco 34).
 *
 * Con Carla, coadministradora de prueba: se le apaga `visualizarVisitas` y se
 * comprueba que no ve ni la visita ni a sus invitados; con el permiso
 * encendido, sí. La fila de su membresía se guarda cruda y se devuelve.
 */

const U102 = "44444444-4444-4444-4444-444444444443";
const COADMIN = "coadmin@veciyo.test";

let membresiaId = "";
let permisosAntes: Record<string, unknown> = {};
let visitaId = "";
let invitadoId = "";

const ponerPermiso = async (valor: boolean) => {
  const { error } = await servicio
    .from("membresia_condominio")
    .update({ permisos: { ...permisosAntes, visualizarVisitas: valor } })
    .eq("id", membresiaId);
  if (error) throw new Error(error.message);
};

const loQueVe = async () => {
  await entrarComo(COADMIN);
  const { data: visita } = await supabase.from("visita").select("id").eq("id", visitaId);
  const { data: invitado } = await supabase.from("invitado").select("id").eq("id", invitadoId);
  await salir();
  return { visita: visita ?? [], invitado: invitado ?? [] };
};

beforeAll(async () => {
  const carla = await entrarComo(COADMIN);
  await salir();
  const { data: m } = await servicio
    .from("membresia_condominio")
    .select("id, permisos")
    .eq("usuario_id", carla)
    .eq("rol", "coadministrador")
    .single();
  membresiaId = m!.id;
  permisosAntes = (m!.permisos ?? {}) as Record<string, unknown>;

  const { data: visitas } = await servicio.from("visita").select("id").eq("unidad_id", U102);
  const { data: i } = await servicio
    .from("invitado")
    .select("id, visita_id")
    .in("visita_id", (visitas ?? []).map((v) => v.id))
    .limit(1)
    .single();
  invitadoId = i!.id;
  visitaId = i!.visita_id;
});

afterAll(async () => {
  await salir();
  const { error } = await servicio
    .from("membresia_condominio")
    .update({ permisos: permisosAntes })
    .eq("id", membresiaId);
  if (error) throw new Error(error.message);
});

describe("una coadministradora y las visitas de la 102", () => {
  it("con «ver visitas», ve la visita y a sus invitados", async () => {
    // El control: sin él, el caso de abajo pasaría igual si no viera nada nunca.
    await ponerPermiso(true);
    const ve = await loQueVe();
    expect(ve.visita).toHaveLength(1);
    expect(ve.invitado).toHaveLength(1);
  });

  it("sin el permiso, no ve la visita ni a sus invitados", async () => {
    await ponerPermiso(false);
    const ve = await loQueVe();
    expect(ve.visita).toEqual([]);
    expect(ve.invitado).toEqual([]);
  });
});
