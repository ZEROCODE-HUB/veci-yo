import { describe, expect, it } from "vitest";
import { ordenDeContactacion } from "./ordenDeContactacion";
import type { ContactoDeLaVivienda } from "../services/contactos.repo";

const persona = (p: Partial<ContactoDeLaVivienda>): ContactoDeLaVivienda => ({
  membresiaId: p.nombre ?? "x",
  nombre: "x",
  rol: "residente",
  esAnfitrionPrimario: false,
  esAdminPrimario: false,
  codigoPais: "CO",
  telefono: "3001112233",
  whatsapp: false,
  chat: false,
  emergencia: null,
  alterno: null,
  recibeLlamadasApp: false,
  tieneCuenta: true,
  ...p,
});

describe("orden de contactación (Correcciones fila 8)", () => {
  it("1 huésped temporal, 2 anfitrión primario, 3 su contacto de emergencia, después el resto", () => {
    const tarjetas = ordenDeContactacion([
      persona({ nombre: "Ana", rol: "propietario" }),
      persona({
        nombre: "Luis",
        rol: "residente",
        esAnfitrionPrimario: true,
        emergencia: { nombre: "Marta", codigoPais: "CO", telefono: "3009998877" },
      }),
      persona({ nombre: "Diego", rol: "huesped_temporal" }),
    ]);
    expect(
      tarjetas.map((t) => [t.orden, t.tipo === "persona" ? t.persona.nombre : t.emergencia.nombre, t.papel]),
    ).toEqual([
      [1, "Diego", "Huésped temporal"],
      [2, "Luis", "Anfitrión primario · Residente"],
      [3, "Marta", "Contacto de emergencia del anfitrión"],
      [4, "Ana", "Propietario"],
    ]);
  });

  it("sin anfitrión primario, el resto sigue al huésped, cada uno con su emergencia detrás", () => {
    const tarjetas = ordenDeContactacion([
      persona({
        nombre: "Ana",
        rol: "propietario",
        emergencia: { nombre: "Pedro", codigoPais: "CO", telefono: "1" },
      }),
      persona({ nombre: "Bea", rol: "residente" }),
    ]);
    expect(tarjetas.map((t) => t.papel)).toEqual([
      "Propietario",
      "Contacto de emergencia de Ana",
      "Residente",
    ]);
  });

  it("sin nadie, ninguna tarjeta", () => {
    expect(ordenDeContactacion([])).toEqual([]);
  });
});
