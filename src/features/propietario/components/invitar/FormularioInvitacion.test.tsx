import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";

/**
 * Invitar a alguien a la vivienda (17/11/2026, plan aprobado por el cliente):
 *
 *   · el desplegable ofrece inquilino líder, residente y anfitrión --sin
 *     corresidente--, y el anfitrión solo al dueño;
 *   · un residente que no usará la app («¿Usará la app?» → No) se anota sin
 *     correo.
 *
 * El hook trae la sesión y la base; aquí solo importa su lista pura y la
 * forma del formulario.
 */

vi.mock("@/stores", () => ({}));
vi.mock("@/shared/hooks", () => ({}));
vi.mock("@/shared/services/supabase", () => ({ supabase: {} }));
vi.mock("../../services/invitacionesUnidad.repo", () => ({}));
vi.mock("../../hooks/usePropietarioConfiguracion", () => ({ RESIDENTES_UNIDAD_KEY: [] }));

const { rolesQuePuedeInvitar, seAnotaSinApp } = await import("../../hooks/useInvitarAUnidad");
const { FormularioInvitacion } = await import("./FormularioInvitacion");
type Valores = import("../../hooks/useInvitarAUnidad").FormularioInvitacion;

const VACIO: Valores = {
  nombre: "",
  correo: "",
  rol: "residente",
  vigenteDesde: "",
  vigenteHasta: "",
  usaApp: true,
  tipoDocumento: "",
  documento: "",
  esMenor: false,
};

function Montado() {
  const [form, setForm] = useState<Valores>(VACIO);
  return (
    <FormularioInvitacion
      form={form}
      rolesInvitables={rolesQuePuedeInvitar({ esDueno: true, esAdministracion: false })}
      esHuesped={false}
      sinApp={seAnotaSinApp(form)}
      documentosOfrecidos={[{ value: "tarjeta_identidad", label: "Tarjeta de identidad" }]}
      error={null}
      invitando={false}
      onChange={setForm}
      onEnviar={() => {}}
    />
  );
}

describe("el desplegable de invitar", () => {
  // Desde el 18/11/2026 el dueño invita también al copropietario.
  it("al dueño le ofrece inquilino líder, residente, anfitrión y copropietario", () => {
    expect(rolesQuePuedeInvitar({ esDueno: true, esAdministracion: false }).map((r) => r.label)).toEqual([
      "Inquilino líder",
      "Residente",
      "Anfitrión",
      "Copropietario",
    ]);
  });

  // Y el inquilino líder solo invita residentes (18/11/2026).
  it("al inquilino líder solo le ofrece residente", () => {
    expect(rolesQuePuedeInvitar({ esDueno: false, esAdministracion: false }).map((r) => r.label)).toEqual([
      "Residente",
    ]);
  });
});

describe("¿Usará la app?", () => {
  it("con «Sí» pide el correo y envía una invitación", () => {
    render(<Montado />);
    expect(screen.getByText("¿Usará la app?")).toBeDefined();
    expect(screen.getByText("Correo")).toBeDefined();
    expect(screen.getByText("Enviar invitación")).toBeDefined();
  });

  it("con «No» no pide correo: nombre y documento opcional", () => {
    render(<Montado />);
    fireEvent.click(screen.getByText("No"));
    expect(screen.queryByText("Correo")).toBeNull();
    expect(screen.getByText("Tipo de documento (opcional)")).toBeDefined();
    expect(screen.getByText("Agregar a la vivienda")).toBeDefined();
  });
});

describe("un menor de edad no tiene cuenta (17/11/2026)", () => {
  it("marcar «Es menor de edad» quita «¿Usará la app?» y el correo, y lo anota sin invitación", () => {
    render(<Montado />);
    expect(screen.getByText("Correo")).toBeDefined();
    fireEvent.click(screen.getByText("Es menor de edad"));
    expect(screen.queryByText("¿Usará la app?")).toBeNull();
    expect(screen.queryByText("Correo")).toBeNull();
    expect(screen.queryByText("Enviar invitación")).toBeNull();
    expect(screen.getByText("Agregar a la vivienda")).toBeDefined();
  });

  it("no se pide fecha de nacimiento", () => {
    render(<Montado />);
    fireEvent.click(screen.getByText("Es menor de edad"));
    expect(screen.queryByText(/nacimiento/i)).toBeNull();
  });

  it("un menor se anota sin app aunque la pestaña dijera «Sí»; un adulto elige", () => {
    expect(seAnotaSinApp({ rol: "residente", usaApp: true, esMenor: true })).toBe(true);
    expect(seAnotaSinApp({ rol: "residente", usaApp: true, esMenor: false })).toBe(false);
    expect(seAnotaSinApp({ rol: "residente", usaApp: false, esMenor: false })).toBe(true);
    expect(seAnotaSinApp({ rol: "inquilino_lider", usaApp: true, esMenor: false })).toBe(false);
  });
});
