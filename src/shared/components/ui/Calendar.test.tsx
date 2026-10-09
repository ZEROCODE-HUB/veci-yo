import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Calendar } from "./Calendar";

/**
 * El calendario en modo rango.
 *
 * Una estancia tiene entrada y salida, y hasta el 09/10/2026 se pedian en dos
 * sitios distintos: un calendario para la llegada y una ventana con **otro**
 * calendario para la salida. Las dos fechas no se veian nunca juntas.
 *
 * Lo que se comprueba aqui es la maquina de los tres estados, porque el
 * tercero es el que se olvida al escribirla: con el rango completo, pulsar
 * **vuelve a empezar**. Sin eso no hay forma de corregir la llegada --habria
 * que borrar antes la salida, y no hay ningun sitio desde donde borrarla-- y
 * el defecto no se ve leyendo el codigo, solo usandolo.
 *
 * **Sin `minima` a proposito, y por eso sin reloj falso.** Es lo que apaga los
 * dias pasados, y es lo unico de este componente que depende del calendario de
 * verdad: sin el, un dia 5, 10, 14 o 20 existe en cualquier mes y estas
 * pruebas no caducan solas. La alternativa --fijar el reloj-- choca con
 * `userEvent`, que espera temporizadores de verdad.
 */

const diaDe = (texto: string) =>
  screen.getByRole("button", { name: new RegExp(`^Dia ${texto}(,|$)`) });

describe("el calendario de rango", () => {
  const usuario = () => userEvent.setup();

  it("al pulsar el primer día avisa de la entrada y deja la salida sin poner", async () => {
    const alElegir = vi.fn();
    render(
      <Calendar rango selected={null} hasta={null} onRango={alElegir} />,
    );

    await usuario().click(diaDe("10"));

    expect(alElegir).toHaveBeenCalledTimes(1);
    const [desde, hasta] = alElegir.mock.calls[0];
    expect(desde.getDate()).toBe(10);
    // `null`, no la misma fecha: un rango a medias no es un rango de cero
    // noches, y quien lo recibe tiene que poder distinguirlos.
    expect(hasta).toBeNull();
  });

  it("con la entrada puesta, el segundo día es la salida", async () => {
    const alElegir = vi.fn();
    render(
      <Calendar
        rango
        selected={new Date(2026, 9, 10)}
        hasta={null}
        onRango={alElegir}
      />,
    );

    await usuario().click(diaDe("14"));

    const [desde, hasta] = alElegir.mock.calls[0];
    expect(desde.getDate()).toBe(10);
    expect(hasta?.getDate()).toBe(14);
  });

  it("con el rango completo, pulsar vuelve a empezar", async () => {
    const alElegir = vi.fn();
    render(
      <Calendar
        rango
        selected={new Date(2026, 9, 10)}
        hasta={new Date(2026, 9, 14)}
        onRango={alElegir}
      />,
    );

    await usuario().click(diaDe("20"));

    const [desde, hasta] = alElegir.mock.calls[0];
    expect(desde.getDate()).toBe(20);
    expect(hasta).toBeNull();
  });

  it("un día anterior a la entrada se convierte en la nueva entrada", async () => {
    /*
      Si no, elegir el 5 despues del 10 daria una estancia que acaba antes de
      empezar: el formulario la rechaza al pulsar Aceptar y la persona no sabe
      por que. Lo que quiere decir pulsar antes de la entrada es «me equivoque
      de entrada», no «quiero salir ese dia».
    */
    const alElegir = vi.fn();
    render(
      <Calendar
        rango
        selected={new Date(2026, 9, 10)}
        hasta={null}
        onRango={alElegir}
      />,
    );

    await usuario().click(diaDe("5"));

    const [desde, hasta] = alElegir.mock.calls[0];
    expect(desde.getDate()).toBe(5);
    expect(hasta).toBeNull();
  });

  it("los dos extremos se nombran, no solo se pintan", () => {
    /*
      El color los distingue y quien no lo ve, no. Es lo mismo que ya costo
      con `accessibilityState`: una señal que solo existe en el estilo no
      llega a nadie que use un lector de pantalla.
    */
    render(
      <Calendar
        rango
        selected={new Date(2026, 9, 10)}
        hasta={new Date(2026, 9, 14)}
        onRango={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: "Dia 10, entrada" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Dia 14, salida" })).toBeTruthy();
  });

  it("un día ya reservado no se puede elegir, y lo dice", () => {
    /*
      La base rechaza una estancia que se solape con otra en la misma
      vivienda. Dejar elegir unos dias para despues decir que no al guardar es
      hacer teclear para nada: el cliente creo una reserva encima de otra el
      09/10/2026 y se entero al pulsar.

      «Ya reservado» y no solo apagado: un dia pasado tambien sale apagado, y
      no son lo mismo. Quien no ve el tachado necesita que se lo digan.
    */
    const alElegir = vi.fn();
    render(
      <Calendar
        rango
        selected={new Date(2026, 9, 10)}
        hasta={null}
        onRango={alElegir}
        ocupados={new Set(["2026-10-14"])}
      />,
    );

    const ocupado = screen.getByRole("button", { name: "Dia 14, ya reservado" });

    expect(ocupado.getAttribute("aria-disabled")).toBe("true");
    /*
      Y no se puede pulsar de verdad, no solo «esta marcado como
      deshabilitado»: react-native-web lo apaga con `pointer-events: none`, y
      `userEvent` se niega a pulsarlo --que es exactamente lo que se quiere
      comprobar--. Se mira el estilo en vez de intentar el clic, que lanzaria.
    */
    expect(getComputedStyle(ocupado).pointerEvents).toBe("none");
    expect(alElegir).not.toHaveBeenCalled();
  });

  it("y los que están libres sí", async () => {
    // El control: sin esto, apagarlos **todos** pasaria el caso de arriba.
    const alElegir = vi.fn();
    render(
      <Calendar
        rango
        selected={new Date(2026, 9, 10)}
        hasta={null}
        onRango={alElegir}
        ocupados={new Set(["2026-10-14"])}
      />,
    );

    await usuario().click(diaDe("15"));
    expect(alElegir).toHaveBeenCalledTimes(1);
  });

  it("sin modo rango sigue eligiendo un solo día", async () => {
    // El control positivo del modo viejo: cinco pantallas lo usan asi, y un
    // cambio en el de rango no puede llevarselas por delante.
    const alElegir = vi.fn();
    const alRango = vi.fn();
    render(<Calendar selected={null} onSelect={alElegir} onRango={alRango} />);

    await usuario().click(diaDe("10"));

    expect(alElegir).toHaveBeenCalledTimes(1);
    expect(alElegir.mock.calls[0][0].getDate()).toBe(10);
    expect(alRango).not.toHaveBeenCalled();
  });
});
