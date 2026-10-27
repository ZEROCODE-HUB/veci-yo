import { describe, expect, it } from "vitest";
import { horarioRecortado } from "./horarioRecortado";

const EDIFICIO = { desde: "08:00", hasta: "22:00" };

describe("horarioRecortado", () => {
  it("dentro del horario del edificio no dice nada", () => {
    expect(horarioRecortado({ desde: "15:00", hasta: "20:00", todoElDia: false }, EDIFICIO)).toBeNull();
  });

  it("si se sale por un lado, dice cómo queda", () => {
    expect(horarioRecortado({ desde: "15:00", hasta: "23:30", todoElDia: false }, EDIFICIO)).toBe(
      "El edificio solo deja entrar de 08:00 a 22:00, así que tus huéspedes podrán llegar de 15:00 a 22:00.",
    );
  });

  it("a cualquier hora queda en el horario del edificio", () => {
    expect(horarioRecortado({ desde: "", hasta: "", todoElDia: true }, EDIFICIO)).toMatch(
      /podrán llegar de 08:00 a 22:00/,
    );
  });

  it("si cae entero fuera, vale el del edificio", () => {
    expect(horarioRecortado({ desde: "23:00", hasta: "23:50", todoElDia: false }, EDIFICIO)).toMatch(
      /podrán llegar de 08:00 a 22:00/,
    );
  });

  it("sin límite del edificio no hay nada que recortar", () => {
    expect(horarioRecortado({ desde: "", hasta: "", todoElDia: true }, { desde: "", hasta: "" })).toBeNull();
  });
});
