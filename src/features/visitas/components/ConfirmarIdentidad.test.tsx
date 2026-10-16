import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmarIdentidad } from "./ConfirmarIdentidad";

/**
 * El registro de entrada de un huésped en portería (16/10/2026): primero se
 * confirma que es la misma persona, después el mismo documento. Lo escaneado no
 * se guarda; aquí se comprueba que la pantalla no deja saltarse un paso.
 */
vi.mock("expo-image-picker", () => ({
  requestCameraPermissionsAsync: async () => ({ granted: true }),
  launchCameraAsync: async () => ({ canceled: false, assets: [{ uri: "file://escaneo.jpg" }] }),
}));

const pintar = (onConfirmado = vi.fn()) =>
  render(
    <ConfirmarIdentidad
      nombre="Ana"
      fotosGuardadas={["https://x/frente.jpg"]}
      cargando={false}
      onConfirmado={onConfirmado}
    />,
  );

describe("confirmar que es la misma persona", () => {
  it("enseña el documento guardado y pregunta", () => {
    pintar();
    expect(screen.getByText("1. ¿ES LA MISMA PERSONA?")).toBeDefined();
    expect(screen.getAllByLabelText("Foto del documento")).toHaveLength(1);
  });

  it("si no es, dice que no la deje entrar", async () => {
    pintar();
    await userEvent.click(screen.getByText("No es"));
    expect(screen.getByText(/No la dejes entrar/)).toBeDefined();
  });

  it("no da por bueno el documento sin escanearlo", async () => {
    const onConfirmado = vi.fn();
    pintar(onConfirmado);
    await userEvent.click(screen.getByText("Sí, es la misma"));
    await userEvent.click(screen.getByText("Son el mismo"));
    expect(onConfirmado).not.toHaveBeenCalled();

    await userEvent.click(screen.getByText("📷 Escanear anverso"));
    await userEvent.click(await screen.findByText("Son el mismo"));
    expect(onConfirmado).toHaveBeenCalledTimes(1);
  });
});
