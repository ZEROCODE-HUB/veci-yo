import { describe, expect, it } from "vitest";
import { bloqueoDeLlegada, type PersonaEnPuerta } from "./bloqueoDeLlegada";

const adulto: PersonaEnPuerta = { uuid: "a", nombre: "Ana" };
const nino: PersonaEnPuerta = {
  uuid: "n",
  nombre: "Nico",
  esMenor: true,
  responsableId: "a",
};

const estancia = (
  persona: PersonaEnPuerta,
  tieneDocumento: boolean,
  grupo: PersonaEnPuerta[] = [persona],
) =>
  bloqueoDeLlegada({
    esEstancia: true,
    exigeDocumento: false,
    persona,
    tieneDocumento,
    grupo,
  });

const visita = (exigeDocumento: boolean, persona: PersonaEnPuerta, doc = true) =>
  bloqueoDeLlegada({
    esEstancia: false,
    exigeDocumento,
    persona,
    tieneDocumento: doc,
    grupo: [persona],
  });

describe("quién no puede entrar todavía", () => {
  it("en una estancia, el adulto sin verificar", () => {
    expect(estancia(adulto, true)?.seVerificaAqui).toBe(true);
    expect(estancia({ ...adulto, ciVerificado: true }, true)).toBeNull();
  });

  it("y el adulto sin documento no entra, ni tiene qué verificar", () => {
    const bloqueo = estancia(adulto, false);
    expect(bloqueo?.motivo).toMatch(/completar su registro/);
    expect(bloqueo?.seVerificaAqui).toBe(false);
  });

  it("el niño entra cuando está verificado su adulto y la portería lo confirmó", () => {
    expect(estancia(nino, false, [adulto, nino])?.motivo).toMatch(/Ana/);
    const verificado = { ...adulto, ciVerificado: true };
    // Con su adulto verificado, falta que la portería lo mire (14/10/2026).
    expect(estancia(nino, false, [verificado, nino])?.confirmarMenor).toBe(true);
    const confirmado = { ...nino, revisionMenor: "se_parece" as const };
    expect(estancia(confirmado, false, [verificado, confirmado])).toBeNull();
  });

  it("si no se parece y hay que avisar, espera al anfitrión; si lo aprobó, entra", () => {
    const verificado = { ...adulto, ciVerificado: true };
    const enDuda = { ...nino, revisionMenor: "no_se_parece_revisar" as const };
    expect(estancia(enDuda, false, [verificado, enDuda])?.motivo).toMatch(/anfitrión/);
    const aprobado = { ...enDuda, verificacion: "aprobada_manual" };
    expect(estancia(aprobado, false, [verificado, aprobado])).toBeNull();
    const seguro = { ...nino, revisionMenor: "no_se_parece_seguro" as const };
    expect(estancia(seguro, false, [verificado, seguro])).toBeNull();
  });

  it("y sin adulto responsable no entra", () => {
    expect(
      estancia({ ...nino, responsableId: undefined }, false)?.motivo,
    ).toMatch(/adulto responsable/);
  });

  it("en una visita corriente lo decide el edificio", () => {
    expect(visita(true, adulto)?.seVerificaAqui).toBe(true);
    expect(visita(false, adulto)).toBeNull();
    // Sin documento declarado no hay con qué comparar: entra.
    expect(visita(true, adulto, false)).toBeNull();
    expect(visita(true, { ...adulto, ciVerificado: true })).toBeNull();
  });

  it("quien ya entró no está bloqueado: hay que poder darle salida", () => {
    expect(estancia({ ...adulto, llego: true }, false)).toBeNull();
  });
});
