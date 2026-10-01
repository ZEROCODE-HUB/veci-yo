import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Las cajas de «Información Contacto» guardan al salir del campo, sin botón.
 *
 * Lo dijo el cliente el 01/10/2026: «no es muy claro cómo se guardan los
 * inputs de código de país y número de teléfono... el campo Alias sí sale el
 * indicador». Y era exacto: el alias avisaba al guardar y estos cuatro campos
 * no decían nada, tres líneas más arriba en la misma pantalla. La diferencia
 * se lee como que uno guarda y el otro no.
 *
 * Es la familia de siempre al revés: no una pantalla que anuncia lo que no
 * hizo, sino una que **hace y no lo dice**.
 */
const guardado = vi.fn();
const avisos: Array<[string, string]> = [];

const PREFERENCIAS = {
  codigoPais: "+57",
  telefono: "3001234567",
  telefonoAlt: "",
  correoAlt: "",
  usarContactoAlt: false,
  modoDaltonico: false,
  fuenteAumentada: false,
  modoOscuro: false,
};

vi.mock("../services/configuracion.repo", () => ({
  PREFERENCIAS_VACIAS: {},
  obtenerPreferencias: () => Promise.resolve({ ...PREFERENCIAS }),
  guardarPreferencias: (cambios: unknown) => {
    guardado(cambios);
    return Promise.resolve(cambios);
  },
}));

vi.mock("@/stores/ui-store", () => ({
  useUIStore: () => ({
    addToast: (texto: string, tipo: string) => avisos.push([texto, tipo]),
  }),
}));

const { useConfiguracion } = await import("./useConfiguracion");

const envoltura = ({ children }: { children: React.ReactNode }) => {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
  );
};

async function montar() {
  const { result } = renderHook(() => useConfiguracion(), {
    wrapper: envoltura,
  });
  await waitFor(() =>
    expect(result.current.preferencias.telefono).toBe("3001234567"),
  );
  return result;
}

beforeEach(() => {
  guardado.mockClear();
  avisos.length = 0;
});

describe("las cajas que guardan al salir del campo", () => {
  it("dicen que guardaron, con el nombre del campo", async () => {
    const result = await montar();

    act(() => result.current.escribir({ telefono: "3009999999" }));
    act(() => result.current.guardarCampo("telefono"));

    await waitFor(() => expect(avisos.length).toBe(1));
    expect(avisos[0]).toEqual(["Teléfono guardado", "success"]);
    expect(guardado).toHaveBeenCalledWith({ telefono: "3009999999" });
  });

  it("y el código del país igual, que es el que se preguntó", async () => {
    const result = await montar();

    act(() => result.current.escribir({ codigoPais: "+58" }));
    act(() => result.current.guardarCampo("codigoPais"));

    await waitFor(() => expect(avisos.length).toBe(1));
    expect(avisos[0]).toEqual(["Código del país guardado", "success"]);
  });

  it("sin tocar nada no escriben ni avisan", async () => {
    /*
      Salir de un campo que no se cambió disparaba una escritura igual. Ahora
      que además avisa, eso sería un «guardado» de algo que nadie guardó, que
      es peor que el silencio de antes.
    */
    const result = await montar();

    act(() => result.current.guardarCampo("telefono"));

    /*
      Con la espera, y no comprobando a secas: `mutate` no llama a su función
      en el mismo tick, así que sin esto el caso pasaba **igual sin el
      arreglo** --comprobado quitándolo--. Un caso negativo que mira demasiado
      pronto siempre está en verde.
    */
    await new Promise((listo) => setTimeout(listo, 50));

    expect(guardado).not.toHaveBeenCalled();
    expect(avisos).toEqual([]);
  });

  it("los interruptores no avisan: ya se ven", async () => {
    /*
      Un interruptor cambia de aspecto al pulsarlo y eso ya dice que pasó algo.
      Un aviso por cada toque sería ruido, y `usarContactoAlt` está en la misma
      tarjeta que los campos de texto.
    */
    const result = await montar();

    act(() => result.current.cambiar({ usarContactoAlt: true }));

    await waitFor(() =>
      expect(guardado).toHaveBeenCalledWith({ usarContactoAlt: true }),
    );
    expect(avisos).toEqual([]);
  });
});
