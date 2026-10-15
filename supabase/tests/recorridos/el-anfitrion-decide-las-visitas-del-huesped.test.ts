import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { enDias, entrarComo, salir, servicio } from "./cliente";
import { crearVisita } from "@/features/visitas/services/visitas.repo";
import { huespedPuedeRegistrarVisitas } from "@/features/visitas/services/visitasDelHuesped.repo";
import { cambiarPermisoDeVisitas } from "@/features/propietario/services/residentes.repo";

/**
 * Recorrido: el anfitrión decide si su huésped registra visitas (15/10/2026).
 *
 * «¿Permites que tus huéspedes registren visitas?» se guardaba y no cambiaba
 * nada: el huésped registraba siempre. Ahora «prohibir a todos» lo impide en
 * la base, y la pantalla lo pregunta para no ofrecer el botón.
 */
const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const HUESPED = "nuevo.inquilino@veciyo.test"; // Tomás, alojado en la 102
const ANFITRIONA = "vecino@veciyo.test"; // Sofía, dueña de la 102
const MARCA = "[prueba] anfitrion decide visitas";

let antes: string | null = null;
let membresiaHuesped = "";
const visitas: string[] = [];

async function ponerOpcion(valor: string | null) {
  const { error } = await servicio
    .from("suscripcion_renta_corta")
    .update({ visitas_de_huespedes: valor })
    .eq("unidad_id", U102);
  if (error) throw error;
}

function registrar() {
  return crearVisita({
    condominioId: CONDOMINIO,
    unidadId: U102,
    tipo: "amigos",
    fechaDesde: enDias(0),
    fechaHasta: enDias(0),
    anotacionesIngreso: MARCA,
    invitados: [{ nombre: `${MARCA} amiga` }],
  });
}

beforeAll(async () => {
  const { data, error } = await servicio
    .from("suscripcion_renta_corta")
    .select("visitas_de_huespedes")
    .eq("unidad_id", U102)
    .single();
  if (error) throw error;
  antes = data.visitas_de_huespedes;
  const huespedId = await entrarComo(HUESPED);
  await salir();
  membresiaHuesped = (
    await servicio
      .from("membresia_unidad")
      .select("id")
      .eq("unidad_id", U102)
      .eq("usuario_id", huespedId)
      .eq("rol", "huesped_temporal")
      .limit(1)
      .single()
  ).data!.id;
});

afterAll(async () => {
  await salir();
  await ponerOpcion(antes);
  await servicio.from("membresia_unidad").update({ puede_registrar_visitas: false }).eq("id", membresiaHuesped);
  if (visitas.length) {
    await servicio.from("invitado").delete().in("visita_id", visitas);
    const { error } = await servicio.from("visita").delete().in("id", visitas);
    if (error) throw error;
  }
});

describe("con «prohibir a todos»", () => {
  it("el huésped no registra visitas", async () => {
    await ponerOpcion("prohibir_todos");
    await entrarComo(HUESPED);
    expect(await huespedPuedeRegistrarVisitas(U102)).toBe(false);
    await expect(registrar()).rejects.toThrow(/row-level security/);
    await salir();
  });
});

describe("con «permitir a todos»", () => {
  it("sí las registra", async () => {
    await ponerOpcion("permitir_todos");
    await entrarComo(HUESPED);
    expect(await huespedPuedeRegistrarVisitas(U102)).toBe(true);
    visitas.push(await registrar());
    await salir();
    expect(visitas[0]).toBeTruthy();
  });
});

describe("con «aprobar huésped por huésped»", () => {
  it("el huésped no registra visitas mientras su anfitriona no lo habilite", async () => {
    await ponerOpcion("aprobar_cada_uno");
    await servicio.from("membresia_unidad").update({ puede_registrar_visitas: false }).eq("id", membresiaHuesped);
    await entrarComo(HUESPED);
    expect(await huespedPuedeRegistrarVisitas(U102)).toBe(false);
    await expect(registrar()).rejects.toThrow(/row-level security/);
    await salir();
  });

  it("y no se habilita a sí mismo", async () => {
    await entrarComo(HUESPED);
    await expect(cambiarPermisoDeVisitas(membresiaHuesped, true)).rejects.toThrow(
      /No puedes cambiar tu propio rol/,
    );
    await salir();
  });

  it("cuando la anfitriona lo habilita, sí", async () => {
    await entrarComo(ANFITRIONA);
    await cambiarPermisoDeVisitas(membresiaHuesped, true);
    await salir();
    await entrarComo(HUESPED);
    expect(await huespedPuedeRegistrarVisitas(U102)).toBe(true);
    visitas.push(await registrar());
    await salir();
  });
});
