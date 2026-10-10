import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { enDias, entrarComo, isoEnDias, salir, servicio } from "./cliente";
import { crearVisita, diasOcupados } from "@/features/visitas/services/visitas.repo";

/**
 * Recorrido: una vivienda no se alquila dos veces a la vez.
 *
 * El cliente creo una reserva encima de otra --mismas fechas, mismo piso-- y
 * la base la acepto: «si me deja marcarlas, wtf? ¿no deberian aparecer tipo
 * bloqueadas o algo asi?» (09/10/2026). No habia **nada** que lo impidiera, y
 * es una reserva doble del mismo apartamento: se descubre el dia del check-in
 * con dos huespedes en la puerta.
 *
 * Lo sujeta `visita_sin_estancias_solapadas`, una restriccion de exclusion y
 * no un disparador: lo resuelve el indice, asi que vale **tambien bajo
 * concurrencia**. Dos reservas mandadas a la vez son el caso que un
 * disparador con un `select` previo deja pasar, y es el realista: el
 * calendario de Airbnb sincronizando mientras el anfitrion reserva a mano.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
// La 205: la otra vivienda del edificio con renta corta. Desde el 09/10/2026 una
// estancia de huesped solo cabe donde el servicio esta activo.
const U205 = "44444444-4444-4444-4444-444444444442";
const ANFITRIONA = "vecino@veciyo.test";

const MARCA = "[prueba] solape";

/** Lejos de lo que haya, para no chocar con las reservas reales de la 102. */
const DESDE = enDias(200);
const HASTA = enDias(205);

const creadas: string[] = [];

async function reservar(unidadId: string, desde: string, hasta: string) {
  const id = await crearVisita({
    condominioId: CONDOMINIO,
    unidadId,
    tipo: "huesped_temporal",
    fechaDesde: desde,
    fechaHasta: hasta,
    anotacionesIngreso: MARCA,
    invitados: [{ nombre: `${MARCA} titular` }],
  });
  creadas.push(id);
  return id;
}

beforeAll(async () => {
  await entrarComo(ANFITRIONA);
  await reservar(U102, DESDE, HASTA);
});

afterAll(async () => {
  for (const id of creadas) {
    const { data: invitados } = await servicio
      .from("invitado")
      .select("id")
      .eq("visita_id", id);
    const ids = (invitados ?? []).map((i) => i.id);
    if (ids.length > 0) {
      await servicio.from("verificacion_antecedentes").delete().in("invitado_id", ids);
      await servicio.from("reporte_legal").delete().in("invitado_id", ids);
    }
    const { error } = await servicio.from("visita").delete().eq("id", id);
    if (error) throw new Error(`No se pudo retirar ${id}: ${error.message}`);
  }
  await salir();
});

describe("dos estancias en la misma vivienda", () => {
  it("no se pueden solapar", async () => {
    await expect(reservar(U102, DESDE, HASTA)).rejects.toThrow(
      /solapad|exclusion/i,
    );
  });

  it("ni parcialmente", async () => {
    // Un dia en comun basta: no hay media cama.
    await expect(reservar(U102, enDias(203), enDias(210))).rejects.toThrow(
      /solapad|exclusion/i,
    );
  });

  it("pero quien sale el mismo día que entra el otro, sí", async () => {
    /*
      El caso normal de una renta corta: uno se va por la mañana, el otro
      llega por la tarde. El rango es **medio abierto** por esto; con uno
      cerrado quedaria prohibido, que seria peor que el problema que esto
      arregla.
    */
    const id = await reservar(U102, HASTA, enDias(208));
    expect(id).toBeTruthy();
  });

  it("una estancia de cero noches no se puede crear", async () => {
    /*
      Y es lo que dejo colar dos reservas el mismo dia:
      `daterange(17, 17, '[)')` es un rango **vacio**, y un rango vacio no se
      solapa con nada --ni consigo mismo--. El cliente lo vio el 09/10/2026:
      «acabo de crear una nueva reserva para el 17, pero sigue me deja
      seleccionar esa fecha».

      Alojarse es dormir ahi, asi que cero noches no es una estancia.
    */
    await expect(
      reservar(U102, enDias(220), enDias(220)),
    ).rejects.toThrow(/al_menos_una_noche|noche/i);
  });

  /*
    El indice toma ademas **al menos una noche** --`greatest(fecha_hasta,
    fecha_desde + 1)`-- para que una fila de cero noches que ya existiera
    ocupe su dia igual. No se prueba aqui: el `check` de arriba ya no deja
    crear una ni con la clave de servicio, asi que no hay forma de fabricar
    la entrada sin desactivarlo. Comprobado a mano contra la fila que el
    cliente creo el 09/10/2026, y queda dicho en la migracion.
  */

  it("y en otra vivienda no estorba", async () => {
    /*
      El control: sin el, rechazar **siempre** pasaria los dos primeros.

      Va con la clave de servicio porque la 205 no es de Sofia y RLS la para
      antes de que la restriccion opine. Lo que se comprueba aqui es la
      restriccion, no la politica --esa tiene lo suyo-- y mezclarlas haria que
      este caso pasara en verde por el motivo equivocado.
    */
    const { data, error } = await servicio
      .from("visita")
      .insert({
        condominio_id: CONDOMINIO,
        unidad_id: U205,
        tipo: "huesped_temporal",
        estado: "programada",
        fecha_desde: isoEnDias(200),
        fecha_hasta: isoEnDias(205),
        anotaciones_ingreso: MARCA,
      })
      .select("id")
      .single();

    expect(error).toBeNull();
    if (data) creadas.push(data.id);
  });
});

describe("los días que la pantalla tacha", () => {
  it("son los de la estancia, sin el de salida", async () => {
    /*
      Tienen que coincidir con lo que la restriccion rechaza. Si el calendario
      tachara el dia de salida, estaria prohibiendo desde la pantalla algo que
      la base admite --y que es el caso normal--.
    */
    const dias = await diasOcupados(U102);

    expect(dias.has(isoEnDias(200))).toBe(true);
    expect(dias.has(isoEnDias(204))).toBe(true);
    // El 205 es salida de una y entrada de la siguiente: ocupado por esa.
    expect(dias.has(isoEnDias(205))).toBe(true);
    expect(dias.has(isoEnDias(207))).toBe(true);
    // Y el ultimo dia de la ultima, no: esa noche queda libre.
    expect(dias.has(isoEnDias(208))).toBe(false);
  });

  it("y de una vivienda ajena no se ve nada", async () => {
    /*
      La 205 tiene una estancia en esas mismas fechas --la creo la clave de
      servicio en el caso de arriba-- y Sofia no la ve: no es suya. Asi que su
      calendario no tacha dias por reservas de otro piso, que ademas seria
      filtrar cuando esta ocupado el apartamento del vecino.

      Vacio y no «todo libre por si acaso»: lo que la pantalla pinta de una
      vivienda ajena no deberia poder construirse, y de hecho no se puede.
    */
    const dias = await diasOcupados(U205);

    expect(dias.size).toBe(0);
  });
});
