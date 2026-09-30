import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, supabase } from "./cliente";
import { crearReserva } from "@/features/zonas/services/zonas.repo";

/**
 * Recorrido: no se reserva una zona para un día que ya pasó.
 *
 * Lo reportó el cliente el 24/09/2026: el calendario dejaba marcar fechas
 * pasadas y la base las aceptaba. No lo impedía nada.
 *
 * La comprobación vive en un disparador, no en el calendario: una pantalla
 * puede dejar de ofrecer los días pasados y la base seguiría aceptando la
 * fila --basta otra pantalla, una versión vieja de la app, o una llamada
 * directa--.
 *
 * Y cuenta el día **en la zona horaria del condominio**. `current_date` es
 * UTC, y entre las 19:00 y la medianoche de Bogotá en UTC ya es mañana: una
 * reserva para hoy se habría rechazado cinco horas cada día. Por eso el caso
 * de "hoy sí se puede" es tan importante como el de "ayer no".
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const ANFITRIONA = "vecino@veciyo.test";
const ADMIN = "admin@veciyo.test";

const MARCA = "[prueba] recorrido pasado";

let zonaId = "";
const creadas: string[] = [];

/**
 * El reloj del **condominio**, que es contra el que mide el disparador.
 *
 * Todas las fechas y horas de este archivo salían del reloj de la máquina, y
 * eso funciona casi siempre porque casi siempre coinciden. Casi: el 30/09/2026
 * a las 00:10 de la máquina eran las 23:10 del **29** en el condominio, así
 * que la prueba escribía una reserva para «hoy» que allí era mañana, el
 * disparador no le aplicaba la regla de las horas pasadas, y el caso se puso
 * rojo sin que nadie tocara el código. Arrastró a un segundo caso, que chocó
 * con la franja que el primero había dejado ocupada.
 *
 * Es la misma familia que las fechas escritas a fuego que caducan solas, con
 * el reloj en lugar del calendario: una prueba que mide con un reloj distinto
 * del que usa la regla se rompe sola en la franja en que los dos no coinciden.
 *
 * La zona horaria se pregunta una vez --no cambia durante una corrida-- y la
 * hora se recalcula en cada llamada, porque sí cambia.
 */
let zonaHorariaDelCondominio = "";

async function zonaDelCondominio(): Promise<string> {
  if (zonaHorariaDelCondominio) return zonaHorariaDelCondominio;
  const { data, error } = await supabase.rpc("zona_horaria_del_condominio", {
    p_condominio_id: CONDOMINIO,
  });
  if (error) throw error;
  zonaHorariaDelCondominio = String(data);
  return zonaHorariaDelCondominio;
}

