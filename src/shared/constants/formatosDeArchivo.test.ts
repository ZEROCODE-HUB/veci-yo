import { describe, expect, it } from "vitest";
import { FORMATOS_DE_RESPALDO, formatoDeLaFila } from "./formatosDeArchivo";

describe("qué archivos acepta cada sitio (29/10/2026)", () => {
  it("manda la fila de la base", () => {
    expect(
      formatoDeLaFila("foto_zona", { tipos_mime: ["image/png"], extensiones: "Solo PNG" }),
    ).toEqual({ tiposMime: ["image/png"], extensiones: "Solo PNG" });
  });

  it("sin fila, o con una que no se entiende, el de siempre", () => {
    expect(formatoDeLaFila("reglamento", undefined)).toEqual(FORMATOS_DE_RESPALDO.reglamento);
    expect(formatoDeLaFila("foto_zona", { tipos_mime: [] })).toEqual(FORMATOS_DE_RESPALDO.foto_zona);
    expect(formatoDeLaFila("foto_zona", { tipos_mime: [3] })).toEqual(FORMATOS_DE_RESPALDO.foto_zona);
  });

  it("con tipos nuevos y sin frase, la frase sale de los tipos y no de la vieja", () => {
    expect(formatoDeLaFila("foto_zona", { tipos_mime: ["image/png", "image/heic"] }).extensiones).toBe(
      "PNG, HEIC",
    );
  });
});
