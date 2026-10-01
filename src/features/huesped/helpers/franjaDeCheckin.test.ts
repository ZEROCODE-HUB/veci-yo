import { describe, expect, it } from "vitest";
import { franjaDeCheckin } from "./franjaDeCheckin";

/**
 * El horario de check-in que lee el huésped.
 *
 * La administración lo configuraba y no llegaba a ninguna pantalla: ni la base
 * lo imponía ni nadie lo enseñaba. Decidido con el cliente el 01/10/2026 que se
 * enseña.
 */
describe("la franja de check-in", () => {
  it("se dice con sus dos horas", () => {
    expect(franjaDeCheckin("14:00", "20:00")).toBe("De 14:00 a 20:00");
  });

  it("el día entero se dice con palabras", () => {
    /*
      «24 horas» era una de las tres opciones del prototipo y no es un rango.
      «De 00:00 a 23:59» no significa nada para quien lo lee: significa que
      puede llegar cuando quiera, y eso es lo que tiene que poner.
    */
    expect(franjaDeCheckin("00:00", "23:59")).toBe("A cualquier hora");
    expect(franjaDeCheckin("00:00", "24:00")).toBe("A cualquier hora");
  });

  it("sin horario decidido no se promete nada", () => {
    // Nulo es «nadie lo ha puesto». Inventar una franja sería peor que callar.
    expect(franjaDeCheckin(null, null)).toBeNull();
    expect(franjaDeCheckin("14:00", null)).toBeNull();
    expect(franjaDeCheckin(null, "20:00")).toBeNull();
    expect(franjaDeCheckin("", "")).toBeNull();
  });

  it("una franja que empieza y acaba igual tampoco es una franja", () => {
    // El formulario no lo ofrece, pero la base lo admite: dos columnas `time`
    // sueltas, sin nada que las relacione.
    expect(franjaDeCheckin("14:00", "14:00")).toBeNull();
  });
});
