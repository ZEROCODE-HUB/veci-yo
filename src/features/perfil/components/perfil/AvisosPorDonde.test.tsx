import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PreferenciaDeAviso } from "@/features/home/services/notificaciones.repo";

/**
 * Los avisos: de qué y por dónde.
 *
 * Pedido por el cliente el 02/10/2026: «WhatsApp configurable por residente y
 * por tipo de aviso».
 *
 * Dos cosas que importa que estén **a la vista** y que ninguna prueba de datos
 * puede comprobar:
 *
 *   · que la pantalla dice que el correo y el WhatsApp todavía no se envían.
 *     Falta SMTP propio y una cuenta de WhatsApp Business API, y callarlo
 *     convertiría los dos interruptores en una promesa falsa --que es el
 *     defecto más repetido de este proyecto--;
 *   · que la alarma de S.O.S. no trae interruptores y dice por qué, en vez de
 *     enseñar tres desactivados que nadie entiende.
 */
const guardar = vi.fn();
let avisos: PreferenciaDeAviso[] = [];

vi.mock("../../hooks/useAvisos", () => ({
  useAvisos: () => ({ avisos, cargando: false, guardar }),
}));

const { AvisosPorDonde } = await import("./AvisosPorDonde");

const aviso = (parcial: Partial<PreferenciaDeAviso> = {}): PreferenciaDeAviso => ({
  motivo: "correspondencia_recibida",
  emoji: "📦",
  etiqueta: "Llega un paquete",
  porApp: true,
  porCorreo: false,
  porWhatsapp: false,
  configurable: true,
  ...parcial,
});

describe("los avisos de cada uno", () => {
  it("dice que el correo y el WhatsApp todavía no se envían", () => {
    avisos = [aviso()];
    render(<AvisosPorDonde />);

    screen.getByText(/aún no se envían/i);
    screen.getByText(/queda guardado y se respetará/i);
  });

  it("ofrece los tres canales de cada motivo", () => {
    avisos = [aviso()];
    render(<AvisosPorDonde />);

    /*
      Los nombres llevan el motivo delante. Son tres interruptores por fila y
      ocho filas: un lector de pantalla que anuncie «interruptor» ocho veces
      seguidas no dice cuál es cuál. Ya pasó en la pantalla de Permisos.
    */
    expect(
      screen
        .getByRole("switch", { name: "Llega un paquete: en la aplicación" })
        .getAttribute("aria-checked"),
    ).toBe("true");
    expect(
      screen
        .getByRole("switch", { name: "Llega un paquete: por WhatsApp" })
        .getAttribute("aria-checked"),
    ).toBe("false");
  });

  it("al cambiar uno, guarda ese motivo con el canal cambiado", async () => {
    avisos = [aviso()];
    guardar.mockClear();
    render(<AvisosPorDonde />);

    await userEvent.click(
      screen.getByRole("switch", { name: "Llega un paquete: por WhatsApp" }),
    );

    expect(guardar).toHaveBeenCalledWith(
      expect.objectContaining({
        motivo: "correspondencia_recibida",
        porApp: true,
        porWhatsapp: true,
      }),
    );
  });

  it("y la alarma de S.O.S. no trae interruptores, y dice por qué", () => {
    avisos = [
      aviso({
        motivo: "sos_activado",
        emoji: "🆘",
        etiqueta: "Alarma de S.O.S.",
        configurable: false,
      }),
    ];
    render(<AvisosPorDonde />);

    screen.getByText(/no es una alarma/i);
    expect(screen.queryByRole("switch")).toBeNull();
  });
});
