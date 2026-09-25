import { describe, expect, it, vi } from "vitest";

vi.mock("@/shared/services/supabase", () => ({ supabase: {} }));
vi.mock("@/shared/utils", () => ({ formatDate: (d: Date) => d.toISOString() }));

const { franjas } = await import("./zonas.repo");

/**
 * Las franjas horarias de una zona común.
 *
 * El prototipo las traía fijas por zona. Al quitar ese mock quedaron en `[]` y
 * el selector de horas de la reserva no ofrecía nada: se generan a partir del
 * horario de la zona y de su duración máxima.
 */

describe("franjas", () => {
  it("parte el horario en tramos de la duración máxima", () => {
    // La piscina del condominio de prueba: 08:00 a 20:00, 120 minutos.
    expect(franjas("08:00:00", "20:00:00", 120)).toEqual([
      "08:00 - 10:00",
      "10:00 - 12:00",
      "12:00 - 14:00",
      "14:00 - 16:00",
      "16:00 - 18:00",
      "18:00 - 20:00",
    ]);
  });

  it("no pasa del horario de cierre", () => {
    // De 08:00 a 13:00 con tramos de 2 h entran dos, no dos y media.
    expect(franjas("08:00:00", "13:00:00", 120)).toEqual([
      "08:00 - 10:00",
      "10:00 - 12:00",
    ]);
  });

  it("respeta los tramos de una hora", () => {
    expect(franjas("06:00:00", "09:00:00", 60)).toEqual([
      "06:00 - 07:00",
      "07:00 - 08:00",
      "08:00 - 09:00",
    ]);
  });

  it("sin duración configurada usa tramos de dos horas", () => {
    expect(franjas("10:00:00", "14:00:00", null)).toEqual([
      "10:00 - 12:00",
      "12:00 - 14:00",
    ]);
  });

  it("sin horario no inventa franjas", () => {
    expect(franjas(null, "20:00:00", 120)).toEqual([]);
    expect(franjas("08:00:00", null, 120)).toEqual([]);
  });

  it("devuelve vacío si el cierre no es posterior a la apertura", () => {
    expect(franjas("20:00:00", "08:00:00", 120)).toEqual([]);
  });

  it("devuelve vacío si no cabe ni un tramo completo", () => {
    // Una zona abierta una hora no admite reservas de dos.
    expect(franjas("08:00:00", "09:00:00", 120)).toEqual([]);
  });
});

/**
 * La grilla y el desplegable tienen que hablar de las mismas horas.
 *
 * Se separaron sin que nadie lo notara: la grilla de la pantalla de la zona
 * se generaba con `mediasHoras` --cada media hora-- y el desplegable del
 * formulario con `franjas` --cada duración, o sea cada hora en la
 * lavandería--. Pulsar «+ Reservar» en una fila de :30 abría el formulario
 * con la hora **en blanco**, porque el valor que llegaba no empezaba como
 * ninguna de las opciones. La mitad de las filas no se podían llevar su hora.
 *
 * Lo encontró el cliente pulsando el 07:30 y preguntando por qué le pedían la
 * hora otra vez.
 */
describe("la grilla y el desplegable ofrecen las mismas horas", () => {
  /** Lo mismo que `mediasHoras` de `useZonaDetalles`, sin montar el hook. */
  const inicios = (apertura: string, cierre: string) => {
    const aMin = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
    const salida: string[] = [];
    for (let m = aMin(apertura); m < aMin(cierre); m += 30) {
      salida.push(
        `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`,
      );
    }
    return salida;
  };

  it("cada media hora de la grilla existe en el desplegable, salvo las que no caben", () => {
    // La lavandería del condominio de prueba: 06:00 a 22:00, una hora.
    const opciones = franjas("06:00:00", "22:00:00", 60, 30);
    const empiezan = new Set(opciones.map((o) => o.slice(0, 5)));

    const sinSitio: string[] = [];
    for (const hora of inicios("06:00", "22:00")) {
      if (!empiezan.has(hora)) sinSitio.push(hora);
    }

    /*
      La unica que puede faltar es la ultima media hora: a las 21:30 no cabe
      una reserva de una hora antes de cerrar. Que la grilla la ofrezca igual
      esta en REVISAR-A-OJO; lo que no puede pasar es que falten las demas.
    */
    expect(sinSitio).toEqual(["21:30"]);
  });

  it("y el 07:30 que se pulsa es el 07:30 que se reserva", () => {
    const opciones = franjas("06:00:00", "22:00:00", 60, 30);
    expect(opciones).toContain("07:30 - 08:30");
    // Que es lo que el formulario busca: una opcion que empiece por la hora
    // que llega de la grilla.
    expect(opciones.find((o) => o.startsWith("07:30"))).toBe("07:30 - 08:30");
  });

  it("sin paso explícito se comporta como antes: franjas pegadas", () => {
    // Las otras llamadas no pasan `pasoMin` y no deben cambiar.
    expect(franjas("08:00:00", "12:00:00", 120)).toEqual([
      "08:00 - 10:00",
      "10:00 - 12:00",
    ]);
  });
});
