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

const { rolesQuePuedeInvitar } = await import("../../hooks/useInvitarAUnidad");
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
      sinApp={form.rol === "residente" && !form.usaApp}
      documentosOfrecidos={[{ value: "tarjeta_identidad", label: "Tarjeta de identidad" }]}
      error={null}
      invitando={false}
      onChange={setForm}
      onEnviar={() => {}}
    />
  );
}

describe("el desplegable de invitar", () => {
  it("al dueño le ofrece inquilino líder, residente y anfitrión", () => {
    expect(rolesQuePuedeInvitar({ esDueno: true, esAdministracion: false }).map((r) => r.label)).toEqual([
      "Inquilino líder",
      "Residente",
      "Anfitrión",
    ]);
  });

  it("al inquilino líder no le ofrece anfitrión: atiende la renta corta del dueño", () => {
    expect(rolesQuePuedeInvitar({ esDueno: false, esAdministracion: false }).map((r) => r.label)).toEqual([
      "Inquilino líder",
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

  it("con «No» no pide correo: nombre, documento opcional y si es menor", () => {
    render(<Montado />);
    fireEvent.click(screen.getByText("No"));
    expect(screen.queryByText("Correo")).toBeNull();
    expect(screen.getByText("Tipo de documento (opcional)")).toBeDefined();
    expect(screen.getByText("Es menor de edad")).toBeDefined();
    expect(screen.getByText("Agregar a la vivienda")).toBeDefined();
  });
});
