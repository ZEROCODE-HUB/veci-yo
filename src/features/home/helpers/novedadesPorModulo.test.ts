import { describe, expect, it } from "vitest";
import { novedadesPorModulo } from "./novedadesPorModulo";

/** Los globitos del menú (18/11/2026): avisos sin leer por módulo. */
describe("las novedades de cada módulo", () => {
  it("cuenta los sin leer de cada módulo, y no los leídos ni los de otra cosa", () => {
    expect(
      novedadesPorModulo([
        { tipo: "anuncio_publicado", leida: false },
        { tipo: "anuncio_publicado", leida: true },
        { tipo: "reserva_aprobada", leida: false },
        { tipo: "reserva_rechazada", leida: false },
        { tipo: "mensaje_de_chat", leida: false },
      ]),
    ).toEqual({ anuncios: 1, "zonas-comunes": 2 });
  });
});
