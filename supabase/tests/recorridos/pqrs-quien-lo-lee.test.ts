import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio, supabase } from "./cliente";

/**
 * Recorrido: quién lee un reclamo, según a quién va dirigido.
 *
 * Salió recorriendo el Centro de Atención como Marcela: entre los reclamos
 * del edificio aparecían varios marcados **«Aplicación VeciYo · Soporte»**,
 * que son quejas sobre el producto, no sobre el condominio. Hoy hay 114 así.
 *
 * **Resuelto el 02/10/2026.** La política era
 * `creado_por = auth.uid() OR es_admin_condominio(...)` y no miraba el área, así
 * que la administración del edificio leía las quejas sobre VeciYo. No se arregló
 * antes porque no había nadie al otro lado: en la aplicación no existía ningún
 * rol de soporte del producto, y cerrarlo sin más habría dejado 114 reclamos sin
 * nadie que los atendiera.
 *
 * Ahora existe —el staff de plataforma— y la política mira el área: la
 * administración ve lo del edificio, la plataforma lo de la aplicación.
 *
 * Y la versión anterior de este archivo funcionó como estaba previsto. Decía:
 * «si se decide que la administración no los vea, este caso se pone rojo y hay
 * que venir a cambiarlo». Se puso rojo el 02/10/2026, y aquí está cambiado.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const ADMIN = "admin@veciyo.test";
const VECINA = "vecino@veciyo.test"; // Sofía, de la 102
/** Quien opera VeciYo: no vive en ningún edificio ni administra ninguno. */
const PLATAFORMA = "dueno@veciyo.test";

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

  it("y NO lo lee la administración del edificio", async () => {
    /*
      Es el caso que importa, y el que daba el defecto: alguien escribe al
      soporte de VeciYo para quejarse de la administración de su edificio --que
      es un motivo previsible-- y la administración lo leía entero.

      Es la misma forma que el hilo de una vivienda con portería, que ya se
      había resuelto (D-13): la administración tiene su propio hilo y no entra
      en el de seguridad. Aquí ahora tampoco.
    */
    await entrarComo(ADMIN);
    const { data } = await supabase
      .from("reclamo")
      .select("id, titulo, descripcion")
      .eq("id", reclamoId);
    await salir();

    expect(data).toHaveLength(0);
  });

  it("lo lee la plataforma, que es quien lo atiende", async () => {
    /*
      El control positivo del caso de arriba: que la administración no lo vea no
      prueba nada si no lo ve nadie. Se pide el texto entero, que es lo que hace
      falta para atender la queja.
    */
    await entrarComo(PLATAFORMA);
    const { data } = await supabase
      .from("reclamo")
      .select("id, descripcion, area")
      .eq("id", reclamoId);
    await salir();

    expect(data).toHaveLength(1);
    expect(data![0].descripcion).toContain("cobrando de más");
  });

  it("pero la plataforma no entra en las quejas del edificio", async () => {
    /*
      El límite por el otro lado, y en el mismo archivo a propósito: si el rol
      nuevo pudiera leer las PQRS del condominio, no se habría separado nada —se
      habría cambiado quién mira de más.

      Se pide una del edificio explícitamente, con su control positivo: que la
      administración sí la ve.
    */
    await entrarComo(ADMIN);
    const { data: delEdificio } = await supabase
      .from("reclamo")
      .select("id")
      .eq("area", "condominio")
      .limit(1);
    await salir();

    expect(delEdificio).toHaveLength(1);

    await entrarComo(PLATAFORMA);
    const { data } = await supabase
      .from("reclamo")
      .select("id")
      .eq("id", delEdificio![0].id);
    await salir();

    expect(data).toHaveLength(0);
  });

  it("y `destinatario` sigue vacía: el discriminador es el área", async () => {
    /*
      `destinatario` es un enum --`administrador | propietario | aplicacion`--
      hecho exactamente para esto, y no lo escribe nadie: está vacío en las 230
      filas. Se decidió **no** resucitarlo: el discriminador es `area`, que es lo
      que el formulario escribe de verdad, y dos columnas para lo mismo es la
      segunda fuente de verdad que prohíbe la regla 1.

      Se comprueba desde la plataforma, que es quien ahora puede leer esta fila.
    */
    await entrarComo(PLATAFORMA);
    const { data } = await supabase
      .from("reclamo")
      .select("destinatario, area")
      .eq("id", reclamoId)
      .single();
    await salir();

    expect(data!.destinatario).toBeNull();
    expect(data!.area).toBe("aplicacion");
  });
});

/**
 * Una queja **contra una vivienda**: quién la lee y, sobre todo, quién no.
 *
 * `reclamo.unidad_denunciada` existe desde la primera migración, está indexada,
 * y **no la escribía ni la leía nadie** (REVISAR-A-OJO 98): una queja de
 * convivencia --ruido, humedades, un huésped que molesta-- no tenía dónde decir
 * contra quién iba.
 *
 * Decidido con el cliente el 02/10/2026: señala a **la vivienda**, no a la
 * persona, y la leen **solo quien la escribió y la administración**.
 *
 * Lo que de verdad hay que comprobar es lo último, porque no se arregla
 * después: si el denunciado pudiera leerla, acabaría de enterarse de quién le
 * denunció. La política ya lo impedía; esto lo deja probado.
 */
describe("una queja contra una vivienda", () => {
  const UNIDAD_102 = "44444444-4444-4444-4444-444444444443";
  let quejaId = "";

  beforeAll(async () => {
    // Guillermo, de la 101, se queja de la 102.
    const uid = await entrarComo("propietario@veciyo.test");

    const { data, error } = await supabase
      .from("reclamo")
      .insert({
        condominio_id: CONDOMINIO,
        creado_por: uid,
        area: "condominio",
        tipo: "queja",
        titulo: `${MARCA} ruido`,
        descripcion: "[prueba] Ruido de madrugada.",
        unidad_denunciada: UNIDAD_102,
      })
      .select("id")
      .single();

    expect(error?.message ?? null).toBeNull();
    quejaId = data!.id;
    await salir();
  });

  afterAll(async () => {
    await servicio.from("reclamo").delete().eq("id", quejaId);
    await salir();
  });

  it("queda dicho contra qué vivienda va", async () => {
    const { data } = await servicio
      .from("reclamo")
      .select("unidad_denunciada")
      .eq("id", quejaId)
      .single();

    expect(data!.unidad_denunciada).toBe(UNIDAD_102);
  });

  it("la lee quien la escribió", async () => {
    await entrarComo("propietario@veciyo.test");
    const { data } = await supabase
      .from("reclamo")
      .select("id")
      .eq("id", quejaId);
    await salir();

    expect(data ?? []).toHaveLength(1);
  });

  it("y la administración, que es quien tiene que actuar", async () => {
    await entrarComo("admin@veciyo.test");
    const { data } = await supabase
      .from("reclamo")
      .select("id")
      .eq("id", quejaId);
    await salir();

    expect(data ?? []).toHaveLength(1);
  });

  it("pero la vivienda denunciada no se entera", async () => {
    /*
      El caso que importa. Sofía vive en la 102 y es contra ella: si pudiera
      leer esto, sabría quién la denunció y qué dijo. No es un detalle de
      interfaz --queda escrito-- y por eso se comprueba contra la base.
    */
    await entrarComo("vecino@veciyo.test");
    const { data } = await supabase
      .from("reclamo")
      .select("id")
      .eq("id", quejaId);
    await salir();

    expect(data ?? []).toHaveLength(0);
  });
});
