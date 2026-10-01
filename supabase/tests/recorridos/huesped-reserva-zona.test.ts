import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, supabase } from "./cliente";
import { crearReserva, obtenerReservas, obtenerZonas } from "@/features/zonas/services/zonas.repo";

/**
 * Recorrido: el huésped temporal reserva una zona común.
 *
 * Es el flujo que se rompió en producción el 24/09/2026 y que ninguna prueba
 * cubría, porque las de RLS comprueban políticas fila a fila y esto falla en
 * la costura: `crearReserva` hace **dos** escrituras --la reserva y sus
 * acompañantes-- y la segunda no estaba permitida.
 *
 * Llama a las funciones del repositorio, no a PostgREST: así se comprueba
 * también lo que la pantalla le pasa de verdad a la base.
 */

const U102 = "44444444-4444-4444-4444-444444444443";
const HUESPED = "nuevo.inquilino@veciyo.test";
const VENCIDO = "huesped.pasado@veciyo.test";
const ADMIN = "admin@veciyo.test";

/** Marca de la suite: la limpieza global borra lo que la lleve. */
const MARCA = "[prueba] recorrido zona";

/** Mañana, en el formato que usa la pantalla. */
function manana(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return [
    String(d.getDate()).padStart(2, "0"),
    String(d.getMonth() + 1).padStart(2, "0"),
    d.getFullYear(),
  ].join("/");
}

let zonaCorta = "";
let zonaLarga = "";
/** Una zona con varios puestos --la lavanderia tiene cuatro lavadoras--. */
let zonaConPuestos = "";
const creadas: string[] = [];

beforeAll(async () => {
  await entrarComo(HUESPED);
  const zonas = await supabase
    .from("zona_comun")
    .select("id,nombre,permite_estancia_corta,cupos_simultaneos")
    .eq("activa", true);
  zonaCorta = zonas.data!.find((z) => z.permite_estancia_corta)!.id;
  zonaLarga = zonas.data!.find((z) => !z.permite_estancia_corta)?.id ?? "";
  zonaConPuestos =
    zonas.data!.find(
      (z) => z.permite_estancia_corta && (z.cupos_simultaneos ?? 1) > 1,
    )?.id ?? "";
});

afterAll(async () => {
  /*
    Limpia la administración, no el huésped: él **no tiene política de borrado**
    sobre su reserva --solo puede cancelarla, que es lo correcto--, así que
    borrar con su sesión fallaba en silencio y dejaba la franja ocupada. La
    corrida siguiente chocaba con el disparador de cupos y tres casos se ponían
    rojos por una razón que no tenía nada que ver con lo que probaban.
  */
  await salir();
  await entrarComo(ADMIN);
  for (const id of creadas) {
    await supabase.from("reserva_zona").delete().eq("id", id);
  }
  await salir();
});

