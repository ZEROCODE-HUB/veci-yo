import { describe, expect, it } from "vitest";
import { fueraDeLaFranja } from "./fueraDeLaFranja";

/**
 * El aviso que recibe la portería al marcar la llegada de un huésped.
 *
 * El horario de check-in se configuraba por vivienda y no lo miraba nadie.
 * Decidido con el cliente el 01/10/2026: se avisa, no se bloquea. Es el mismo
 * criterio que ya fijó para el aforo.
 */
describe("si una llegada cae fuera del horario de check-in", () => {
  it("antes de la franja, sí", () => {
    expect(fueraDeLaFranja("09:30", "14:00", "20:00")).toBe(true);
  });

  it("después, también", () => {
    expect(fueraDeLaFranja("23:10", "14:00", "20:00")).toBe(true);
  });

  it("dentro, no", () => {
    expect(fueraDeLaFranja("15:45", "14:00", "20:00")).toBe(false);
  });

  it("los dos bordes están dentro", () => {
    // Quien llega a las 14:00 llega a la hora, y quien llega a las 20:00 llega
    // justo. Avisar en el borde sería avisar a quien cumplió.
    expect(fueraDeLaFranja("14:00", "14:00", "20:00")).toBe(false);
    expect(fueraDeLaFranja("20:00", "14:00", "20:00")).toBe(false);
  });

  it("una franja que cruza la medianoche se mide al revés", () => {
    /*
      De 22:00 a 06:00 es continua por fuera. Sin este caso, una llegada a las
      23:00 contaría como fuera de hora por comparar con «< 22:00 o > 06:00».
      El formulario de hoy no ofrece esa franja, pero las dos columnas son
      `time` sueltas y la base la admite.
    */
    expect(fueraDeLaFranja("23:00", "22:00", "06:00")).toBe(false);
    expect(fueraDeLaFranja("02:00", "22:00", "06:00")).toBe(false);
    expect(fueraDeLaFranja("12:00", "22:00", "06:00")).toBe(true);
  });

  it("sin franja decidida no se avisa de nada", () => {
    expect(fueraDeLaFranja("09:30", null, null)).toBe(false);
    expect(fueraDeLaFranja("09:30", "14:00", null)).toBe(false);
    expect(fueraDeLaFranja("09:30", null, "20:00")).toBe(false);
    // Dos horas iguales no delimitan nada.
    expect(fueraDeLaFranja("09:30", "14:00", "14:00")).toBe(false);
  });

  it("y con una hora que no es una hora, tampoco", () => {
    // Antes de avisarle a nadie, que el dato sea un dato.
    expect(fueraDeLaFranja("", "14:00", "20:00")).toBe(false);
    expect(fueraDeLaFranja("ahora", "14:00", "20:00")).toBe(false);
  });

  it("los segundos de Postgres no estorban", () => {
    // `time` llega como `HH:mm:ss` por un lado y la pantalla da `HH:mm` por el
    // otro. Se comparan los cinco primeros caracteres y se acabó.
    expect(fueraDeLaFranja("09:30:00", "14:00:00", "20:00:00")).toBe(true);
    expect(fueraDeLaFranja("15:45:00", "14:00:00", "20:00:00")).toBe(false);
  });
});
