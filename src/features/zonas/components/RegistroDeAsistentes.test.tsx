import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RegistroDeAsistentes } from "./RegistroDeAsistentes";
import type { ReservaZona } from "@/shared/types";

/**
 * El «Registro de asistentes» de la portería (maqueta `ZonaDetallesPage`).
 *
 * Lo que importa es lo que viaja al guardar: quien salió sigue en la lista
 * --es constancia de que estuvo-- y su reemplazo llega como fila nueva, sin
 * `uuid`, que es lo que el repositorio usa para saber que tiene que crearla.
 */
const reserva = {
  id: 1,
  uuid: "r1",
  zonaId: "z1",
  depto: "Torre 1 · 102",
  solicitante: "Sofía",
  nombre: "Piscina",
  acompanantes: 1,
  reservaNum: "1234",
  horario: "18:00 - 20:00",
  estado: "Aprobado",
  personas: [
    { uuid: "p1", nombre: "Sofía", llego: true, tipoParticipante: "Residente" },
    { uuid: "p2", nombre: "Elena", llego: false, tipoParticipante: "Visitante" },
  ],
} as unknown as ReservaZona;

describe("el registro de asistentes", () => {
  it("marca que alguien salió, anota su reemplazo y guarda los dos", async () => {
    const onGuardar = vi.fn().mockResolvedValue(undefined);
    render(<RegistroDeAsistentes reserva={reserva} guardando={false} onGuardar={onGuardar} />);

    expect(screen.getByText("Total personas: 2")).toBeDefined();
    // Sin «Salió», no hay dónde anotar un reemplazo.
    expect(screen.queryByPlaceholderText("Nombre del reemplazo")).toBeNull();

    await userEvent.click(screen.getByRole("radio", { name: "Elena: Salió" }));
    expect(
      screen.getByRole("radio", { name: "Elena: Salió" }).getAttribute("aria-checked"),
    ).toBe("true");

    await userEvent.type(screen.getByPlaceholderText("Nombre del reemplazo"), "Marta");
    await userEvent.click(screen.getByText("+ Reemplazar"));
    expect(screen.getByText("Reemplazo")).toBeDefined();
    expect(screen.getByText("Total personas: 3")).toBeDefined();

    await userEvent.click(screen.getByText("Guardar"));
    const personas = onGuardar.mock.calls[0][0];
    expect(personas).toHaveLength(3);
    expect(personas[1]).toMatchObject({ uuid: "p2", llego: "salio" });
    expect(personas[2]).toMatchObject({ nombre: "Marta", llego: true, tipoParticipante: "Visitante" });
    expect(personas[2].uuid).toBeUndefined();
  });

  it("si no se guarda, lo dice y no pierde lo escrito", async () => {
    const onGuardar = vi.fn().mockRejectedValue({ message: "permission denied" });
    render(<RegistroDeAsistentes reserva={reserva} guardando={false} onGuardar={onGuardar} />);

    await userEvent.click(screen.getByRole("radio", { name: "Elena: Llegó" }));
    await userEvent.click(screen.getByText("Guardar"));

    expect(await screen.findByText(/permission denied/)).toBeDefined();
    expect(
      screen.getByRole("radio", { name: "Elena: Llegó" }).getAttribute("aria-checked"),
    ).toBe("true");
  });
});
