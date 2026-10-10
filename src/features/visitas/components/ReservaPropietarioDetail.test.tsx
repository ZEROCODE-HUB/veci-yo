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
      onCambiarCuantos={() => {}}
      {...extra}
    />,
  );

describe("ver los documentos de cada huésped", () => {
  /*
    El boton «Ver documentacion», el modal y el componente que pinta las fotos
    estaban escritos desde el principio, y **nunca aparecian**: el boton se
    ofrece si `invitado.documentos` trae algo, y esa propiedad no la rellenaba
    nadie. La cadena de tres eslabones rompiendose en el ultimo, otra vez.

    Lo dijo el cliente el 09/10/2026: «la anfitriona no tiene un boton o algo
    para ver el registro de cada uno de los huespedes y sus documentos».
  */

  it("se ofrece cuando subió algo", () => {
    pintar(invitado({ documentos: ["v1/documento-frente-i1.jpg"] }));

    expect(screen.getByText(textoCompleto("Ver documentación"))).toBeDefined();
  });

  it("y no cuando no hay nada que ver", () => {
    // El control: un boton que abre una ventana vacia es peor que ninguno.
    pintar(invitado({ documentos: [] }));

    expect(screen.queryByText(textoCompleto("Ver documentación"))).toBeNull();
  });
});

describe("un menor en la lista de la anfitriona", () => {
  /*
    El 09/10/2026 el cliente termino su registro entero, cerro bien, y en su
    lista el niño salia con «Terminos y Condiciones aceptados» en ambar y un
    boton «Aprobar por excepcion» al lado: «¿por que el menor aparece como que
    no acepto tyc y esas cosas?? yo ya termine todo el registro».

    Porque la pantalla le pedia lo mismo que a un adulto. Y no es opinable:
    `cerrar_precheckin` excluye a los menores de los terminos y del documento
    con un `and not es_menor`, asi que un preregistro cierra sin ninguna de
    las dos. La pantalla pedia algo que nadie pide.
  */

  it("no le pide términos ni verificación", () => {
    pintar(invitado({ esMenor: true, nombre: "Martina Rojas" }));

    expect(screen.queryByText(/Términos y Condiciones aceptados/)).toBeNull();
    expect(screen.queryByText(/Verificación superada/)).toBeNull();
  });

  it("ni le ofrece aprobar por excepción, que no tiene sentido en un niño", () => {
    pintar(invitado({ esMenor: true }));

    expect(screen.queryByText("Aprobar por excepción")).toBeNull();
  });

  it("pero sí lo que de verdad le hace falta", () => {
    // El control: sin esto, esconder la lista entera pasaria los dos de
    // arriba igual de verde.
    pintar(invitado({ esMenor: true }));

    expect(screen.getByText(/Documentación completada/)).toBeTruthy();
    expect(screen.getByText(/TRA\/SIRE entrada/)).toBeTruthy();
  });

  it("y a un adulto se le sigue pidiendo todo", () => {
    // El otro lado: la lista corta es solo para los menores.
    pintar(invitado({ esMenor: false }));

    expect(screen.getByText(/Términos y Condiciones aceptados/)).toBeTruthy();
    expect(screen.getByText(/Verificación superada/)).toBeTruthy();
  });
});

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

  it("no ofrece anotar el reporte mientras el huésped no haya entrado", () => {
    /*
      La regla del KT: la TRA declara que alguien **se alojo**, asi que no se
      reporta antes de que llegue. Desde el 09/10/2026 la sujeta la funcion
      `reportar-tra`, que responde 409 sin ingreso registrado; aqui queda lo
      que corresponde a una pantalla, que es no ofrecerlo.
    */
    pintar(invitado({ llego: false }));
    expect(screen.queryByText(textoCompleto("Ya hice TRA/SIRE"))).toBeNull();
  });

  it("y en cuanto la portería confirma el ingreso, sí", () => {
    pintar(invitado({ llego: true }));
    expect(screen.getByText(textoCompleto("Ya hice TRA/SIRE"))).toBeDefined();
  });

  it("aquí ya no se reporta: eso es por estancia, no por persona", () => {
    /*
      Habia dos botones por invitado --«Reportar TRA» y «Reportar SIRE»-- que
      **no reportaban nada**: insertaban una fila en `reporte_tra`, que es una
      anotacion del anfitrion, sin llamar a ninguna funcion del ministerio. Y
      el segundo estaba ademas mal nombrado: hacia lo mismo que el primero con
      `movimiento: salida`, que es la salida del TRA, no el SIRE.

      Reportar es por estancia: el titular va a `/one/` y cada acompañante a
      `/two/` con el codigo que devolvio el primero. Los botones de verdad
      estan arriba, en `EnlacePrecheckin`.
    */
    pintar(invitado({ llego: true, horaSalida: "03:04" }));

    expect(screen.queryByText(textoCompleto("Reportar TRA"))).toBeNull();
    expect(screen.queryByText(textoCompleto("Reportar SIRE"))).toBeNull();
  });

  it("y un reporte simulado se marca como tal", () => {
    /*
      Mientras `TRA_ACTIVO` este apagado **todo es un ensayo**, y hasta hoy un
      reporte simulado y uno declarado ante el MinCIT se veian con el mismo
      ✅. Era la misma forma que la ❌ del menor: la pantalla afirmando algo
      que no paso.
    */
    pintar(
      invitado({
        timeline: { trasideEntrada: true, trasideEntradaSimulada: true },
      }),
    );

    expect(screen.getByText("SIMULADO")).toBeTruthy();
  });

  it("y uno enviado de verdad, no", () => {
    // El control: sin esto, poner «SIMULADO» siempre pasaria el de arriba.
    pintar(
      invitado({
        timeline: { trasideEntrada: true, trasideEntradaSimulada: false },
      }),
    );

    expect(screen.queryByText("SIMULADO")).toBeNull();
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

/**
 * Los botones del ministerio, por estancia.
 *
 * Se retiraron el 09/10/2026 porque se ofrecian antes de tiempo y solo podian
 * fallar. Vuelven como manda el KT (4.2.6): los habilita la porteria al marcar
 * la entrada. Las dos mitades, porque un boton que sale siempre pasaria la
 * segunda y uno que no sale nunca, la primera.
 */
describe("los reportes al ministerio", () => {
  it("no se ofrecen mientras nadie haya entrado, y se dice qué falta", () => {
    pintar(invitado({ llego: false }));
    expect(screen.queryByText(textoCompleto("Reportar al ministerio (TRA)"))).toBeNull();
    expect(screen.queryByText(textoCompleto("Reporte de extranjeros (SIRE)"))).toBeNull();
    expect(screen.getByText(/se habilitan cuando la portería/i)).toBeDefined();
  });

  it("y aparecen cuando la portería marca la entrada", () => {
    pintar(invitado({ llego: true }));
    expect(screen.getByText(textoCompleto("Reportar al ministerio (TRA)"))).toBeDefined();
    expect(screen.getByText(textoCompleto("Reporte de extranjeros (SIRE)"))).toBeDefined();
  });
});
