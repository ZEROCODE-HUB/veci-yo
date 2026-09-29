import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Invitado, VisitaItem } from "@/shared/types";
import { textoCompleto } from "@/pruebas/texto";
import { ReservaPropietarioDetail } from "./ReservaPropietarioDetail";

/**
 * El precheckin del huésped, visto por la anfitriona.
 *
 * Aquí vive la regla que manda el KT y que se comprobó a mano con Carlos
 * Rojas: **no se reporta a la autoridad a alguien que todavía no ha entrado**.
 * La entrada se reporta cuando la portería confirma el ingreso; la salida,
 * cuando hay salida registrada.
 *
 * Es una regla que solo se ve mirando la pantalla --si aparece o no un
 * botón-- y que costó media noche de coordinación entre tres sesiones para
 * comprobarla una vez.
 */
const invitado = (parcial: Partial<Invitado> = {}): Invitado => ({
  uuid: "i1",
  nombre: "Carlos Rojas",
  llego: false,
  timeline: { preregistroEnviado: true },
  ...parcial,
});

const visita = (inv: Invitado): VisitaItem =>
  ({
    uuid: "v1",
    id: 1,
    nombre: "Reserva de Carlos Rojas",
    tipo: "huesped-temporal",
    depto: "102",
    invitados: [inv],
    estado: "Programada",
  }) as unknown as VisitaItem;

const pintar = (inv: Invitado, extra: Record<string, unknown> = {}) =>
  render(
    <ReservaPropietarioDetail
      item={visita(inv)}
      onBack={() => {}}
      onUpdateInvitado={() => {}}
      onReportTraSire={() => {}}
      onAcceptTerms={() => {}}
      onApproveVerification={() => {}}
      {...extra}
    />,
  );

describe("el precheckin, visto por la anfitriona", () => {
  it("enseña los seis pasos", () => {
    pintar(invitado());
    for (const paso of [
      "Link de preregistro enviado",
      "Documentación completada",
      "Términos y Condiciones aceptados",
      "Verificación superada",
      "Ingreso al edificio (TRA/SIRE entrada)",
      "Salida del edificio (TRA/SIRE salida)",
    ]) {
      expect(screen.getByText(textoCompleto(paso))).toBeDefined();
    }
  });

  it("no ofrece reportar la entrada mientras el huésped no haya entrado", () => {
    /*
      La regla del KT. Antes la condicion miraba `aprobado`, que con el
      timeline real solo es cierto **despues** del reporte: el boton no habria
      aparecido nunca.
    */
    pintar(invitado({ llego: false }));
    expect(screen.queryByText(textoCompleto("Reportar TRA"))).toBeNull();
    expect(screen.queryByText(textoCompleto("Ya hice TRA/SIRE"))).toBeNull();
  });

  it("y en cuanto la portería confirma el ingreso, sí", () => {
    pintar(invitado({ llego: true }));
    expect(screen.getByText(textoCompleto("Reportar TRA"))).toBeDefined();
    expect(screen.getByText(textoCompleto("Ya hice TRA/SIRE"))).toBeDefined();
  });

  it("la salida se reporta solo con salida registrada", () => {
    pintar(invitado({ llego: true }));
    expect(screen.queryByText(textoCompleto("Reportar SIRE"))).toBeNull();

    pintar(invitado({ llego: true, horaSalida: "03:04" }));
    expect(screen.getByText(textoCompleto("Reportar SIRE"))).toBeDefined();
  });

  it("y ya reportado no se vuelve a ofrecer", () => {
    pintar(
      invitado({
        llego: true,
        horaSalida: "03:04",
        traSireReported: true,
        timeline: { trasideEntrada: true, trasideSalida: true },
      }),
    );
    expect(screen.getByText(textoCompleto("TRA/SIRE reportado"))).toBeDefined();
    expect(screen.queryByText(textoCompleto("Ya hice TRA/SIRE"))).toBeNull();
  });

  it("dice quién aprobó los términos, no solo que se aprobaron", () => {
    /*
      «(aprobado por anfitrion)». Un si anonimo no sirve: los terminos se
      aceptaron por excepcion y la base guarda quien lo hizo.
    */
    /*
      `terminosAprobadoPor` vive en el invitado. El repositorio lo escribe
      **tambien** dentro de `timeline`, y el componente leia uno u otro segun
      la linea: el punto del timeline de un sitio y su etiqueta del otro.
      Ahora los dos leen el campo con tipo.
    */
    pintar(
      invitado({
        terminosAprobadoPor: "anfitrion",
        timeline: { terminosAceptados: true },
      }),
    );
    expect(
      screen.getByText(
        textoCompleto(
          "Términos y Condiciones aceptados (aprobado por anfitrión)",
        ),
      ),
    ).toBeDefined();
  });

  it("aprobar por excepción avisa con el invitado, no con su posición", async () => {
    // El uuid y no el indice: borrar o reordenar un invitado desplazaria los
    // datos de otra persona.
    const aceptar = vi.fn();
    pintar(invitado({ timeline: {} }), { onAcceptTerms: aceptar });
    await userEvent.click(
      screen.getByText(textoCompleto("Aprobar por excepción")),
    );
    expect(aceptar).toHaveBeenCalledWith("i1");
  });

  it("y la verificación distingue aprobar de aprobar con hallazgos", async () => {
    const aprobar = vi.fn();
    pintar(invitado({ timeline: {} }), { onApproveVerification: aprobar });

    await userEvent.click(screen.getByText(textoCompleto("Aprobar")));
    expect(aprobar).toHaveBeenCalledWith("i1", false);

    await userEvent.click(
      screen.getByText(textoCompleto("Aprobar con hallazgos")),
    );
    expect(aprobar).toHaveBeenCalledWith("i1", true);
  });

  it("deja corregir el nombre y el documento de quien no ha llegado", async () => {
    /*
      `actualizarInvitado` estaba escrita en el repositorio y ningún control la
      llamaba: el anfitrión no tenía forma de arreglar un nombre mal escrito.
      Importa porque la portería compara el documento con la persona que tiene
      delante. El cliente lo aprobó el 29/09/2026.
    */
    const guardado = vi.fn();
    pintar(
      invitado({ documentoNumero: "1098765432", documentos: ["doc.jpg"] }),
      { onUpdateInvitado: guardado },
    );

    await userEvent.click(screen.getByText("Ver documentación"));
    await userEvent.click(screen.getByText("Corregir estos datos"));

    const nombre = screen.getByDisplayValue("Carlos Rojas");
    await userEvent.clear(nombre);
    await userEvent.type(nombre, "Carlos Rojas Díaz");
    await userEvent.click(screen.getByText("Guardar corrección"));

    expect(guardado).toHaveBeenCalledWith(0, {
      nombre: "Carlos Rojas Díaz",
      documentoNumero: "1098765432",
    });
  });

  it("y no lo deja si ya registró su ingreso", async () => {
    // Ese es el dato que la portería comparó en la puerta: ya no se toca.
    pintar(
      invitado({
        llego: true,
        documentoNumero: "1098765432",
        documentos: ["doc.jpg"],
      }),
    );

    await userEvent.click(screen.getByText("Ver documentación"));

    expect(screen.queryByText("Corregir estos datos")).toBeNull();
    // La frase entera, que es inequívoca: con un trozo casan los contenedores.
    expect(
      screen.getByText(
        textoCompleto(
          "Ya registró su ingreso, así que estos datos no se pueden corregir: son los que la portería comparó en la puerta.",
        ),
      ),
    ).toBeDefined();
  });
});
