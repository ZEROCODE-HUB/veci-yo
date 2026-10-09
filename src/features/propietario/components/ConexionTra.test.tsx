import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConexionTra } from "./ConexionTra";

/**
 * La tarjeta donde el anfitrión conecta su TRA.
 *
 * Hasta el 09/10/2026 **no existía**: `guardar_token_tra` y `tiene_token_tra`
 * llevaban desde el 02/10 en la base sin que nadie las llamara, así que no
 * había dónde poner el token. Lo preguntó el cliente: «¿en dónde es que se
 * pone el token o eso para el TRA?».
 *
 * Y en la misma conversación decidió el modo: «por ahora que esté en
 * SIMULACIÓN, pero que deje escribir el TRA; eso debe funcionar SIMULADO PARA
 * TODOS». Esas dos mitades son lo que se comprueba aquí, y la segunda importa
 * más que ninguna: al otro lado hay declaraciones ante el Estado que no se
 * deshacen.
 *
 * `TRA_ENVIO_ACTIVO` sale de una variable de entorno que hoy está apagada. Se
 * dobla para poder comprobar **los dos lados**: un caso que solo mire el
 * estado de hoy pasaría igual el día que se encienda y nadie se enteraría.
 */

vi.mock("../services/suscripcion.repo", async (original) => ({
  ...(await original<Record<string, unknown>>()),
  get TRA_ENVIO_ACTIVO() {
    return envioActivo;
  },
}));

let envioActivo = false;

const APAGADO = { tieneToken: false, armado: false, error: null };

const props = {
  estado: APAGADO,
  onGuardarToken: vi.fn(),
  guardando: false,
  onArmar: vi.fn(),
  armando: false,
};

describe("la conexión con la TRA", () => {
  it("deja escribir el token aunque todo esté en simulación", async () => {
    envioActivo = false;
    const usuario = userEvent.setup();
    const guardar = vi.fn();
    render(<ConexionTra {...props} onGuardarToken={guardar} />);

    await usuario.type(
      screen.getByPlaceholderText(/Pegá aquí el token/),
      "abc123",
    );
    await usuario.click(screen.getByRole("button", { name: "Guardar token" }));

    expect(guardar).toHaveBeenCalledWith("abc123");
  });

  it("en simulación no se ofrece el interruptor de enviar de verdad", () => {
    /*
      El caso que de verdad protege algo. Encenderlo no haría nada --la
      función exige también `TRA_ACTIVO`-- así que ofrecerlo sería un control
      decorativo prometiendo justo lo que no puede: declarar ante el MinCIT.
    */
    envioActivo = false;
    render(<ConexionTra {...props} estado={{ ...APAGADO, tieneToken: true }} />);

    expect(screen.queryByText("Enviar los reportes de verdad")).toBeNull();
    expect(screen.getByText("Modo simulación")).toBeTruthy();
    expect(screen.getByText("SIMULACIÓN")).toBeTruthy();
  });

  it("y dice que no sale nada, de ninguna vivienda", () => {
    envioActivo = false;
    render(<ConexionTra {...props} />);

    expect(screen.getByText(/no se envía nada al/)).toBeTruthy();
    expect(screen.getByText(/ni desde ninguna/)).toBeTruthy();
  });

  it("con el envío encendido sí aparece, y apagado para esa vivienda", () => {
    // El control positivo: sin él, esconder el interruptor **siempre**
    // pasaría los casos de arriba igual de verde.
    envioActivo = true;
    render(<ConexionTra {...props} estado={{ ...APAGADO, tieneToken: true }} />);

    expect(screen.getByText("Enviar los reportes de verdad")).toBeTruthy();
    expect(screen.getByText("APAGADO")).toBeTruthy();
    expect(screen.queryByText("Modo simulación")).toBeNull();
  });

  it("sin token guardado, el interruptor no se puede encender", () => {
    envioActivo = true;
    render(<ConexionTra {...props} />);

    expect(
      screen.getByRole("switch").getAttribute("aria-disabled"),
    ).toBe("true");
    expect(screen.getByText(/Primero guardá el token/)).toBeTruthy();
  });

  it("el token guardado no se enseña nunca", () => {
    /*
      Vive cifrado en el Vault y de la base solo vuelve «lo hay». Enseñarlo
      recortado tampoco vale: es una credencial con la que se declara ante el
      Estado en nombre de alguien.
    */
    envioActivo = false;
    render(<ConexionTra {...props} estado={{ ...APAGADO, tieneToken: true }} />);

    expect(screen.getByText(/no se puede ver/)).toBeTruthy();
    expect(screen.queryByPlaceholderText(/Pegá aquí el token/)).toBeNull();
    expect(screen.getByRole("button", { name: "Cambiar" })).toBeTruthy();
  });

  it("el último fallo se enseña, porque si no deja de reportar en silencio", () => {
    envioActivo = false;
    render(
      <ConexionTra
        {...props}
        estado={{ tieneToken: true, armado: false, error: "RNT no vigente" }}
      />,
    );

    expect(screen.getByText(/RNT no vigente/)).toBeTruthy();
  });
});
