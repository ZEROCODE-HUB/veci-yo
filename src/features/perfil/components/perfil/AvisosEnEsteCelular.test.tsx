import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { EnvioPush } from "@/features/home/services/notificaciones.repo";
import type { EstadoDelCelular } from "@/shared/services/avisosPush.logica";

/**
 * «Avisos en este celular» (22/10/2026).
 *
 * Lo que tiene que estar a la vista: si el celular puede recibir avisos, el
 * botón para dar el permiso cuando falta, y en qué quedó el aviso de prueba
 * dicho como se entiende (llegó, salió y no se ve, no está registrado, falló y
 * por qué). Comprobar que la base anota el envío no es comprobar que se lee.
 */
let estado: EstadoDelCelular = { disponible: true, permiso: false, registrado: false };
let envio: EnvioPush | null | undefined;
const activar = vi.fn();
const enviarPrueba = vi.fn();

vi.mock("../../hooks/useAvisosEnEsteCelular", () => ({
  useAvisosEnEsteCelular: () => ({ estado, activar, activando: false, enviarPrueba, enviando: false, envio }),
}));

const { AvisosEnEsteCelular } = await import("./AvisosEnEsteCelular");

const ENVIO: EnvioPush = { estado: "enviado", detalle: null, enviadoEn: new Date(), recibidoEn: null };

describe("avisos en este celular", () => {
  it("en el navegador dice que ahí no llegan, y no ofrece botones", () => {
    estado = { disponible: false, permiso: false, registrado: false };
    envio = undefined;
    render(<AvisosEnEsteCelular />);
    screen.getByText(/Desde el navegador no se pueden recibir/);
    expect(screen.queryByText("Enviarme un aviso de prueba")).toBeNull();
  });

  it("sin permiso, lo dice y ofrece activarlo", async () => {
    estado = { disponible: true, permiso: false, registrado: false };
    envio = undefined;
    activar.mockClear();
    render(<AvisosEnEsteCelular />);
    screen.getByText("Todavía no tiene permiso para mostrar avisos");
    await userEvent.click(screen.getByText("Activar avisos en este celular"));
    expect(activar).toHaveBeenCalled();
  });

  it("con permiso y registrado, no vuelve a pedir el permiso", () => {
    estado = { disponible: true, permiso: true, registrado: true };
    envio = undefined;
    render(<AvisosEnEsteCelular />);
    screen.getByText("Está registrado para recibir avisos");
    expect(screen.queryByText("Activar avisos en este celular")).toBeNull();
  });

  it("el botón de prueba manda el aviso", async () => {
    estado = { disponible: true, permiso: true, registrado: true };
    envio = undefined;
    enviarPrueba.mockClear();
    render(<AvisosEnEsteCelular />);
    await userEvent.click(screen.getByText("Enviarme un aviso de prueba"));
    expect(enviarPrueba).toHaveBeenCalled();
  });

  it.each<[string, EnvioPush | null, RegExp]>([
    ["recién mandado", null, /Enviando el aviso/],
    ["llegó", { ...ENVIO, recibidoEn: new Date(2026, 9, 22, 10, 5) }, /Te llegó a las 10:05/],
    ["salió y todavía no se vio", ENVIO, /Salió hacia tu celular/],
    ["no hay celular registrado", { ...ENVIO, estado: "sin_dispositivo" }, /no está registrado para tu cuenta/],
    [
      "falló, con el motivo",
      { ...ENVIO, estado: "error", detalle: "Falta el secreto ONESIGNAL_REST_API_KEY en las funciones" },
      /No se pudo enviar: Falta el secreto ONESIGNAL_REST_API_KEY/,
    ],
  ])("dice en qué quedó la prueba: %s", (_caso, envioDePrueba, texto) => {
    estado = { disponible: true, permiso: true, registrado: true };
    envio = envioDePrueba;
    render(<AvisosEnEsteCelular />);
    screen.getByText(texto);
  });
});