describe("el huésped reserva una zona", () => {
  it("la crea con acompañantes de una sola llamada", async () => {
    /*
      Lo que hace la pantalla: una sola llamada que escribe la reserva y su
      gente. Si cualquiera de las dos escrituras falla, el recorrido falla, que
      es justo lo que no detectaban las pruebas de politica por separado.
    */
    const id = (await crearReserva({
      zonaId: zonaCorta,
      unidadId: U102,
      fecha: manana(),
      horaInicio: "09:00",
      horaFin: "10:00",
      comentarios: MARCA,
      participantes: [{ nombre: "[prueba] acompañante" }],
    })).id;
    creadas.push(id);
    expect(id).toBeTruthy();

    const gente = await supabase
      .from("participante_reserva")
      .select("nombre")
      .eq("reserva_id", id);
    expect(gente.data).toHaveLength(1);
  });

  it("la lavadora elegida queda anotada, y nadie más la coge a esa hora", async () => {
    /*
      El desplegable «Seleccione N° de Lavanderia» era obligatorio y su valor
      no se guardaba: `reserva_zona` no tenia columna. Dos huespedes podian
      reservar la misma lavadora a la misma hora y presentarse los dos.

      La comprobacion de verdad es esta, no la del desplegable: la pantalla
      deja de ofrecer los numeros cogidos, pero a la API se le puede llamar
      sin pasar por la pantalla.
    */
    // Sin una zona de varios puestos no hay nada que numerar.
    expect(zonaConPuestos, "hace falta una zona con varios puestos").toBeTruthy();

    const primera = await crearReserva({
      zonaId: zonaConPuestos,
      unidadId: U102,
      fecha: manana(),
      horaInicio: "14:00",
      horaFin: "15:00",
      comentarios: MARCA,
      numeroRecurso: 3,
    });
    creadas.push(primera.id);

    const guardada = await supabase
      .from("reserva_zona")
      .select("numero_recurso")
      .eq("id", primera.id)
      .single();
    expect(guardada.data!.numero_recurso).toBe(3);

    // Solapada, mismo numero: la rechaza la base.
    await expect(
      crearReserva({
        zonaId: zonaConPuestos,
        unidadId: U102,
        fecha: manana(),
        horaInicio: "14:30",
        horaFin: "15:30",
        comentarios: MARCA,
        numeroRecurso: 3,
      }),
    ).rejects.toThrow();

    // Control positivo: otra lavadora a la misma hora sí entra. Sin esto, la
    // prueba pasaria igual si lo que fallara fuera cualquier otra cosa de la
    // franja --los cupos, el horario, la zona--.
    const otra = await crearReserva({
      zonaId: zonaConPuestos,
      unidadId: U102,
      fecha: manana(),
      horaInicio: "14:30",
      horaFin: "15:30",
      comentarios: MARCA,
      numeroRecurso: 4,
    });
    creadas.push(otra.id);
    expect(otra.id).toBeTruthy();
  });

  it("y una reserva sin puesto acaba con el primero libre", async () => {
    /*
      Una reserva viva sin `numero_recurso` en una zona de varios puestos deja
      la pantalla contradiciendose: el contador de la grilla cuenta reservas
      --«quedan 2 de 4»-- y el desplegable cuenta numeros ocupados, asi que
      ofrecia tres. Se vio en la franja de las 06:00 de la lavanderia.

      La pantalla no puede arreglarlo: no hay forma de saber que lavadora
      ocupa una fila que no lo dice. Lo arregla la base asignando el primer
      puesto libre, que es lo que haria quien atiende la lavanderia.
    */
    expect(zonaConPuestos, "hace falta una zona con varios puestos").toBeTruthy();

    const primera = await crearReserva({
      zonaId: zonaConPuestos,
      unidadId: U102,
      fecha: manana(),
      horaInicio: "16:00",
      horaFin: "17:00",
      comentarios: MARCA,
      numeroRecurso: 1,
    });
    creadas.push(primera.id);

    // Esta no dice cual quiere. Tiene que salir con el 2: el 1 esta cogido.
    const sinPuesto = await crearReserva({
      zonaId: zonaConPuestos,
      unidadId: U102,
      fecha: manana(),
      horaInicio: "16:00",
      horaFin: "17:00",
      comentarios: MARCA,
    });
    creadas.push(sinPuesto.id);

    const fila = await supabase
      .from("reserva_zona")
      .select("numero_recurso")
      .eq("id", sinPuesto.id)
      .single();
    expect(fila.data!.numero_recurso).toBe(2);
  });

  it("y queda registrado que la pidió él", async () => {
    /*
      `solicitada_por` es quien responde por la reserva. Sin ella no se sabe
      quien pidio el espacio --y la politica del huesped, que exige
      `solicitada_por = auth.uid()`, no volveria a dejarle verla ni
      cancelarla--.
    */
    const fila = await supabase
      .from("reserva_zona")
      .select("solicitada_por,numero")
      .eq("id", creadas[0])
      .single();

    const { data: sesion } = await supabase.auth.getUser();
    expect(fila.data!.solicitada_por).toBe(sesion.user!.id);
    // El numero lo pone la base, no el reloj del telefono.
    expect(fila.data!.numero).toMatch(/^\d{6}$/);
  });

  it("la vuelve a ver en su lista", async () => {
    const reservas = await obtenerReservas({ ambito: "unidad", unidadIds: [U102] });
    expect(reservas.some((r) => r.uuid === creadas[0])).toBe(true);
  });

  it("no reserva una zona que no admite estancia corta", async () => {
    if (!zonaLarga) return;
    await expect(
      crearReserva({
        zonaId: zonaLarga,
        unidadId: U102,
        fecha: manana(),
        horaInicio: "11:00",
        horaFin: "12:00",
        comentarios: MARCA,
      }),
    ).rejects.toThrow();
  });

  it("y un huésped con la estancia vencida no reserva nada", async () => {
    // Control positivo del mismo camino: lo unico distinto es la fecha de la
    // estancia. Sin este caso, el de arriba pasaria igual con la politica
    // abierta de par en par.
    await salir();
    await entrarComo(VENCIDO);
    await expect(
      crearReserva({
        zonaId: zonaCorta,
        unidadId: U102,
        fecha: manana(),
        horaInicio: "13:00",
        horaFin: "14:00",
        comentarios: MARCA,
      }),
    ).rejects.toThrow();
    await salir();
    await entrarComo(HUESPED);
  });

  it("las zonas que ve son las de su condominio", async () => {
    // `obtenerZonas` devuelve las dos formas que consumen las pantallas
    // --`gestion` y `config`--, indexadas por id, no una lista.
    const { gestion, config } = await obtenerZonas();
    expect(Object.keys(gestion).length).toBeGreaterThan(0);
    expect(Object.keys(config)).toEqual(Object.keys(gestion));
  });
});
