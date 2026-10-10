import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio, supabase } from "./cliente";
import {
  guardarRecordatorios,
  obtenerRecordatorios,
} from "@/features/propietario/services/suscripcion.repo";

/**
 * Recorrido: el preregistro que nadie termina avisa solo.
 *
 * Hasta el 03/10/2026 **no había ni una sola tarea periódica en todo el
 * proyecto**. Quien abría su enlace, llenaba la mitad y lo dejaba, no volvía a
 * saber de VeciYo: aparecía en la puerta sin registrar y el problema se
 * descubría con él en el vestíbulo.
 *
 * El dato estaba desde el principio y el canal también. Faltaba quien
 * preguntara.
 *
 * Parametrizable por decisión del cliente ese mismo día: «el anfitrión que
 * elija y ya», con 7, 3 y 1 por defecto. Eso es lo que se comprueba aquí: que
 * la elección **cambia a quién se avisa**, que es lo único que distingue una
 * casilla de verdad de una decorativa.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
/*
  La 205 y no la 102. Este archivo es el unico que necesita estancias **de
  verdad cercanas** --a 7, 5, 3 y 1 dias--, y en la 102 esos dias los ocupan las
  reservas que el cliente crea a mano para probar: desde que dos estancias no
  se pueden solapar, chocaba con ellas. La 205 tiene renta corta y nadie mas
  le abre estancias.
*/
const U205 = "44444444-4444-4444-4444-444444444442";
const ANFITRIONA = "propietario@veciyo.test";

const MARCA = "[prueba] recordatorio del preregistro";

/**
 * Hoy **según la base**, no según esta máquina.
 *
 * La regla cuenta con `current_date` del servidor y la prueba componía sus
 * fechas con `new Date()` local. Casi siempre coinciden; el 04/10/2026 a las
 * 00:30 UTC --las 19:30 del día 3 en Colombia-- dejaron de coincidir y los
 * seis casos se pusieron rojos sin que nadie tocara una línea: la estancia «a
 * 7 días» estaba en realidad a 6.
 *
 * Es exactamente «una prueba que mide con otro reloj se rompe sola una hora al
 * día», que ya está en AGENTS.md, con el día en lugar de la hora.
 *
 * PostgREST no expone `current_date` suelto, así que se pregunta insertando
 * una fila de usar y tirar y leyendo el `now()` que pone la base.
 */
async function hoyEnLaBase(): Promise<Date> {
  const { data, error } = await servicio
    .from("visita")
    .insert({
      condominio_id: CONDOMINIO,
      unidad_id: U205,
      tipo: "huesped_temporal",
      fecha_desde: "2000-01-01",
      fecha_hasta: "2000-01-02",
      anotaciones_ingreso: `${MARCA} reloj`,
    })
    .select("created_at")
    .single();
  if (error) throw new Error(`No se pudo preguntar la fecha: ${error.message}`);

  const { error: errorLimpieza } = await servicio
    .from("visita")
    .delete()
    .eq("anotaciones_ingreso", `${MARCA} reloj`);
  // Una limpieza que no comprueba si limpió no es una limpieza.
  if (errorLimpieza) throw new Error(errorLimpieza.message);

  return new Date(data!.created_at);
}

