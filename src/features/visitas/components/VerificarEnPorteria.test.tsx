import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

/**
 * Al tomar la foto del documento, la portería ve cómo quedó y la confirma o
 * la repite (Para Claude 108, 27/10/2026). Después no se vuelve a abrir.
 *
 * La cámara y la URL firmada se doblan: aquí no hay teléfono ni almacén. Lo que
 * se comprueba es lo que se ve.
 */

const camara = vi.fn(async () => ({ canceled: false, assets: [{ uri: "file://foto.jpg" }] }));
vi.mock("expo-image-picker", () => ({
  requestCameraPermissionsAsync: async () => ({ granted: true }),
  launchCameraAsync: () => camara(),
}));
vi.mock("../services/visitas.repo", () => ({
  urlFotoVisita: async (ruta: string) => `https://almacen.test/${ruta}`,
}));

const { VerificarEnPorteria } = await import("./VerificarEnPorteria");

function montar(onTomarFoto = vi.fn(async () => "visita/porteria-1.jpg")) {
  render(
    <VerificarEnPorteria
      nombre="Rosa Recorrido"
      tieneDocumento={false}
      fotoTomada={false}
      onTomarFoto={onTomarFoto}
      onCerrar={() => undefined}
    />,
  );
  return onTomarFoto;
}

describe("la foto que toma la portería", () => {
  it("al tomarla enseña cómo quedó", async () => {
    montar();
    fireEvent.click(screen.getByText("📷 Tomar foto"));
    await waitFor(() => expect(screen.getByText(/Así quedó/)).toBeDefined());
    const imagen = screen.getByLabelText("La foto del documento que acabas de tomar");
    expect(imagen).toBeDefined();
  });

  it("«Está bien» la da por buena y ya no se enseña", async () => {
    montar();
    fireEvent.click(screen.getByText("📷 Tomar foto"));
    await waitFor(() => screen.getByText("Está bien"));
    fireEvent.click(screen.getByText("Está bien"));
    expect(screen.queryByText(/Así quedó/)).toBeNull();
    expect(screen.getByText("✓ Foto guardada")).toBeDefined();
  });

  it("«Volver a tomarla» abre la cámara otra vez", async () => {
    const subir = montar();
    fireEvent.click(screen.getByText("📷 Tomar foto"));
    await waitFor(() => screen.getByText("Volver a tomarla"));
    fireEvent.click(screen.getByText("Volver a tomarla"));
    await waitFor(() => expect(subir).toHaveBeenCalledTimes(2));
  });
});
