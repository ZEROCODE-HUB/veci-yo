import { describe, expect, it } from "vitest";
import { destinoDeAviso } from "./destinoDeAviso";

describe("a dónde lleva tocar un aviso", () => {
  it("el chat, a su conversación (como antes)", () => {
    expect(destinoDeAviso({ tipo: "mensaje_de_chat", entidadTipo: "conversacion", entidadId: "c1" })).toEqual({
      pantalla: "ChatConversacion",
      parametros: { conversationId: "c1" },
    });
  });

  it("un menor por revisar abre la ficha de esa estancia", () => {
    expect(destinoDeAviso({ tipo: "menor_por_revisar", entidadTipo: "visita", entidadId: "v1" })).toEqual({
      pantalla: "Visitas",
      parametros: { abrir: "v1" },
    });
  });

  it("una visita que entró lleva a la lista, no a la ficha de estancia", () => {
    expect(destinoDeAviso({ tipo: "visita_ingreso", entidadTipo: "visita", entidadId: "v1" })).toEqual({
      pantalla: "Visitas",
    });
  });

  it("paquetes, reservas y reconocimientos van a su módulo", () => {
    expect(destinoDeAviso({ tipo: "correspondencia_recibida", entidadTipo: "correspondencia", entidadId: "x" })?.pantalla).toBe("Correspondencia");
    expect(destinoDeAviso({ tipo: "reserva_cancelada", entidadTipo: "reserva_zona", entidadId: "x" })?.pantalla).toBe("ZonasComunes");
    expect(destinoDeAviso({ tipo: "reconocimiento_recibido", entidadTipo: "reconocimiento", entidadId: "x" })?.pantalla).toBe("CuadroHonor");
  });

  it("el S.O.S. no lleva a ninguna", () => {
    expect(destinoDeAviso({ tipo: "sos_activado", entidadTipo: "alarma_sos", entidadId: "s1" })).toBeNull();
  });
});
