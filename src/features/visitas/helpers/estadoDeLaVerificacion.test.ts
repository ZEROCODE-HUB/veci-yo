import { describe, expect, it } from "vitest";
import {
  estadoDeLaVerificacion,
  motivoDeRevision,
  verificacionSuperada,
  type DatosDeVerificacion,
} from "./estadoDeLaVerificacion";

const base: DatosDeVerificacion = {
  esMenor: false,
  resultado: null,
  incapacidadDeclarada: false,
  revision: null,
};

describe("estadoDeLaVerificacion", () => {
  it("sin fila todavía no se ha consultado", () => {
    expect(estadoDeLaVerificacion(base)).toBe("sin_iniciar");
  });

  it("pendiente es que está en curso, y limpia es aprobada", () => {
    expect(estadoDeLaVerificacion({ ...base, resultado: "pendiente" })).toBe("en_curso");
    expect(estadoDeLaVerificacion({ ...base, resultado: "aprobada" })).toBe("aprobada");
  });

  it("un hallazgo alto requiere aprobación manual, y no cuenta como superada", () => {
    const d = { ...base, resultado: "rechazada" };
    expect(motivoDeRevision(d)).toBe("hallazgo");
    expect(estadoDeLaVerificacion(d)).toBe("revision");
    expect(verificacionSuperada(estadoDeLaVerificacion(d))).toBe(false);
  });

  it("una consulta imposible también la pide", () => {
    expect(motivoDeRevision({ ...base, resultado: "error_proveedor" })).toBe("sin_consulta");
  });

  it("la incapacidad declarada la pide aunque el informe salga limpio", () => {
    const d = { ...base, resultado: "aprobada", incapacidadDeclarada: true };
    expect(motivoDeRevision(d)).toBe("incapacidad");
    expect(estadoDeLaVerificacion(d)).toBe("revision");
  });

  it("lo que decide el anfitrión manda", () => {
    const d = { ...base, resultado: "rechazada" };
    expect(estadoDeLaVerificacion({ ...d, revision: "aprobada" })).toBe("aprobada_manual");
    expect(verificacionSuperada("aprobada_manual")).toBe(true);
    expect(estadoDeLaVerificacion({ ...d, revision: "rechazada" })).toBe("rechazada");
  });

  it("a un menor no se le pide por el informe, sí si la portería dudó", () => {
    expect(motivoDeRevision({ ...base, esMenor: true, resultado: "rechazada" })).toBeNull();
    expect(motivoDeRevision({ ...base, esMenor: true, revisionMenor: "se_parece" })).toBeNull();
    expect(
      motivoDeRevision({ ...base, esMenor: true, revisionMenor: "no_se_parece_revisar" }),
    ).toBe("menor");
  });
});
