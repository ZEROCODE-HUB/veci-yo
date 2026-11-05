import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * El registro de entrada de un huésped en portería (23/10/2026): primero es la
 * misma persona, con la foto del preregistro marcada con el nombre del guardia;
 * después se escanea el documento físico. Desde el 05/11/2026, por tres
 * caminos: el código de barras del reverso (en vivo), la zona MRZ y el texto.
 * Lo escaneado no se guarda ni se sube.
 *
 * La lectura del texto se dobla: la de verdad necesita ML Kit en el teléfono.
 * La cámara también: en jsdom no hay vista previa. El doble avisa de que está
 * lista al montarse, dispara una foto fija y guarda lo que se le pide --el
 * tamaño, las opciones de la foto, qué códigos buscar-- y la función con la que
 * entregaría un código leído en vivo.
 */
let tamanoPedido: string | undefined;
let opcionesDeLaFoto: Record<string, unknown> | undefined;
/** Lo que la cámara le daría al leer un código en vivo; undefined si no busca. */
let leerCodigoEnVivo: ((r: { type: string; data: string }) => void) | undefined;
let codigosPedidos: string[] | undefined;
vi.mock("expo-camera", async () => {
  const React = await import("react");
  const CameraView = React.forwardRef(function CameraView(
    props: {
      onCameraReady?: () => void;
      pictureSize?: string;
      onBarcodeScanned?: (r: { type: string; data: string }) => void;
      barcodeScannerSettings?: { barcodeTypes: string[] };
    },
    ref: React.Ref<unknown>,
  ) {
    React.useImperativeHandle(ref, () => ({
      takePictureAsync: async (opciones: Record<string, unknown>) => {
        opcionesDeLaFoto = opciones;
        return { uri: "file://escaneo.jpg" };
      },
      getAvailablePictureSizesAsync: async () => ["640x480", "1280x960", "4000x3000"],
    }));
    tamanoPedido = props.pictureSize;
    leerCodigoEnVivo = props.onBarcodeScanned;
    codigosPedidos = props.barcodeScannerSettings?.barcodeTypes;
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
let lecturaFalla: string | null = null;
vi.mock("../services/leerTextoDelDocumento", () => ({
  leerTextoDelDocumento: async () => {
    if (lecturaFalla) throw new Error(lecturaFalla);
    return textoLeido;
  },
}));
/** Las fotos que se mandan borrar: ninguna se queda en el teléfono. */
const olvidadas: string[] = [];
vi.mock("../services/porteriaArchivo", () => ({
  olvidarFoto: (uri: string) => olvidadas.push(uri),
}));
/** Lo que se anota en la base: aquí se apunta para comprobar el rastro. */
const anotado: Array<{ tipo: string; donde: string }> = [];
vi.mock("@/shared/services/erroresDeLaApp", () => ({
  anotarEnLaBase: (tipo: string, donde: string) => anotado.push({ tipo, donde }),
  anotarError: (donde: string) => anotado.push({ tipo: "error", donde }),
  anotarYEsperar: async (donde: string) => {
    anotado.push({ tipo: "rastro", donde });
  },
  describirError: (e: Error) => ({ mensaje: e.message, detalle: e.stack }),
}));

const { ConfirmarIdentidad } = await import("./ConfirmarIdentidad");

const onCoincide = vi.fn(async (_forma: string) => true);
const onAprobarAMano = vi.fn(async (_motivo: string) => true);

const pintar = () =>
  render(
    <ConfirmarIdentidad
      nombre="Ana"
      fotosGuardadas={["https://x/frente.jpg"]}
      cargando={false}
      marcaDeAgua="Juan Franco · Portería · 23/10/2026 09:00"
      ficha={{ numero: "1012345678", nombre: "Ana", apellidos: "Pérez Gil" }}
      onCoincide={onCoincide}
      onAprobarAMano={onAprobarAMano}
    />,
  );

const hastaLaCamara = async () => {
  pintar();
  await userEvent.click(screen.getByText("Sí, es la misma"));
  await screen.findByText("📷 Escanear el documento");
};

const escanear = async (texto: string) => {
  textoLeido = texto;
  await hastaLaCamara();
  await userEvent.click(screen.getByText("📷 Escanear el documento"));
};

beforeEach(() => {
  onCoincide.mockClear();
  onAprobarAMano.mockClear();
  anotado.length = 0;
  olvidadas.length = 0;
  leerCodigoEnVivo = undefined;
  textoLeido = "";
  lecturaFalla = null;
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
  it("si el número coincide, queda validado y la base sabe que fue el número", async () => {
    await escanear("CEDULA DE CIUDADANIA\nNUMERO 1.012.345.678\nPEREZ GIL\nANA");
    expect(await screen.findByText(/el número del documento coincide/)).toBeDefined();
    expect(onCoincide).toHaveBeenCalledTimes(1);
    expect(onCoincide).toHaveBeenCalledWith("numero");
  });

  it("si coincide el nombre, la base lo sabe: no se hace pasar por el número", async () => {
    await escanear("REPUBLICA DE COLOMBIA\nPEREZ GIL\nANA");
    expect(await screen.findByText(/el nombre del documento coincide/)).toBeDefined();
    expect(onCoincide).toHaveBeenCalledWith("nombre");
  });

  it("la MRZ de un pasaporte valida por la zona de lectura", async () => {
    textoLeido = [
      "PASSPORT",
      "P<UTOPEREZ<GIL<<ANA<<<<<<<<<<<<<<<<<<<<<<<<<",
      "L898902C36UTO7408122F1204159ZE184226B<<<<<10",
    ].join("\n");
    render(
      <ConfirmarIdentidad
        nombre="Ana"
        fotosGuardadas={[]}
        cargando={false}
        marcaDeAgua="x"
        ficha={{ numero: "L898902C3", nombre: "Ana", apellidos: "Pérez Gil" }}
        onCoincide={onCoincide}
      />,
    );
    await userEvent.click(screen.getByText("Sí, es la misma"));
    await userEvent.click(await screen.findByText("📷 Escanear el documento"));
    expect(await screen.findByText(/la zona de lectura del documento/)).toBeDefined();
    expect(onCoincide).toHaveBeenCalledWith("mrz");
  });

  it("la foto se borra en cuanto se leyó, coincida o no", async () => {
    await escanear("GOMEZ LUIS");
    await screen.findByText("El documento no coincide");
    expect(olvidadas).toEqual(["file://escaneo.jpg"]);
  });

  it("la foto se toma dentro de la app, sin llegar a la foto entera", async () => {
    await hastaLaCamara();
    await vi.waitFor(() => expect(tamanoPedido).toBe("1280x960"));
  });

  it("en Android, sin el procesado que tumbaba la app (registro del 26/10/2026)", async () => {
    const { Platform } = await import("react-native");
    const antes = Platform.OS;
    Object.defineProperty(Platform, "OS", { value: "android", configurable: true });
    try {
      await escanear("NUMERO 1.012.345.678");
      await screen.findByText(/coincide con el registrado/);
      expect(opcionesDeLaFoto).toMatchObject({ skipProcessing: true });
    } finally {
      Object.defineProperty(Platform, "OS", { value: antes, configurable: true });
    }
  });

  it("fuera de Android la foto se gira: el lector de Apple la recibe sin girar", async () => {
    await escanear("NUMERO 1.012.345.678");
    await screen.findByText(/coincide con el registrado/);
    expect(opcionesDeLaFoto).toMatchObject({ skipProcessing: false });
  });

  it("si no coincide, lo dice y no valida", async () => {
    await escanear("CEDULA DE CIUDADANIA\nNUMERO 1.098.765.432\nGOMEZ\nLUIS");
    expect(await screen.findByText("El documento no coincide")).toBeDefined();
    expect(screen.getByText(/no está el número ni el nombre que registró Ana/)).toBeDefined();
    expect(onCoincide).not.toHaveBeenCalled();
  });

  it("con muy poco texto, dice que acerque el documento", async () => {
    await escanear("REPUBLICA");
    expect(await screen.findByText(/Se leyó muy poco texto/)).toBeDefined();
  });

  it("deja un rastro de cada paso en la base", async () => {
    await escanear("CEDULA DE CIUDADANIA\nNUMERO 1.012.345.678");
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
  05/11/2026: ocho escaneos de la misma cédula leyeron el apellido y no el
  número. El código de barras del reverso trae el número exacto y se lee en
  vivo, sin pulsar nada.
*/
describe("el código de barras del reverso", () => {
  const cedula = (numero: string) => {
    const bytes = Array.from({ length: 531 }, () => "\0");
    const poner = (desde: number, t: string) => [...t].forEach((c, i) => (bytes[desde + i] = c));
    poner(48, numero.padStart(10, "0"));
    poner(58, "PEREZ");
    poner(81, "GIL");
    poner(104, "ANA");
    poner(151, "F19900101");
    return bytes.join("");
  };

  it("la cámara busca solo los códigos de los documentos", async () => {
    await hastaLaCamara();
    expect(codigosPedidos).toEqual(["pdf417", "code39"]);
  });

  it("si trae el número registrado, valida sin pulsar Escanear", async () => {
    await hastaLaCamara();
    leerCodigoEnVivo?.({ type: "pdf417", data: cedula("1012345678") });
    expect(await screen.findByText(/el código de barras del documento/)).toBeDefined();
    expect(onCoincide).toHaveBeenCalledWith("codigo");
    expect(onCoincide).toHaveBeenCalledTimes(1);
  });

  it("el mismo código leído muchas veces se anota una sola", async () => {
    await hastaLaCamara();
    const data = cedula("1012345678");
    leerCodigoEnVivo?.({ type: "pdf417", data });
    leerCodigoEnVivo?.({ type: "pdf417", data });
    await screen.findByText(/el código de barras del documento/);
    expect(onCoincide).toHaveBeenCalledTimes(1);
  });

  it("si trae otro número, avisa y no valida", async () => {
    await hastaLaCamara();
    leerCodigoEnVivo?.({ type: "pdf417", data: cedula("1098765432") });
    expect(await screen.findByText(/El código del reverso trae otro número/)).toBeDefined();
    expect(onCoincide).not.toHaveBeenCalled();
  });

  it("el rastro dice qué pasó con el código, sin su contenido", async () => {
    await hastaLaCamara();
    leerCodigoEnVivo?.({ type: "code39", data: "1098765432" });
    await screen.findByText(/otro número/);
    expect(anotado.map((a) => a.donde)).toContain("escaneo: código otro_numero");
  });
});

/*
  El cliente, 26/10/2026: «si no coincide el documento debe salir un error y
  darte la opción de volver a escanear o de aprobar manualmente, pero ahí sale
  una advertencia y se guarda quién lo está aprobando».
*/
describe("cuando no coincide", () => {
  const hastaElError = async (texto: string) => {
    await escanear(texto);
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

  it("al tercer escaneo no dice «los dos lados» ni pide «el otro lado»", async () => {
    await hastaElError("GOMEZ LUIS");
    await userEvent.click(screen.getByText("Volver a escanear"));
    await userEvent.click(screen.getByText("📷 Escanear el otro lado"));
    await screen.findByText("El documento no coincide");
    await userEvent.click(screen.getByText("Volver a escanear"));
    await userEvent.click(screen.getByText("📷 Escanear otra vez"));
    await screen.findByText("El documento no coincide");
    expect(screen.getByText("Escaneaste 3 veces: se comparan las dos últimas.")).toBeDefined();
  });

  it("aprobar a mano pide confirmar, con una advertencia y el motivo", async () => {
    await hastaElError("GOMEZ LUIS");
    await userEvent.click(screen.getByText("Aprobar a mano"));
    expect(screen.getByText(/Vas a dejar entrar a Ana sin que su documento coincida/)).toBeDefined();
    expect(screen.getByText(/Quedará anotado que lo aprobaste tú/)).toBeDefined();
    expect(onAprobarAMano).not.toHaveBeenCalled();

    await userEvent.type(screen.getByPlaceholderText(/el documento está gastado/), "Cédula vieja, no se lee");
    await userEvent.click(screen.getByText("Sí, aprobar a mano"));
    expect(onAprobarAMano).toHaveBeenCalledTimes(1);
    expect(onAprobarAMano).toHaveBeenCalledWith("Cédula vieja, no se lee");
    expect(await screen.findByText(/Aprobado a mano/)).toBeDefined();
  });

  it("sin motivo no deja aprobar a mano", async () => {
    await hastaElError("GOMEZ LUIS");
    await userEvent.click(screen.getByText("Aprobar a mano"));
    await userEvent.click(screen.getByText("Sí, aprobar a mano"));
    expect(onAprobarAMano).not.toHaveBeenCalled();
  });

  /*
    26/10/2026: en un celular con el APK 1 no hay lector, y antes eso dejaba la
    app en blanco. Ahora la lectura falla con su motivo y salen las mismas
    salidas que cuando no coincide.
  */
  it("si la lectura falla, dice por qué y ofrece volver a escanear o aprobar a mano", async () => {
    lecturaFalla = "Este celular tiene una versión de la app sin el lector de documentos.";
    await hastaLaCamara();
    await userEvent.click(screen.getByText("📷 Escanear el documento"));
    expect(await screen.findByText("El documento no coincide")).toBeDefined();
    expect(screen.getByText(/sin el lector de documentos/)).toBeDefined();
    expect(screen.getByText("Volver a escanear")).toBeDefined();
    expect(screen.getByText("Aprobar a mano")).toBeDefined();
  });

  it("«Cancelar» no aprueba", async () => {
    await hastaElError("GOMEZ LUIS");
    await userEvent.click(screen.getByText("Aprobar a mano"));
    await userEvent.click(screen.getByText("Cancelar"));
    expect(onAprobarAMano).not.toHaveBeenCalled();
    expect(screen.getByText("Volver a escanear")).toBeDefined();
  });

  // El cliente, 26/10/2026: todo va por el escáner o por aprobar a mano.
  it("ya no ofrece escribir el número a mano", async () => {
    pintar();
    await userEvent.click(screen.getByText("Sí, es la misma"));
    expect(screen.queryByText("Escribir el número a mano")).toBeNull();
  });
});
