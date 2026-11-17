import { describe, expect, it } from "vitest";
import {
  nombreParaGuardar,
  nombreVisibleDelReglamento,
  tipoDeDocumento,
} from "./archivoDelReglamento";

describe("el archivo del reglamento", () => {
  it("distingue PDF y Word por la extensión de la ruta", () => {
    expect(tipoDeDocumento("cond/123-abc.pdf").clase).toBe("pdf");
    expect(tipoDeDocumento("cond/123-abc.DOCX").clase).toBe("word");
    expect(tipoDeDocumento("cond/123-abc.doc").mime).toBe("application/msword");
    expect(tipoDeDocumento("cond/123-abc").clase).toBe("otro");
  });

  it("enseña el nombre con que se subió, no el generado del depósito", () => {
    expect(nombreVisibleDelReglamento("cond/1794934218042-b1sow81762r.pdf", "Reglamento interno 2026.pdf")).toBe(
      "Reglamento interno 2026.pdf",
    );
  });

  it("sin nombre guardado (subidas viejas) dice qué es en vez de la cadena aleatoria", () => {
    expect(nombreVisibleDelReglamento("cond/1794934218042-b1sow81762r.pdf", null)).toBe("Reglamento (PDF)");
    expect(nombreVisibleDelReglamento("cond/x.docx", "  ")).toBe("Reglamento (Word)");
    expect(nombreVisibleDelReglamento("cond/x", undefined)).toBe("Reglamento");
  });

  it("el nombre para guardarlo en el celular no lleva barras y conserva la extensión real", () => {
    expect(nombreParaGuardar("cond/x.pdf", "Normas/2026: edificio.pdf")).toBe("Normas 2026 edificio.pdf");
    expect(nombreParaGuardar("cond/x.docx", "Reglamento")).toBe("Reglamento.docx");
    expect(nombreParaGuardar("cond/x.pdf", null)).toBe("Reglamento (PDF).pdf");
  });
});