/** Una fecha a `dias` del día de la base, en ISO. */
function desdeLaBase(hoy: Date, dias: number): string {
  const d = new Date(hoy);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

interface PorRecordar {
  visita_id: string;
  dias_antes: number;
  destinatario: string;
  correo: string | null;
}

/** A quién tocaría avisar hoy. No manda nada. */
async function porRecordar(): Promise<PorRecordar[]> {
  const { data, error } = await servicio.rpc("precheckins_por_recordar" as never);
  if (error) throw new Error(error.message);
  return (data as unknown as PorRecordar[]) ?? [];
}

/**
 * Abre una estancia que empieza dentro de `dias`, con su preregistro abierto y
 * sin cerrar, y un titular con correo.
 *
 * Se escribe con la clave de servicio y no por las funciones de la aplicación
 * porque lo que se prueba es el cron, no el alta: necesita una fila con una
 * forma concreta --enlace abierto, sin cerrar, a tantos días-- y montarla por
 * la puerta grande añadiría media docena de pasos que no son el asunto.
 */
async function estanciaEn(dias: number, correo: string) {
  const hoy = await hoyEnLaBase();
  const { data: visita, error } = await servicio
    .from("visita")
    .insert({
      condominio_id: CONDOMINIO,
      unidad_id: U205,
      tipo: "huesped_temporal",
      fecha_desde: desdeLaBase(hoy, dias),
      // Una noche: asi las de 7, 5, 3 y 1 dias no se pisan entre ellas.
      fecha_hasta: desdeLaBase(hoy, dias + 1),
      anotaciones_ingreso: MARCA,
      precheckin_token_hash: `prueba-${crypto.randomUUID()}`,
      precheckin_expira_en: new Date(Date.now() + 40 * 86400000).toISOString(),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const { error: e2 } = await servicio.from("invitado").insert({
    visita_id: visita.id,
    orden: 0,
    nombre: `${MARCA} titular`,
    es_titular: true,
    correo,
  });
  if (e2) throw new Error(e2.message);

  return visita.id as string;
}

/** Lo que había configurado, para devolverlo al terminar. */
let comoEstaba: {
  recordatorio_al_huesped: boolean;
  recordatorio_al_anfitrion: boolean;
  recordatorio_dias: number[];
} | null = null;

const visitas: string[] = [];

beforeAll(async () => {
  /*
    La fila cruda, y se devuelve con una escritura directa. Si se restaurase
    llamando a la función de la aplicación, una mutación de esa función
    dejaría la configuración del cliente estropeada: ya pasó con
    `ocultar_numero`.
  */
  const { data } = await servicio
    .from("suscripcion_renta_corta")
    .select("recordatorio_al_huesped, recordatorio_al_anfitrion, recordatorio_dias")
    .eq("unidad_id", U205)
    .single();
  comoEstaba = data as typeof comoEstaba;
});

afterAll(async () => {
  for (const id of visitas) {
    await servicio.from("recordatorio_precheckin").delete().eq("visita_id", id);
    const { error } = await servicio.from("visita").delete().eq("id", id);
    if (error) throw new Error(`No se pudo retirar la visita ${id}: ${error.message}`);
  }
  if (comoEstaba) {
    await servicio
      .from("suscripcion_renta_corta")
      .update(comoEstaba)
      .eq("unidad_id", U205);
  }
  await salir();
});

describe("el anfitrión elige a quién se avisa", () => {
  it("por defecto son 7, 3 y 1 día", async () => {
    await entrarComo(ANFITRIONA);
    await guardarRecordatorios(U205, {
      alHuesped: true,
      alAnfitrion: true,
      dias: [7, 3, 1],
    });

    const puesto = await obtenerRecordatorios(U205);
    expect(puesto.dias).toEqual([7, 3, 1]);
    expect(puesto.alHuesped).toBe(true);
    expect(puesto.alAnfitrion).toBe(true);
  });

  it("los ordena y quita repetidos", async () => {
    /*
      Con `{7,7,3}` el cron mandaría dos veces el mismo día. La constancia lo
      impediría, pero por accidente y dejando una fila de error: mejor que no
      se pueda escribir.
    */
    await guardarRecordatorios(U205, {
      alHuesped: true,
      alAnfitrion: true,
      dias: [3, 7, 3, 1],
    });
    expect((await obtenerRecordatorios(U205)).dias).toEqual([7, 3, 1]);
  });

  it("no acepta un día que no corresponde a ninguna reserva", async () => {
    await expect(
      guardarRecordatorios(U205, {
        alHuesped: true,
        alAnfitrion: true,
        dias: [400],
      }),
    ).rejects.toThrow(/1 a 60/i);
  });

  it("y nadie de otra vivienda la puede configurar", async () => {
    /*
      El control que hace que el caso anterior signifique algo: sin esto,
      «se guarda» pasaría igual con la función abierta de par en par.
    */
    await salir();
    try {
      await entrarComo("vecino2@veciyo.test");
      await expect(
        guardarRecordatorios(U205, { alHuesped: false, alAnfitrion: false, dias: [1] }),
      ).rejects.toThrow(/permiso/i);
    } finally {
      /*
        En `finally` y no al final del caso: la primera version entraba con una
        cuenta que no existe, el `entrarComo` reventó, y **los siete casos
        siguientes se quedaron sin sesion** --«No tenes permiso para configurar
        esta vivienda», siete veces, que no tiene nada que ver con lo que
        comprueban--. Un caso que cambia de rol lo devuelve pase lo que pase.
      */
      await salir();
      await entrarComo(ANFITRIONA);
    }
  });
});

describe("a quién toca avisar hoy", () => {
  it("una estancia a 7 días sale, con sus dos destinatarios", async () => {
    await guardarRecordatorios(U205, {
      alHuesped: true,
      alAnfitrion: true,
      dias: [7, 3, 1],
    });

    const id = await estanciaEn(7, "siete.dias@veciyo.test");
    visitas.push(id);

    const lista = (await porRecordar()).filter((r) => r.visita_id === id);
    expect(lista.map((r) => r.destinatario).sort()).toEqual([
      "anfitrion",
      "huesped",
    ]);
    expect(lista.every((r) => r.dias_antes === 7)).toBe(true);
  });

  it("una a 5 días no sale: 5 no está en la lista", async () => {
    const id = await estanciaEn(5, "cinco.dias@veciyo.test");
    visitas.push(id);

    const lista = (await porRecordar()).filter((r) => r.visita_id === id);
    expect(lista).toEqual([]);
  });

  it("y sale en cuanto el anfitrión añade el 5", async () => {
    /*
      Este es el caso que prueba que la configuración **no es decorativa**: la
      misma estancia, el mismo día, y lo único que cambia es lo que eligió el
      anfitrión.
    */
    await guardarRecordatorios(U205, {
      alHuesped: true,
      alAnfitrion: true,
      dias: [7, 5, 3, 1],
    });

    const id = visitas[visitas.length - 1];
    const lista = (await porRecordar()).filter((r) => r.visita_id === id);
    expect(lista.length).toBe(2);
    expect(lista[0].dias_antes).toBe(5);
  });

  it("apagar el aviso al huésped deja solo el del anfitrión", async () => {
    await guardarRecordatorios(U205, {
      alHuesped: false,
      alAnfitrion: true,
      dias: [7, 5, 3, 1],
    });

    const id = visitas[visitas.length - 1];
    const lista = (await porRecordar()).filter((r) => r.visita_id === id);
    expect(lista.map((r) => r.destinatario)).toEqual(["anfitrion"]);
  });

  it("y sin ningún día marcado no se avisa de nada", async () => {
    await guardarRecordatorios(U205, {
      alHuesped: true,
      alAnfitrion: true,
      dias: [],
    });

    const ids = new Set(visitas);
    expect((await porRecordar()).filter((r) => ids.has(r.visita_id))).toEqual([]);
  });
});

describe("la constancia de lo que ya se mandó", () => {
  it("un aviso registrado deja de salir en la lista", async () => {
    /*
      Sin esto el cron manda el mismo correo cada vez que corre. Se escribe la
      fila a mano en vez de llamar al envío: lo que se comprueba es que la
      constancia filtra, no el correo --y mandar correos de verdad en una
      prueba es exactamente lo que no se quiere--.
    */
    await guardarRecordatorios(U205, {
      alHuesped: true,
      alAnfitrion: false,
      dias: [7, 3, 1],
    });

    const id = await estanciaEn(3, "tres.dias@veciyo.test");
    visitas.push(id);

    expect((await porRecordar()).filter((r) => r.visita_id === id).length).toBe(1);

    const { error } = await servicio.from("recordatorio_precheckin").insert({
      visita_id: id,
      dias_antes: 3,
      destinatario: "huesped",
      correo: "tres.dias@veciyo.test",
    });
    expect(error).toBeNull();

    expect((await porRecordar()).filter((r) => r.visita_id === id)).toEqual([]);
  });

  it("y el mismo aviso no se puede registrar dos veces", async () => {
    const id = visitas[visitas.length - 1];
    const { error } = await servicio.from("recordatorio_precheckin").insert({
      visita_id: id,
      dias_antes: 3,
      destinatario: "huesped",
      correo: "tres.dias@veciyo.test",
    });
    expect(error).not.toBeNull();
  });
});

describe("un preregistro ya cerrado", () => {
  it("no genera recordatorios", async () => {
    await guardarRecordatorios(U205, {
      alHuesped: true,
      alAnfitrion: true,
      dias: [7, 3, 1],
    });

    const id = await estanciaEn(1, "ya.cerrado@veciyo.test");
    visitas.push(id);

    expect((await porRecordar()).filter((r) => r.visita_id === id).length).toBe(2);

    await servicio
      .from("visita")
      .update({ precheckin_completado_en: new Date().toISOString() })
      .eq("id", id);

    expect((await porRecordar()).filter((r) => r.visita_id === id)).toEqual([]);
  });
});