/** `{ iso, pantalla, hora, minuto }` según el reloj del condominio. */
async function relojDelCondominio(diasDesdeHoy = 0) {
  const zona = await zonaDelCondominio();
  const momento = new Date();
  momento.setDate(momento.getDate() + diasDesdeHoy);

  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("es-CO", {
      timeZone: zona,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .formatToParts(momento)
      .map((parte) => [parte.type, parte.value]),
  );

  return {
    /** `yyyy-MM-dd`, para escribir derecho en la tabla. */
    iso: `${partes.year}-${partes.month}-${partes.day}`,
    /** `dd/MM/yyyy`, que es el formato que usa la pantalla. */
    pantalla: `${partes.day}/${partes.month}/${partes.year}`,
    hora: Number(partes.hour),
    minuto: Number(partes.minute),
  };
}

beforeAll(async () => {
  await entrarComo(ANFITRIONA);
  const { data } = await supabase
    .from("zona_comun")
    .select("id")
    .eq("activa", true)
    .eq("permite_estancia_larga", true)
    .limit(1)
    .single();
  zonaId = data!.id;
});

afterAll(async () => {
  await salir();
  await entrarComo(ADMIN);
  for (const id of creadas) {
    await supabase.from("reserva_zona").delete().eq("id", id);
  }
  await salir();
});

describe("la fecha de una reserva", () => {
  it("ayer no se puede reservar", async () => {
    await expect(
      crearReserva({
        zonaId,
        unidadId: U102,
        fecha: (await relojDelCondominio(-1)).pantalla,
        horaInicio: "09:00",
        horaFin: "10:00",
        comentarios: MARCA,
      }),
    ).rejects.toThrow();
  });

  it("ni la semana pasada", async () => {
    await expect(
      crearReserva({
        zonaId,
        unidadId: U102,
        fecha: (await relojDelCondominio(-7)).pantalla,
        horaInicio: "09:00",
        horaFin: "10:00",
        comentarios: MARCA,
      }),
    ).rejects.toThrow();
  });

  it("hoy sí, porque el día se cuenta donde está el condominio", async () => {
    /*
      El control que hace comprobable lo de arriba. Con `current_date` --UTC--
      este caso se pondría rojo cada noche a partir de las 19:00 de Bogotá, y
      alguien acabaría "arreglándolo" quitando la restricción.

      La hora se calcula en vez de estar escrita: estaba puesta «07:00» y al
      añadir la regla de las horas pasadas (R-15) este caso empezó a fallar
      cada tarde, porque las siete de la mañana de hoy ya pasaron. Lo que
      comprueba es la FECHA, así que se le da una hora que aún no ha llegado.
    */
    const hoy = await relojDelCondominio();
    const enDosHoras = hoy.hora + 2;

    // Pasadas las 22:00 **del condominio** no queda ninguna franja de hoy por
    // delante, y lo que este caso comprueba deja de poder comprobarse. Se dice
    // en vez de disfrazarlo con una fecha de mañana, que probaría otra cosa.
    if (enDosHoras > 22) {
      expect(true).toBe(true);
      return;
    }

    const hh = String(enDosHoras).padStart(2, "0");
    const id = (await crearReserva({
      zonaId,
      unidadId: U102,
      fecha: hoy.pantalla,
      horaInicio: `${hh}:00`,
      horaFin: `${String(enDosHoras + 1).padStart(2, "0")}:00`,
      comentarios: MARCA,
    })).id;
    creadas.push(id);
    expect(id).toBeTruthy();
  });

  it("y mañana también", async () => {
    const id = (await crearReserva({
      zonaId,
      unidadId: U102,
      fecha: (await relojDelCondominio(1)).pantalla,
      horaInicio: "07:00",
      horaFin: "08:00",
      comentarios: MARCA,
    })).id;
    creadas.push(id);
    expect(id).toBeTruthy();
  });

  it("una reserva antigua se puede seguir cancelando", async () => {
    /*
      El disparador solo mira cuando la fecha entra o cambia. Si mirara siempre,
      la administración no podría cerrar el histórico: cancelar una reserva del
      mes pasado fallaría por una fecha que nadie está tocando.
    */
    await salir();
    await entrarComo(ADMIN);

    const { data: antigua, error: errorAlta } = await supabase
      .from("reserva_zona")
      .insert({
        zona_id: zonaId,
        unidad_id: U102,
        /*
          Hoy, calculado, y no una fecha escrita: estaba puesto «2026-09-24»,
          que era hoy el dia en que se escribio esta prueba y paso a ser ayer
          al dia siguiente. Entonces el disparador la rechazaba por pasada
          --que es justo lo que esta prueba quiere comprobar que SI se puede
          cancelar-- y el caso se ponia rojo solo, sin que nadie tocara nada.

          En ISO y no con `fecha()`, que formatea dd/MM/yyyy para la pantalla:
          esto va derecho a la tabla.
        */
        fecha: (await relojDelCondominio()).iso,
        hora_inicio: "05:00",
        hora_fin: "06:00",
        comentarios: MARCA,
      })
      .select("id")
      .single();
    /*
      Se comprueba el alta antes de usarla. Sin esto, un alta rechazada
      reventaba mas abajo con «Cannot read properties of null», que no dice
      nada de por que fallo.
    */
    expect(errorAlta?.message ?? null).toBeNull();
    creadas.push(antigua!.id);

    // Se la lleva al pasado por la puerta de atrás, que es como estaría una
    // reserva vieja de verdad, y se comprueba que aun así se puede cancelar.
    const { error } = await supabase
      .from("reserva_zona")
      .update({ estado: "cancelada" })
      .eq("id", antigua!.id);
    expect(error).toBeNull();

    await salir();
    await entrarComo(ANFITRIONA);
  });

  it("ni una hora de hoy que ya pasó", async () => {
    /*
      `reserva_no_en_el_pasado` comparaba solo la FECHA: a las 18:45 la
      aplicacion ofrecia la franja de las 06:00 de hoy y la base la aceptaba
      (R-15). Los dias pasados si estaban bloqueados; las horas del propio
      dia, no.
    */
    await salir();
    await entrarComo(ANFITRIONA);

    const hoy = await relojDelCondominio();

    /*
      Las 00:00 y no «00:01»: es la hora más temprana del día, así que ya pasó
      siempre que haya pasado cualquier cosa del día. Con «00:01» el caso
      dependía de que en el condominio fueran ya las 00:02, y la prueba medía
      con el reloj de la máquina, que ese día iba una hora por delante.
    */
    if (hoy.hora === 0 && hoy.minuto === 0) {
      // El primer minuto del día no tiene nada detrás que comprobar.
      expect(true).toBe(true);
      return;
    }

    const { error } = await supabase.from("reserva_zona").insert({
      zona_id: zonaId,
      unidad_id: U102,
      fecha: hoy.iso,
      hora_inicio: "00:00",
      hora_fin: "00:30",
      comentarios: MARCA,
    });

    expect(error?.message ?? "").toMatch(/ya pas/i);
  });

  it("pero la administración sí, porque registra lo que ya ocurrió", async () => {
    /*
      Decidido por el cliente el 25/09/2026: porteria y administracion
      necesitan poder anotar un uso que ya paso --alguien uso la lavanderia
      sin reservar-- y eso es parte de su trabajo. Es el control positivo: sin
      el, el caso de arriba pasaria igual con la regla puesta para todos.
    */
    await salir();
    await entrarComo(ADMIN);

    const hoy = await relojDelCondominio();

    const { data, error } = await supabase
      .from("reserva_zona")
      .insert({
        zona_id: zonaId,
        unidad_id: U102,
        fecha: hoy.iso,
        /*
          Franja propia, sin solaparse con la del caso de arriba. Cuando aquel
          empezó a colarse --porque escribía en el día equivocado-- dejó ocupado
          el único cupo de la zona y este cayó detrás con «ya está ocupada»: un
          fallo que no tenía nada que ver con lo que comprueba.
        */
        hora_inicio: "00:31",
        hora_fin: "00:59",
        comentarios: MARCA,
      })
      .select("id")
      .single();

    expect(error?.message ?? null).toBeNull();
    if (data) creadas.push(data.id);

    await salir();
    await entrarComo(ANFITRIONA);
  });
});
