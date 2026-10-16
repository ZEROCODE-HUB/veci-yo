import { describe, expect, it } from "vitest";
import type { Invitado, VisitaItem } from "@/shared/types";
import { estadoParaPorteria } from "./estadoParaPorteria";

const persona = (p: Partial<Invitado> = {}): Invitado =>
  ({ nombre: "Ana", llego: false, timeline: {}, ...p }) as Invitado;
const estancia = (invitados: Invitado[]): VisitaItem =>
  ({ id: 1, invitados } as unknown as VisitaItem);

const cerrado = { precheckinCerrado: true, terminosAceptados: true };

describe("lo que ve la portería de una estancia", () => {
  it("completa cuando el preregistro cerró y nada espera", () => {
    expect(estadoParaPorteria(estancia([persona({ timeline: cerrado })])).texto).toBe(
      "Preregistro completo",
    );
  });

  it("dice que falta el anfitrión, sin decir por qué", () => {
    const e = estadoParaPorteria(
      estancia([persona({ timeline: cerrado, verificacion: "revision", motivoRevision: "hallazgo" })]),
    );
    expect(e.texto).toBe("Falta aprobación del anfitrión");
    expect(e.texto).not.toMatch(/hallazgo|antecedente/i);
  });

  it("aunque la portería no pueda leer la consulta: lo dice la base", () => {
    const e = estancia([persona({ timeline: cerrado })]);
    e.esperaAlAnfitrion = true;
    expect(estadoParaPorteria(e).texto).toBe("Falta aprobación del anfitrión");
  });

  it("un menor por revisar también espera al anfitrión", () => {
    expect(
      estadoParaPorteria(
        estancia([persona({ timeline: cerrado, revisionMenor: "no_se_parece_revisar" })]),
      ).texto,
    ).toBe("Falta aprobación del anfitrión");
  });

  it("el no del anfitrión gana a todo", () => {
    expect(
      estadoParaPorteria(
        estancia([persona({ verificacion: "rechazada" }), persona({ verificacion: "revision" })]),
      ).tono,
    ).toBe("mal");
  });

  it("sin cerrar: dice si faltan los términos", () => {
    expect(estadoParaPorteria(estancia([persona()])).texto).toMatch(/términos/);
    expect(
      estadoParaPorteria(estancia([persona({ timeline: { terminosAceptados: true } })])).texto,
    ).toBe("Incompleto · preregistro sin terminar");
  });

  it("los términos de un menor no los acepta él", () => {
    expect(
      estadoParaPorteria(
        estancia([persona({ timeline: { terminosAceptados: true } }), persona({ esMenor: true })]),
      ).texto,
    ).toBe("Incompleto · preregistro sin terminar");
  });
});
