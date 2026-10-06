import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CampoTelefono } from "./CampoTelefono";

/**
 * Que el campo **diga el país que va a guardar**.
 *
 * El 05/10/2026, invitando a un coadministrador desde el navegador, el teléfono
 * llegó a la invitación y el país quedó en null. La pantalla enseñaba
 * «🇨🇴 +57» todo el rato: el campo cae al país por defecto para pintarse, y lo
 * que viajaba a la base era cadena vacía.
 *
 * Y no era de esa pantalla. **Las seis** que usan este campo arrancan con
 * `codigoPais: ""`, así que las seis guardaban el número sin país —que es justo
 * lo que este campo existe para evitar, porque un «3001234567» sin país no se
 * puede marcar desde fuera ni mandar por WhatsApp—.
 *
 * Se intentó cerrar dentro del componente, avisando al padre del país que
 * estaba pintando. **No sobrevive a react-hook-form**: su `reset(initial)` corre
 * después del efecto del hijo y lo deshace. Comprobado en el navegador, no
 * deducido: la pantalla seguía guardando el país vacío con el efecto puesto.
 *
 * Así que el valor inicial es de quien monta el campo, y lo que no se puede
 * recordar lo cuenta `npm run paises`, con la marca en cero.
 */

describe("el campo de teléfono", () => {
  it("sin país, pinta el de por defecto —y por eso quien lo monta debe darle uno", () => {
    /*
      Esto **no es** una garantía de que se guarde `CO`: el campo pinta el país
      por defecto porque un botón en blanco no se entiende, pero lo que viaja a
      la base es lo que tenga el formulario, que aquí sigue siendo `""`.

      Esa distancia entre lo que se ve y lo que se guarda es el defecto que
      salió el 05/10/2026 invitando a un coadministrador: la pantalla decía
      «+57» y `codigo_pais` llegaba en null, en las seis pantallas que montan
      este campo.

      Se intentó cerrar aquí dentro, avisando al padre desde un efecto, y **no
      sobrevive a react-hook-form**: su `reset(initial)` corre después y lo
      deshace. Un arreglo que se pierde según quién te monte es peor que
      ninguno, así que lo cuenta `npm run paises`, con la marca en cero.

      El caso se queda para dejar escrito **por qué** el campo se pinta así y
      que eso no basta: si alguien vuelve a poner el efecto, este comentario le
      dice qué pasó la vez anterior.
    */
    const cambiar = vi.fn();
    render(
      <CampoTelefono
        label="Teléfono"
        codigoPais=""
        onCodigoPaisChange={cambiar}
        telefono=""
        onTelefonoChange={() => {}}
      />,
    );

    expect(screen.getByText("+57")).toBeTruthy();
    // Y no se inventa nada por su cuenta: no avisa de un cambio que no hubo.
    expect(cambiar).not.toHaveBeenCalled();
  });

  it("con un país que la lista no conoce, enseña el de por defecto", () => {
    /*
      El caso que de verdad pasó en los datos: `codigo_pais` tenía `+57`, que
      no es un código ISO. Sin la caída al valor por defecto, el botón se
      quedaba con un «+» suelto.
    */
    render(
      <CampoTelefono
        codigoPais="+57"
        onCodigoPaisChange={() => {}}
        telefono="3001234567"
        onTelefonoChange={() => {}}
      />,
    );
    expect(screen.getByText("+57")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "País del teléfono: Colombia" }),
    ).toBeTruthy();
  });

  it("con país puesto, no lo toca", () => {
    const cambiar = vi.fn();
    render(
      <CampoTelefono
        codigoPais="PE"
        onCodigoPaisChange={cambiar}
        telefono="999999000"
        onTelefonoChange={() => {}}
      />,
    );
    expect(screen.getByText("+51")).toBeTruthy();
    expect(cambiar).not.toHaveBeenCalled();
  });

  it("el número sale solo con dígitos", async () => {
    /*
      Un dato no se guarda ya formateado: el prefijo sale del catálogo y el
      formato se decide al pintarlo. De mezclar las dos cosas venían los
      «+57 601 7561234» con el prefijo dentro, que es lo que no se puede volver
      a separar.
    */
    const usuario = userEvent.setup();
    const escribir = vi.fn();
    render(
      <CampoTelefono
        codigoPais="CO"
        onCodigoPaisChange={() => {}}
        telefono=""
        onTelefonoChange={escribir}
        placeholder="Número de teléfono"
      />,
    );

    await usuario.type(screen.getByPlaceholderText("Número de teléfono"), "3-10");
    expect(escribir).toHaveBeenCalledWith("3");
    expect(escribir).not.toHaveBeenCalledWith("3-");
  });

  it("y el panel que abre trae los prefijos", async () => {
    const usuario = userEvent.setup();
    render(
      <CampoTelefono
        codigoPais="CO"
        onCodigoPaisChange={() => {}}
        telefono=""
        onTelefonoChange={() => {}}
      />,
    );

    await usuario.click(
      screen.getByRole("button", { name: "País del teléfono: Colombia" }),
    );
    // Por nombre y prefijo: es lo que distingue este panel del de `CampoPais`.
    expect(screen.getByRole("radio", { name: "Perú, prefijo 51" })).toBeTruthy();
  });
});
