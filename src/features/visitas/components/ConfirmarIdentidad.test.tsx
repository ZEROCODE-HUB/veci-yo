import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * El registro de entrada de un huésped en portería (23/10/2026): primero es la
 * misma persona, con la foto del preregistro marcada con el nombre del guardia;
 * después se escanea el documento físico, el celular lee su texto y se compara
 * con lo registrado. Lo escaneado no se guarda ni se sube.
 *
 * La lectura del texto se dobla: la de verdad necesita ML Kit en el teléfono.
 */
vi.mock("expo-image-picker", () => ({
  requestCameraPermissionsAsync: async () => ({ granted: true }),
  launchCameraAsync: async () => ({ canceled: false, assets: [{ uri: "file://escaneo.jpg" }] }),
}));
let textoLeido = "";
vi.mock("../services/leerTextoDelDocumento", () => ({
  leerTextoDelDocumento: async () => textoLeido,
}));

const { ConfirmarIdentidad } = await import("./ConfirmarIdentidad");

const onCoincide = vi.fn(async () => true);
const onAMano = vi.fn();

const pintar = () =>
  render(
    <ConfirmarIdentidad
      nombre="Ana"
      fotosGuardadas={["https://x/frente.jpg"]}
      cargando={false}
      marcaDeAgua="Juan Franco · Portería · 23/10/2026 09:00"
      ficha={{ numero: "1012345678", nombre: "Ana", apellidos: "Pérez Gil" }}
      onCoincide={onCoincide}
      onAMano={onAMano}
    />,
  );

beforeEach(() => {
  onCoincide.mockClear();
  onAMano.mockClear();
  textoLeido = "";
});

describe("confirmar que es la misma persona", () => {
  it("enseña el documento guardado con la marca de agua del guardia", () => {
    pintar();
    expect(screen.getByText("1. ¿ES LA MISMA PERSONA?")).toBeDefined();
    expect(screen.getAllByLabelText("Foto del documento")).toHaveLength(1);
    expect(
      screen.getByLabelText("Marca de agua: Juan Franco · Portería · 23/10/2026 09:00"),
    ).toBeDefined();
  });

  it("si no es, no la deja entrar", async () => {
    pintar();
    await userEvent.click(screen.getByText("No es"));
    expect(screen.getByText(/no la dejes entrar/)).toBeDefined();
    expect(onCoincide).not.toHaveBeenCalled();
  });
});

describe("escanear el documento y comparar el texto", () => {
  it("si el número coincide, queda validado sin escribir nada", async () => {
    textoLeido = "CEDULA DE CIUDADANIA\nNUMERO 1.012.345.678\nPEREZ GIL\nANA";
    pintar();
    await userEvent.click(screen.getByText("Sí, es la misma"));
    await userEvent.click(screen.getByText("📷 Escanear el documento"));
    expect(await screen.findByText(/el número del documento coincide/)).toBeDefined();
    expect(onCoincide).toHaveBeenCalledTimes(1);
  });

  it("si no coincide, lo dice y no valida", async () => {
    textoLeido = "CEDULA DE CIUDADANIA\nNUMERO 1.098.765.432\nGOMEZ\nLUIS";
    pintar();
    await userEvent.click(screen.getByText("Sí, es la misma"));
    await userEvent.click(screen.getByText("📷 Escanear el documento"));
    expect(await screen.findByText(/No encontré el número ni el nombre de Ana/)).toBeDefined();
    expect(onCoincide).not.toHaveBeenCalled();
  });

  it("siempre se puede seguir con el número a mano", async () => {
    pintar();
    await userEvent.click(screen.getByText("Sí, es la misma"));
    await userEvent.click(screen.getByText("Escribir el número a mano"));
    expect(onAMano).toHaveBeenCalledTimes(1);
  });
});
