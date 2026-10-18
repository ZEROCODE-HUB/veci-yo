import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CoadministradorForm } from "./CoadministradorForm";

/*
  Los largos del celular vienen de la base por `useParametrosDeLaBase`, que
  pide la red. Se dobla con los valores que tiene hoy la tabla
  `configuracion_plataforma` (7 y 15): lo que se comprueba aquí es que el
  formulario enseñe sus errores, no de dónde salen los números.
*/
vi.mock("@/shared/hooks", async (importOriginal) => {
  const PARAMETROS: Record<string, number> = {
    telefono_largo_minimo: 7,
    telefono_largo_maximo: 15,
  };
  return {
    ...(await importOriginal<typeof import("@/shared/hooks")>()),
    useParametrosDeLaBase: () => ({
      listo: true,
      error: null,
      numero: (clave: string) => {
        if (!(clave in PARAMETROS)) throw new Error(`Falta ${clave}`);
        return PARAMETROS[clave];
      },
    }),
  };
});

/**
 * Que un formulario que rechaza lo que escribiste **lo diga**.
 *
 * Esto salió contando: de 104 campos con validación en la aplicación, **73 no
 * enseñaban su error**. El esquema rechazaba, `handleSubmit` no llamaba a
 * guardar, y la pantalla no pintaba nada: pulsar el botón no hacía
 * absolutamente nada visible.
 *
 * Es la peor forma del defecto que este proyecto ya conoce —un botón que
 * parece muerto— con un agravante: aquí el botón funciona y es la persona la
 * que no tiene forma de saber qué le falta. Quien lo pulsa dos veces y no ve
 * nada concluye que la aplicación está rota.
 *
 * Lo pidió el cliente el 06/10/2026: «que todos los formularios se validen
 * correctamente... y las notificaciones de error y todo eso».
 */

describe("el formulario de coadministrador", () => {
  it("al guardar sin correo, dice qué falta", async () => {
    const usuario = userEvent.setup();
    const guardar = vi.fn();

    render(
      <CoadministradorForm editing={null} onSave={guardar} />,
    );

    await usuario.click(screen.getByText("Agregar coadministrador"));

    /*
      Las dos mitades. No guardó —eso ya pasaba— **y además se ve el motivo**,
      que es lo que faltaba. Sin la segunda, esta prueba pasaría igual con el
      formulario mudo.
    */
    expect(guardar).not.toHaveBeenCalled();
    /*
      El **mensaje**, no la palabra «correo»: la primera versión buscaba
      `/correo/i` y pasaba en verde contra un formulario mudo, porque casaba con
      la etiqueta del campo. Es la trampa de siempre --un patrón que no
      distingue-- y aquí habría dado por bueno justo lo que se está arreglando.
    */
    expect(await screen.findByText("Escribe el correo")).toBeTruthy();
  });

  it("y con un correo mal escrito, también", async () => {
    const usuario = userEvent.setup();
    const guardar = vi.fn();

    render(
      <CoadministradorForm editing={null} onSave={guardar} />,
    );

    await usuario.type(screen.getByPlaceholderText("Nombre"), "Rosa");
    await usuario.type(screen.getByPlaceholderText("correo@ejemplo.com"), "rosa");
    await usuario.click(screen.getByText("Agregar coadministrador"));

    expect(guardar).not.toHaveBeenCalled();
    expect(await screen.findByText("Ese correo no parece válido")).toBeTruthy();
  });
});

/**
 * Editar no quita lo que no se tocó (17/10/2026).
 *
 * A un coadministrador sin una clave guardada la base le cuenta ese permiso
 * como dado (`puede_coadmin`). El formulario la pintaba apagada, y guardar sin
 * tocar nada se la quitaba en silencio.
 */
describe("al editar un coadministrador", () => {
  it("lo que no tenía escrito sigue dado al guardar", async () => {
    const usuario = userEvent.setup();
    const guardar = vi.fn();

    render(
      <CoadministradorForm
        editing={{
          id: 1,
          uuid: "m-1",
          nombre: "Rosa",
          correo: "rosa@ejemplo.com",
          unidadId: 0,
          estado: "activo",
          fechaInvitacion: "",
          // Solo una clave escrita, y apagada.
          permisos: { visualizarVisitas: false },
        }}
        onSave={guardar}
      />,
    );

    await usuario.click(screen.getByText("Guardar cambios"));

    expect(guardar).toHaveBeenCalledTimes(1);
    const { permisos } = guardar.mock.calls[0][0];
    // Lo escrito se respeta: sin esto, «todo en sí» pasaría también.
    expect(permisos.visualizarVisitas).toBe(false);
    expect(permisos.visualizarCorrespondencia).toBe(true);
    expect(permisos.contestarChat).toBe(true);
  });

  it("un alta nueva sí arranca con todo apagado", async () => {
    const usuario = userEvent.setup();
    const guardar = vi.fn();

    render(<CoadministradorForm editing={null} onSave={guardar} />);
    await usuario.type(screen.getByPlaceholderText("Nombre"), "Rosa");
    await usuario.type(screen.getByPlaceholderText("correo@ejemplo.com"), "rosa@ejemplo.com");
    await usuario.click(screen.getByText("Agregar coadministrador"));

    expect(guardar).toHaveBeenCalledTimes(1);
    const { permisos } = guardar.mock.calls[0][0];
    expect(Object.values(permisos).every((v) => v === false)).toBe(true);
  });
});
