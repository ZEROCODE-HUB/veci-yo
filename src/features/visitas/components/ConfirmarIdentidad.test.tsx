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
 * La cámara también: en jsdom no hay vista previa. El doble avisa de que está
 * lista al montarse y dispara una foto fija; se guarda el tamaño que se le pide
 * para comprobar que no es la foto entera.
 */
let tamanoPedido: string | undefined;
vi.mock("expo-camera", async () => {
  const React = await import("react");
  const CameraView = React.forwardRef(function CameraView(
    props: { onCameraReady?: () => void; pictureSize?: string },
    ref: React.Ref<unknown>,
  ) {
    React.useImperativeHandle(ref, () => ({
      takePictureAsync: async () => ({ uri: "file://escaneo.jpg" }),
      getAvailablePictureSizesAsync: async () => ["640x480", "1280x960", "4000x3000"],
    }));
    tamanoPedido = props.pictureSize;
    const { onCameraReady } = props;
    React.useEffect(() => {
      onCameraReady?.();
    }, [onCameraReady]);
    return null;
  });
  return {
    CameraView,
    useCameraPermissions: () => [{ granted: true }, async () => ({ granted: true })],
  };
});
let textoLeido = "";
vi.mock("../services/leerTextoDelDocumento", () => ({
  leerTextoDelDocumento: async () => textoLeido,
}));
/** Lo que se anota en la base: aquí se apunta para comprobar el rastro. */
const anotado: Array<{ tipo: string; donde: string }> = [];
vi.mock("@/shared/services/erroresDeLaApp", () => ({
  anotarEnLaBase: (tipo: string, donde: string) => anotado.push({ tipo, donde }),
  anotarError: (donde: string) => anotado.push({ tipo: "error", donde }),
  describirError: (e: Error) => ({ mensaje: e.message, detalle: e.stack }),
}));

const { ConfirmarIdentidad } = await import("./ConfirmarIdentidad");

const onCoincide = vi.fn(async () => true);
const onAMano = vi.fn();
const onAprobarAMano = vi.fn(async () => true);

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
      onAprobarAMano={onAprobarAMano}
    />,
  );

beforeEach(() => {
  onCoincide.mockClear();
  onAMano.mockClear();
  onAprobarAMano.mockClear();
  anotado.length = 0;
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

  it("la foto se toma dentro de la app, al tamaño justo para leer", async () => {
    pintar();
    await userEvent.click(screen.getByText("Sí, es la misma"));
    await screen.findByText("📷 Escanear el documento");
    await vi.waitFor(() => expect(tamanoPedido).toBe("1280x960"));
  });

  it("si no coincide, lo dice y no valida", async () => {
    textoLeido = "CEDULA DE CIUDADANIA\nNUMERO 1.098.765.432\nGOMEZ\nLUIS";
    pintar();
    await userEvent.click(screen.getByText("Sí, es la misma"));
    await userEvent.click(screen.getByText("📷 Escanear el documento"));
    expect(await screen.findByText("El documento no coincide")).toBeDefined();
    expect(screen.getByText(/no está el número ni el nombre que registró Ana/)).toBeDefined();
    expect(onCoincide).not.toHaveBeenCalled();
  });

  it("deja un rastro de cada paso en la base", async () => {
    textoLeido = "CEDULA DE CIUDADANIA\nNUMERO 1.012.345.678";
    pintar();
    await userEvent.click(screen.getByText("Sí, es la misma"));
    await userEvent.click(screen.getByText("📷 Escanear el documento"));
    await screen.findByText(/coincide con el registrado/);
    expect(anotado.map((a) => a.donde)).toEqual([
      "escaneo: disparar",
      "escaneo: foto tomada",
      "escaneo: leyendo",
      "escaneo: leído",
    ]);
  });
});

/*
  El cliente, 26/10/2026: «si no coincide el documento debe salir un error y
  darte la opción de volver a escanear o de aprobar manualmente, pero ahí sale
  una advertencia y se guarda quién lo está aprobando».
*/
describe("cuando no coincide", () => {
  const hastaElError = async (texto: string) => {
    textoLeido = texto;
    pintar();
    await userEvent.click(screen.getByText("Sí, es la misma"));
    await userEvent.click(screen.getByText("📷 Escanear el documento"));
    await screen.findByText("El documento no coincide");
  };

  it("si no se leyó nada, lo dice así", async () => {
    await hastaElError("");
    expect(screen.getByText(/No se leyó ningún texto en la foto/)).toBeDefined();
  });

  it("«Volver a escanear» vuelve a la cámara, para el otro lado", async () => {
    await hastaElError("GOMEZ LUIS");
    await userEvent.click(screen.getByText("Volver a escanear"));
    expect(screen.queryByText("El documento no coincide")).toBeNull();
    expect(screen.getByText("📷 Escanear el otro lado")).toBeDefined();
  });

  it("aprobar a mano pide confirmar con una advertencia antes de aprobar", async () => {
    await hastaElError("GOMEZ LUIS");
    await userEvent.click(screen.getByText("Aprobar a mano"));
    expect(screen.getByText(/Vas a dejar entrar a Ana sin que su documento coincida/)).toBeDefined();
    expect(screen.getByText(/Quedará anotado que lo aprobaste tú/)).toBeDefined();
    expect(onAprobarAMano).not.toHaveBeenCalled();

    await userEvent.click(screen.getByText("Sí, aprobar a mano"));
    expect(onAprobarAMano).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/Aprobado a mano/)).toBeDefined();
  });

  it("«Cancelar» no aprueba", async () => {
    await hastaElError("GOMEZ LUIS");
    await userEvent.click(screen.getByText("Aprobar a mano"));
    await userEvent.click(screen.getByText("Cancelar"));
    expect(onAprobarAMano).not.toHaveBeenCalled();
    expect(screen.getByText("Volver a escanear")).toBeDefined();
  });

  it("siempre se puede seguir con el número a mano", async () => {
    pintar();
    await userEvent.click(screen.getByText("Sí, es la misma"));
    await userEvent.click(screen.getByText("Escribir el número a mano"));
    expect(onAMano).toHaveBeenCalledTimes(1);
  });
});
