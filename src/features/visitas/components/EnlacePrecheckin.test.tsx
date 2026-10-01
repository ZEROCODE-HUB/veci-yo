import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { textoCompleto } from "@/pruebas/texto";

/**
 * El enlace de preregistro, visto por la anfitriona.
 *
 * Es el botón que cierra el hueco más viejo de este flujo: el primer paso del
 * timeline decía «🔗 Link de preregistro enviado» y estaba **cableado a
 * `true`**. Se pintaba en verde para todo el mundo, siempre, porque no había
 * ningún enlace que enviar.
 *
 * Lo que se comprueba aquí es lo que solo se ve mirando la pantalla: que el
 * enlace aparece, que se copia el enlace y no la etiqueta, y que se avisa de
 * que no se va a poder volver a ver. Esto último importa: en la base solo vive
 * su sha256, así que cerrar la ventana sin copiarlo lo pierde de verdad.
 */
const abrirPrecheckin = vi.fn();
const reemitirAccesoHuesped = vi.fn();
const setStringAsync = vi.fn(async () => true);

vi.mock("expo-clipboard", () => ({ setStringAsync }));
vi.mock("../services/precheckin.repo", () => ({
  abrirPrecheckin,
  reemitirAccesoHuesped,
}));
vi.mock("@/stores", () => ({
  useUIStore: () => ({ addToast: () => {} }),
}));

const { EnlacePrecheckin } = await import("./EnlacePrecheckin");

const ENLACE = "https://veciyo-web-seven.vercel.app/access/" + "a".repeat(64);
const ACCESO = "https://veciyo-web-seven.vercel.app/invitacion?token=" + "b".repeat(64);

beforeEach(() => {
  abrirPrecheckin.mockReset();
  setStringAsync.mockClear();
  abrirPrecheckin.mockResolvedValue({ enlace: ENLACE, correoEnviado: false });
  reemitirAccesoHuesped.mockReset();
  reemitirAccesoHuesped.mockResolvedValue({ enlace: ACCESO, correoEnviado: false });
});

describe("mandarle el preregistro al huésped", () => {
  it("lo genera y lo enseña", async () => {
    render(<EnlacePrecheckin visitaUuid="v1" yaEnviado={false} cerrado={false} />);

    await userEvent.click(screen.getByText(textoCompleto("Enviar preregistro")));

    expect(abrirPrecheckin).toHaveBeenCalledWith("v1");
    expect(await screen.findByText(textoCompleto(ENLACE))).toBeDefined();
  });

  it("y copia el enlace, no la etiqueta", async () => {
    /*
      Este boton es de los que parecen decorativos --en este proyecto han
      salido ocho que lo eran-- y la unica forma de saberlo es comprobar que
      le llega al portapapeles.
    */
    render(<EnlacePrecheckin visitaUuid="v1" yaEnviado={false} cerrado={false} />);
    await userEvent.click(screen.getByText(textoCompleto("Enviar preregistro")));
    await userEvent.click(await screen.findByText(textoCompleto("Copiar enlace")));

    expect(setStringAsync).toHaveBeenCalledWith(ENLACE);
    expect(screen.getByText(textoCompleto("✓ Copiado"))).toBeDefined();
  });

  it("avisa de que no se va a poder volver a ver", async () => {
    // No es una cortesía: en la base solo vive el sha256. Si se cierra la
    // ventana sin copiarlo, hay que generar otro y el primero muere.
    render(<EnlacePrecheckin visitaUuid="v1" yaEnviado={false} cerrado={false} />);
    await userEvent.click(screen.getByText(textoCompleto("Enviar preregistro")));

    expect(await screen.findByText(/no se puede volver a mostrar/)).toBeDefined();
  });

  it("si ya se mandó uno, lo dice y avisa de que el viejo muere", () => {
    render(<EnlacePrecheckin visitaUuid="v1" yaEnviado cerrado={false} />);

    expect(screen.getByText(textoCompleto("Generar un enlace nuevo"))).toBeDefined();
    expect(screen.getByText(/el anterior deja de funcionar/)).toBeDefined();
  });

  it("y si el huésped ya lo completó, deja de ofrecer el preregistro", () => {
    /*
      El control que evita el error mas facil: seguir ofreciendo "reenviar el
      preregistro" a quien ya termino, que ademas invalidaria el enlace con el
      que lo hizo.
    */
    render(<EnlacePrecheckin visitaUuid="v1" yaEnviado cerrado />);

    expect(screen.getByText(/ya completó su preregistro/)).toBeDefined();
    expect(screen.queryByText(textoCompleto("Generar un enlace nuevo"))).toBeNull();
    expect(screen.queryByText(textoCompleto("Enviar preregistro"))).toBeNull();
  });

  it("y ofrece en su lugar reenviarle el acceso a la app", async () => {
    /*
      Este boton existe porque la demo se quedo atascada justo aqui: el acceso
      se ensena UNA vez al cerrar el preregistro, quien lo vio cerro la
      pantalla sin copiarlo, y no habia forma de recuperarlo. Hubo que
      emitirlo a mano contra la base.
    */
    render(<EnlacePrecheckin visitaUuid="v1" yaEnviado cerrado />);

    await userEvent.click(
      screen.getByText(textoCompleto("Reenviar su acceso a la app")),
    );

    expect(reemitirAccesoHuesped).toHaveBeenCalledWith("v1");
    expect(await screen.findByText(textoCompleto(ACCESO))).toBeDefined();
  });

  it("y avisa de que el enlace viejo deja de valer", async () => {
    // No es una cortesia: se reemite sobre la misma invitacion, asi que el
    // anterior muere. Si el huesped tenia ese guardado, deja de servirle.
    render(<EnlacePrecheckin visitaUuid="v1" yaEnviado cerrado />);
    await userEvent.click(
      screen.getByText(textoCompleto("Reenviar su acceso a la app")),
    );

    expect(await screen.findByText(/anterior deja de valer/)).toBeDefined();
  });

  it("con el correo encendido no enseña el enlace", async () => {
    // Cuando haya proveedor de correo, el enlace vive solo en el buzón del
    // huésped. Mostrarlo aquí además sería una copia de más de una llave.
    abrirPrecheckin.mockResolvedValue({ enlace: ENLACE, correoEnviado: true });
    render(<EnlacePrecheckin visitaUuid="v1" yaEnviado={false} cerrado={false} />);

    await userEvent.click(screen.getByText(textoCompleto("Enviar preregistro")));

    expect(await screen.findByText(/Le llegó por correo/)).toBeDefined();
    expect(screen.queryByText(textoCompleto(ENLACE))).toBeNull();
  });
});
