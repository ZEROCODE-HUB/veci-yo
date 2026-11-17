import { describe, expect, it } from "vitest";
import {
  MOTIVO_ALQUILER,
  MOTIVO_INQUILINO_LIDER,
  porQueNoPuedeSerResidente,
} from "./porQueNoPuedeSerResidente";

const LIBRE = {
  esResidente: false,
  viviendaEnAlquiler: false,
  anfitrionPrimario: false,
  rentaCortaEnMarcha: false,
  hayInquilinoLider: false,
};

describe("¿puede el propietario declararse residente?", () => {
  it("sin alquiler ni inquilino líder, sí", () => {
    expect(porQueNoPuedeSerResidente(LIBRE)).toBeNull();
  });

  it("con un inquilino líder activo, no: primero lo quita", () => {
    expect(porQueNoPuedeSerResidente({ ...LIBRE, hayInquilinoLider: true })).toBe(MOTIVO_INQUILINO_LIDER);
  });

  it("con la vivienda en alquiler por noches, no", () => {
    expect(porQueNoPuedeSerResidente({ ...LIBRE, viviendaEnAlquiler: true })).toBe(MOTIVO_ALQUILER);
    expect(
      porQueNoPuedeSerResidente({ ...LIBRE, anfitrionPrimario: true, rentaCortaEnMarcha: true }),
    ).toBe(MOTIVO_ALQUILER);
  });

  it("quien ya es residente siempre puede dejar de serlo", () => {
    expect(porQueNoPuedeSerResidente({ ...LIBRE, esResidente: true, hayInquilinoLider: true })).toBeNull();
  });
});
