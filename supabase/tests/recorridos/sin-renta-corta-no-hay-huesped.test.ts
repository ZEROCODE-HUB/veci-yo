import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { enDias, entrarComo, salir, servicio, ventanaDe } from "./cliente";
import { crearVisita } from "@/features/visitas/services/visitas.repo";
import {
  activarSuscripcion,
  cancelarSuscripcion,
} from "@/features/propietario/services/suscripcion.repo";

/**
 * Recorrido: sin la renta corta activa no se registra un huesped temporal.
 *
 * La regla vivia en la pantalla --que no ofrecia el formulario-- y la estancia
 * se crea por la API. Desde el 09/10/2026 la sujeta la base, y activar o dar
 * de baja el servicio tambien lo decide ella.
 *
 * En la 101, que **no tiene** renta corta: es la unica forma de probar la
 * mitad que importa sin tocar el servicio de la 102 o la 205, que usan otros
 * veinte archivos. Lo que este recorrido crea ahi, se lo lleva.
 */

const V = ventanaDe("sin-renta-corta-no-hay-huesped");

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U101 = "44444444-4444-4444-4444-444444444441";
const DUENO = "propietario@veciyo.test";
const VECINA_DE_OTRA = "vecino@veciyo.test";
const MARCA = "[prueba] renta corta exigida";

let turno = 0;
/** Solo cuando se comprobo que la suscripcion de la 101 es de este archivo. */
let esMia = false;

/** Cada intento en su propia semana: dos estancias no se solapan. */
function unHuesped() {
  const entrada = V + turno * 5;
  turno += 1;
  return crearVisita({
    condominioId: CONDOMINIO,
    unidadId: U101,
    tipo: "huesped_temporal",
    fechaDesde: enDias(entrada),
    fechaHasta: enDias(entrada + 2),
    anotacionesIngreso: MARCA,
    invitados: [{ nombre: `${MARCA} huesped` }],
  });
}

async function retirarLoMio() {
  // Un `afterAll` corre aunque el `beforeAll` haya fallado: sin esto, borraria
  // una renta corta de verdad justo el dia que la encontro.
  if (!esMia) return;
  const { data } = await servicio
    .from("visita")
    .select("id")
    .eq("unidad_id", U101)
    .eq("anotaciones_ingreso", MARCA);
  const ids = (data ?? []).map((v) => v.id);
  if (ids.length > 0) {
    const { error } = await servicio.from("visita").delete().in("id", ids);
    if (error) throw new Error(`No se pudieron retirar las visitas: ${error.message}`);
  }
  // La suscripcion de la 101 solo existe porque la abre este archivo.
  const { error } = await servicio
    .from("suscripcion_renta_corta")
    .delete()
    .eq("unidad_id", U101);
  if (error) throw new Error(`No se pudo retirar la suscripcion: ${error.message}`);
}

beforeAll(async () => {
  const { data } = await servicio
    .from("suscripcion_renta_corta")
    .select("id, created_at")
    .eq("unidad_id", U101)
    .maybeSingle();
  /*
    La 101 no tiene renta corta. Si aparece una, o es de una corrida que murio
    --y se retira-- o alguien se la puso de verdad, y entonces este archivo no
    puede borrarla al terminar. Se distingue por las visitas marcadas.
  */
  if (data) {
    const { count } = await servicio
      .from("periodo_suscripcion")
      .select("id", { count: "exact", head: true })
      .eq("suscripcion_id", data.id)
      .not("referencia_pago", "like", "[prueba]%");
    if ((count ?? 0) > 0) {
      throw new Error("La 101 tiene una renta corta con pagos de verdad: este recorrido no la toca");
    }
  }
  esMia = true;
  await retirarLoMio();
});

afterAll(async () => {
  await retirarLoMio();
  await salir();
});

describe("una vivienda sin renta corta", () => {
  it("no registra un huesped temporal", async () => {
    await entrarComo(DUENO);
    await expect(unHuesped()).rejects.toThrow(/renta corta activa/i);
  });

  it("pero una visita corriente si: la regla es de los huespedes", async () => {
    // El control: si no entrara nada, lo de arriba no diria nada de la regla.
    await entrarComo(DUENO);
    const id = await crearVisita({
      condominioId: CONDOMINIO,
      unidadId: U101,
      tipo: "amigos",
      anotacionesIngreso: MARCA,
      invitados: [{ nombre: `${MARCA} amigo` }],
    });
    expect(id).toBeTruthy();
  });
});

describe("activar la renta corta", () => {
  it("no la activa quien no responde por la vivienda", async () => {
    await entrarComo(VECINA_DE_OTRA);
    await expect(activarSuscripcion(U101)).rejects.toThrow(/No puedes activar/i);
  });

  it("su dueño si, y entonces el huesped entra", async () => {
    await entrarComo(DUENO);
    await activarSuscripcion(U101);

    const id = await unHuesped();
    expect(id).toBeTruthy();
  });

  it("activarla dos veces no crea dos", async () => {
    await entrarComo(DUENO);
    await activarSuscripcion(U101);
    const { count } = await servicio
      .from("suscripcion_renta_corta")
      .select("id", { count: "exact", head: true })
      .eq("unidad_id", U101);
    expect(count).toBe(1);
  });
});

describe("darla de baja", () => {
  it("no la da de baja una vecina de otra vivienda", async () => {
    await entrarComo(VECINA_DE_OTRA);
    await expect(cancelarSuscripcion(U101)).rejects.toThrow(/No puedes dar de baja/i);
  });

  it("sin mes pagado se corta hoy, y ya no entran huespedes", async () => {
    await entrarComo(DUENO);
    const baja = await cancelarSuscripcion(U101);
    expect(baja.inmediata).toBe(true);

    await expect(unHuesped()).rejects.toThrow(/renta corta activa/i);
  });

  it("las estancias que ya estaban, se quedan", async () => {
    // Dar de baja no borra reservas: cierra la puerta a las nuevas.
    const { count } = await servicio
      .from("visita")
      .select("id", { count: "exact", head: true })
      .eq("unidad_id", U101)
      .eq("tipo", "huesped_temporal")
      .eq("anotaciones_ingreso", MARCA);
    expect(count).toBe(1);
  });

  it("con mes pagado sigue funcionando hasta su ultimo dia", async () => {
    /*
      Decision del cliente del 29/09/2026: quien pago el mes no lo pierde al
      pulsar. El periodo lo pone la clave de servicio porque el cobro no pasa
      por la aplicacion.
    */
    await entrarComo(DUENO);
    await activarSuscripcion(U101);

    const { data: suscripcion } = await servicio
      .from("suscripcion_renta_corta")
      .select("id")
      .eq("unidad_id", U101)
      .single();
    const iso = (dias: number) => {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() + dias);
      return d.toISOString().slice(0, 10);
    };
    const { error } = await servicio.from("periodo_suscripcion").insert({
      suscripcion_id: suscripcion!.id,
      desde: iso(-5),
      hasta: iso(20),
      verificaciones_base: 20,
      referencia_pago: "[prueba] periodo pagado",
    });
    expect(error).toBeNull();

    const baja = await cancelarSuscripcion(U101);
    expect(baja.inmediata).toBe(false);
    expect(baja.terminaEn).toBe(iso(20));

    // Y mientras dure, se siguen registrando huespedes.
    const id = await unHuesped();
    expect(id).toBeTruthy();
  });
});
