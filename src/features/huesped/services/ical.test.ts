import { describe, expect, it } from "vitest";
/*
  Se importa el modulo que de verdad corre en la funcion que sincroniza, no una
  copia. Es el mismo patron que los recorridos del precheckin, que llaman al
  modulo de la web: dos implementaciones del mismo formato divergen en silencio,
  y eso ya paso tres veces en este proyecto.
*/
import {
  codigoDeLaUrl,
  leerCalendario,
} from "../../../../supabase/functions/_compartido/ical";

/**
 * Leer el calendario de Airbnb.
 *
 * Lo que Airbnb publica es poco y hay que sacarle todo: **fechas, el
 * identificador del evento y el código de la reserva, que no viene en ningún
 * campo sino escondido dentro de la URL**.
 *
 * Los casos de aquí no son inventados: son las formas que el formato permite y
 * con las que un calendario real llega —líneas plegadas a los 75 caracteres,
 * saltos escapados, bloqueos mezclados con reservas—. Si alguna falla, lo que
 * se pierde es una estancia que la portería esperaba.
 */

/** Un calendario tal como llega: con CRLF y con la URL partida en dos líneas. */
const CALENDARIO = [
  "BEGIN:VCALENDAR",
  "PRODID:-//Airbnb Inc//Hosting Calendar 0.8.8//EN",
  "VERSION:2.0",
  "CALSCALE:GREGORIAN",
  "BEGIN:VEVENT",
  "DTSTART;VALUE=DATE:20261115",
  "DTEND;VALUE=DATE:20261118",
  "UID:1234abcd@airbnb.com",
  "SUMMARY:Reserved",
  "DESCRIPTION:Reservation URL: https://www.airbnb.com/hosting/reservations",
  " /details/HMABCD1234\\nPhone Number (Last 4 Digits): 2959",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTSTART;VALUE=DATE:20261201",
  "DTEND;VALUE=DATE:20261205",
  "UID:bloqueo-1@airbnb.com",
  "SUMMARY:Airbnb (Not available)",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTSTART;VALUE=DATE:20261220",
  "DTEND;VALUE=DATE:20261227",
  "UID:5678efgh@airbnb.com",
  "SUMMARY:Reserved",
  "DESCRIPTION:Reservation URL: https://www.airbnb.com/hosting/reservations/details/HMZZZZ9999\\nPhone Number (Last 4 Digits): 1040",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

describe("el calendario del alojamiento", () => {
  it("trae las reservas y deja fuera los bloqueos", () => {
    const reservas = leerCalendario(CALENDARIO);

    /*
      Tres eventos, dos reservas. Un bloqueo es un día que el anfitrión cerró a
      mano: importarlo crearía una estancia de un huésped que no existe, y la
      portería estaría esperando a alguien que no va a llegar.
    */
    expect(reservas).toHaveLength(2);
    expect(reservas.map((r) => r.uid)).toEqual([
      "1234abcd@airbnb.com",
      "5678efgh@airbnb.com",
    ]);
  });

  it("saca las fechas de entrada y de salida", () => {
    const [primera] = leerCalendario(CALENDARIO);
    expect(primera.desde).toBe("2026-11-15");
    expect(primera.hasta).toBe("2026-11-18");
  });

  it("saca el código de la reserva aunque la URL venga partida en dos líneas", () => {
    /*
      Este es el caso que importa y el que se rompe solo si nadie lo mira. El
      formato parte las líneas a los 75 caracteres y continúa en la siguiente
      empezando por un espacio. La URL de Airbnb pasa de 75, así que **siempre**
      llega partida, y el código está justo en el trozo de abajo.

      Sin volver a unirlas, el código sale `null` en todas las reservas y el
      anfitrión no puede casar la estancia con su reserva de Airbnb.
    */
    const [primera] = leerCalendario(CALENDARIO);
    expect(primera.codigo).toBe("HMABCD1234");
    expect(primera.url).toBe(
      "https://www.airbnb.com/hosting/reservations/details/HMABCD1234",
    );
  });

  it("y también cuando viene entera", () => {
    const [, segunda] = leerCalendario(CALENDARIO);
    expect(segunda.codigo).toBe("HMZZZZ9999");
  });

  it("no se traga el teléfono como si fuera parte de la URL", () => {
    /*
      La descripción lleva la URL y, pegado detrás con un salto escapado, los
      últimos cuatro dígitos del teléfono. Si el salto no se deshace, el código
      sale con el teléfono dentro.
    */
    const [primera] = leerCalendario(CALENDARIO);
    expect(primera.codigo).not.toContain("2959");
    expect(primera.url).not.toContain("Phone");
  });

  it("un evento sin fechas o sin identificador se salta, y no tumba el resto", () => {
    /*
      Un calendario trae eventos de todo tipo. Que uno venga mal no puede
      impedir importar los otros veinte: la alternativa es que el anfitrión se
      quede sin ninguna reserva por culpa de una.
    */
    const conBasura = CALENDARIO.replace(
      "UID:1234abcd@airbnb.com",
      "X-ALGO:sin identificador",
    );
    const reservas = leerCalendario(conBasura);

    expect(reservas).toHaveLength(1);
    expect(reservas[0].uid).toBe("5678efgh@airbnb.com");
  });

  it("un calendario vacío no es un error", () => {
    expect(leerCalendario("BEGIN:VCALENDAR\r\nEND:VCALENDAR")).toEqual([]);
    expect(leerCalendario("")).toEqual([]);
  });
});

describe("el código que viaja dentro de la URL", () => {
  it("es el último tramo de la ruta", () => {
    expect(
      codigoDeLaUrl("https://www.airbnb.com/hosting/reservations/details/HMXY123"),
    ).toBe("HMXY123");
  });

  it("aguanta la barra final", () => {
    expect(
      codigoDeLaUrl("https://www.airbnb.com/hosting/reservations/details/HMXY123/"),
    ).toBe("HMXY123");
  });

  it("y si el enlace no tiene forma de enlace, devuelve nada en vez de romper", () => {
    /*
      Que Airbnb cambie la forma del enlace es cuestión de tiempo. Cuando pase,
      lo que se pierde es el código --y la URL entera se guarda igual-- en vez
      de caerse la sincronización de todas las reservas.
    */
    expect(codigoDeLaUrl("no soy una url")).toBeNull();
    expect(codigoDeLaUrl(null)).toBeNull();
    expect(codigoDeLaUrl("https://www.airbnb.com/")).toBeNull();
  });
});

describe("los últimos cuatro dígitos del teléfono", () => {
  it("salen de la descripción, con su etiqueta", () => {
    const [primera] = leerCalendario(
      [
        "BEGIN:VEVENT",
        "DTSTART;VALUE=DATE:20261115",
        "DTEND;VALUE=DATE:20261118",
        "UID:con-telefono@airbnb.com",
        "SUMMARY:Reserved",
        "DESCRIPTION:Reservation URL: https://www.airbnb.com/hosting/reservations",
        " /details/HMABCD1234\\nPhone Number (Last 4 Digits): 2959",
        "END:VEVENT",
      ].join("\r\n"),
    );
    expect(primera.ultimos4).toBe("2959");
    // Y el código sigue saliendo: la línea viene partida en dos.
    expect(primera.codigo).toBe("HMABCD1234");
  });

  it("y si no vienen, no se inventan con otros números de la descripción", () => {
    /*
      La URL lleva dígitos de sobra. Cuatro cualesquiera darían un dato falso
      con aspecto de bueno, y con él se le negaría la entrada al huésped de
      verdad.
    */
    const [sin] = leerCalendario(
      [
        "BEGIN:VEVENT",
        "DTSTART;VALUE=DATE:20261115",
        "DTEND;VALUE=DATE:20261118",
        "UID:sin-telefono@booking.com",
        "SUMMARY:CLOSED - Booked 12345678",
        "DESCRIPTION:https://admin.booking.com/reserva/9876543210",
        "END:VEVENT",
      ].join("\r\n"),
    );
    expect(sin.ultimos4).toBeNull();
  });
});
