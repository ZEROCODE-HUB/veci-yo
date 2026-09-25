import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio, supabase } from "./cliente";

/**
 * Recorrido: quién lee un reclamo, según a quién va dirigido.
 *
 * Salió recorriendo el Centro de Atención como Marcela: entre los reclamos
 * del edificio aparecían varios marcados **«Aplicación VeciYo · Soporte»**,
 * que son quejas sobre el producto, no sobre el condominio. Hoy hay 114 así.
 *
 * La política es `creado_por = auth.uid() OR es_admin_condominio(...)`, y no
 * mira ni el área ni el destinatario. `reclamo.destinatario` existe como enum
 * --`administrador | propietario | aplicacion`-- y está **vacío en las 230
 * filas**: no lo escribe nadie y no lo lee nadie.
 *
 * Esta prueba deja constancia de lo que pasa AHORA, no de lo que debería
 * pasar. Si se decide que la administración del edificio no vea los reclamos
 * dirigidos al soporte del producto, este caso se pone rojo y hay que venir a
 * cambiarlo — que es exactamente lo que se quiere.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const ADMIN = "admin@veciyo.test";
const VECINA = "vecino@veciyo.test"; // Sofía, de la 102

const MARCA = "[prueba] queja sobre la administración";

let reclamoId = "";

beforeAll(async () => {
  const uid = await entrarComo(VECINA);

  const { data, error } = await supabase
    .from("reclamo")
    .insert({
      condominio_id: CONDOMINIO,
      creado_por: uid,
      area: "aplicacion",
      tipo: "soporte",
      titulo: MARCA,
      descripcion:
        "[prueba] La administración de mi edificio me está cobrando de más.",
    })
    .select("id")
    .single();

  expect(error?.message ?? null).toBeNull();
  reclamoId = data!.id;
  await salir();
});

afterAll(async () => {
  // `reclamo` no tiene política de baja --es constancia-- así que se retira
  // con la escoba, sobre la fila que este recorrido creó y por su id.
  await servicio.from("reclamo").delete().eq("id", reclamoId);
  await salir();
});

describe("un reclamo dirigido al soporte del producto", () => {
  it("lo ve quien lo escribió", async () => {
    // El control positivo: sin él, el caso de abajo pasaría igual aunque la
    // política estuviera cerrada del todo y nadie viera nada.
    await entrarComo(VECINA);
    const { data } = await supabase
      .from("reclamo")
      .select("id, area")
      .eq("id", reclamoId);
    await salir();

    expect(data).toHaveLength(1);
    expect(data![0].area).toBe("aplicacion");
  });

  it("y HOY lo lee también la administración del edificio", async () => {
    /*
      Es el caso que importa: alguien escribe al soporte de VeciYo para
      quejarse de la administración de su edificio --que es un motivo
      previsible-- y la administración lo lee.

      Es la misma forma que el hilo de una vivienda con portería, que sí se
      resolvió (D-13): la administración tiene su propio hilo y no entra en el
      de seguridad. Aquí no hay esa separación.
    */
    await entrarComo(ADMIN);
    const { data } = await supabase
      .from("reclamo")
      .select("id, titulo, descripcion")
      .eq("id", reclamoId);
    await salir();

    expect(data).toHaveLength(1);
    // Y no solo el asunto: el texto entero.
    expect(data![0].descripcion).toContain("cobrando de más");
  });

  it("y la columna que serviría para separarlo está vacía", async () => {
    // `destinatario` es un enum hecho para esto y no lo escribe nadie.
    await entrarComo(ADMIN);
    const { data } = await supabase
      .from("reclamo")
      .select("destinatario")
      .eq("id", reclamoId)
      .single();
    await salir();

    expect(data!.destinatario).toBeNull();
  });
});
