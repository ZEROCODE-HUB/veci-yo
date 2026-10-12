import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { enDias, entrarComo, salir, servicio, supabase } from "./cliente";
import {
  crearVisita,
  marcarLlegadaInvitado,
  registrarHoraInvitado,
} from "@/features/visitas/services/visitas.repo";

/**
 * Recorrido: una visita corriente, de la vecina que la anuncia a la portería
 * que la recibe y la despide.
 *
 * Sale de recorrerla en el navegador el 12/10/2026. Tres cosas que la base
 * dejaba pasar:
 *
 *   · una visita en la que alguien no llega nunca se quedaba «ingresada» para
 *     siempre, aunque los demás ya hubieran salido: la portería la seguía
 *     viendo dentro y su estacionamiento no se soltaba;
 *   · se podía quitar la entrada de alguien y dejarle la salida puesta;
 *   · una vecina podía anunciar una visita para un día que ya pasó.
 *
 * Las visitas van **sin fecha**: cuentan desde el día en que se anotan, con el
 * reloj del edificio, así que la portería las ve hoy sin que la prueba tenga
 * que adivinar qué día es allí.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U205 = "44444444-4444-4444-4444-444444444442";
const GUARDIA = "guardia@veciyo.test";
const DUENO_205 = "propietario@veciyo.test";

const MARCA = "[prueba] visitas dicen lo que paso";

const creadas: string[] = [];
let visitaId = "";
let llega = "";
let noLlega = "";

async function estadoDe(id: string) {
  const { data, error } = await servicio
    .from("visita")
    .select("estado, salida_en")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

beforeAll(async () => {
  const { data: unidad } = await servicio
    .from("unidad")
    .select("id")
    .eq("id", U205)
    .maybeSingle();
  if (!unidad) throw new Error("La 205 no existe: el recorrido no tiene dónde.");

  await entrarComo(DUENO_205);
  visitaId = await crearVisita({
    condominioId: CONDOMINIO,
    unidadId: U205,
    tipo: "amigos",
    anotacionesIngreso: MARCA,
    invitados: [
      { nombre: `${MARCA} llega` },
      { nombre: `${MARCA} no llega` },
    ],
  });
  creadas.push(visitaId);

  const { data } = await servicio
    .from("invitado")
    .select("id, orden")
    .eq("visita_id", visitaId)
    .order("orden");
  llega = data![0].id;
  noLlega = data![1].id;

  await salir();
  await entrarComo(GUARDIA);
});

afterAll(async () => {
  await salir();
  for (const id of creadas) {
    const { error } = await servicio.from("visita").delete().eq("id", id);
    if (error) throw new Error(`No se pudo retirar la visita: ${error.message}`);
  }
});

describe("la portería recibe y despide a una visita", () => {
  it("al entrar el primero, la visita está ingresada", async () => {
    await marcarLlegadaInvitado(llega, true);
    expect((await estadoDe(visitaId)).estado).toBe("ingresada");
  });

  it("quitar la entrada quita también la salida", async () => {
    await registrarHoraInvitado(llega, "salida", "23:59");
    await marcarLlegadaInvitado(llega, false);

    const { data } = await servicio
      .from("invitado")
      .select("llego, ingreso_en, salida_en")
      .eq("id", llega)
      .single();
    expect(data!.llego).toBe(false);
    // Nadie sale de donde no entró.
    expect(data!.salida_en).toBeNull();
    expect((await estadoDe(visitaId)).estado).toBe("programada");
  });

  it("y por la base tampoco se le deja una salida a quien no entró", async () => {
    // Directo a la tabla: el repositorio ya la limpia, y aquí se mira la regla.
    const { error } = await supabase
      .from("invitado")
      .update({ salida_en: new Date().toISOString() })
      .eq("id", noLlega);
    expect(error).toBeNull();

    const { data } = await servicio
      .from("invitado")
      .select("salida_en")
      .eq("id", noLlega)
      .single();
    expect(data!.salida_en).toBeNull();
  });

  it("termina cuando sale quien entró, aunque el otro no llegara", async () => {
    await marcarLlegadaInvitado(llega, true);
    // El control: con alguien dentro no ha terminado.
    expect((await estadoDe(visitaId)).estado).toBe("ingresada");

    await registrarHoraInvitado(llega, "salida", "23:59");

    const visita = await estadoDe(visitaId);
    expect(visita.estado).toBe("finalizada");
    expect(visita.salida_en).not.toBeNull();
  });

  it("y si el otro llega después, vuelve a estar dentro", async () => {
    await marcarLlegadaInvitado(noLlega, true);
    expect((await estadoDe(visitaId)).estado).toBe("ingresada");
  });
});

describe("una vecina anuncia a quien va a venir", () => {
  it("no para un día que ya pasó", async () => {
    await salir();
    await entrarComo(DUENO_205);

    await expect(
      crearVisita({
        condominioId: CONDOMINIO,
        unidadId: U205,
        tipo: "amigos",
        fechaDesde: enDias(-3),
        fechaHasta: enDias(-3),
        anotacionesIngreso: MARCA,
        invitados: [{ nombre: `${MARCA} ayer` }],
      }),
    ).rejects.toThrow(/ya pasó/i);
  });

  it("sí para mañana", async () => {
    const id = await crearVisita({
      condominioId: CONDOMINIO,
      unidadId: U205,
      tipo: "amigos",
      fechaDesde: enDias(1),
      fechaHasta: enDias(1),
      anotacionesIngreso: MARCA,
      invitados: [{ nombre: `${MARCA} mañana` }],
    });
    creadas.push(id);
    expect(id).toBeTruthy();
  });

  it("la portería sí anota una de ayer: es su trabajo", async () => {
    await salir();
    await entrarComo(GUARDIA);

    const { data, error } = await supabase
      .from("visita")
      .insert({
        condominio_id: CONDOMINIO,
        unidad_id: U205,
        tipo: "amigos",
        fecha_desde: (() => {
          const d = new Date();
          d.setDate(d.getDate() - 3);
          return d.toISOString().slice(0, 10);
        })(),
        anotaciones_ingreso: MARCA,
      })
      .select("id")
      .single();
    expect(error).toBeNull();
    if (data) creadas.push(data.id);
  });
});
