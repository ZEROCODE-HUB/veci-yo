import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Conversation } from "@/shared/types";
import { ChatConversationList } from "./ChatConversationList";

/**
 * La lista de conversaciones, y el silencio.
 *
 * El cliente pidió silenciar el 02/10/2026: el canal de residentes de un
 * edificio grande suena igual que el hilo con la portería, y la única salida
 * era no mirar.
 *
 * Lo que apaga, hoy, es el contador de no leídos: un mensaje de chat **no
 * genera notificación** en Veciyo, así que esa cifra es lo único que avisa. Por
 * eso el caso central no es que el interruptor llame a su función --eso es
 * fontanería-- sino que **la lista lo diga**: un interruptor que se pulsa y no
 * cambia nada a la vista es la novena casilla decorativa.
 */
const conv = (parcial: Partial<Conversation> = {}): Conversation => ({
  id: "c1",
  tipo: "grupo",
  nombre: "Residentes",
  ultimoMensaje: "Corte de agua el sábado",
  ultimaHora: "13:16",
  ultimaFecha: "22/09/2026",
  avatarEmoji: "🏘️",
  noLeidos: 3,
  ...parcial,
});

describe("la lista de conversaciones", () => {
  it("enseña el contador cuando no está silenciada", () => {
    render(
      <ChatConversationList
        conversations={[conv()]}
        onSelect={() => {}}
        onSilenciar={() => {}}
        emptyMessage="No hay conversaciones"
      />,
    );

    screen.getByText("3");
    screen.getByRole("switch", { name: "Silenciar Residentes" });
  });

  it("y silenciada lo dice, en el nombre y en el interruptor", () => {
    render(
      <ChatConversationList
        conversations={[conv({ silenciado: true, noLeidos: 0 })]}
        onSelect={() => {}}
        onSilenciar={() => {}}
        emptyMessage="No hay conversaciones"
      />,
    );

    /*
      `aria-checked`, no solo el emoji: react-native-web **no traduce**
      `accessibilityState`, así que sin el atributo el estado existiría nada más
      en el dibujo. Es la quinta vez que este error aparece en el proyecto.
    */
    const interruptor = screen.getByRole("switch", {
      name: "Volver a oír Residentes",
    });
    expect(interruptor.getAttribute("aria-checked")).toBe("true");

    // Y el contador no está: silenciar es, hoy, apagar esa cifra.
    expect(screen.queryByText("3")).toBeNull();
  });

  it("al pulsarlo, lo pide para esa conversación", async () => {
    const silenciar = vi.fn();
    render(
      <ChatConversationList
        conversations={[conv()]}
        onSelect={() => {}}
        onSilenciar={silenciar}
        emptyMessage="No hay conversaciones"
      />,
    );

    await userEvent.click(
      screen.getByRole("switch", { name: "Silenciar Residentes" }),
    );
    expect(silenciar).toHaveBeenCalledWith(
      expect.objectContaining({ id: "c1" }),
    );
  });

  it("y silenciar no abre la conversación", async () => {
    /*
      El interruptor vive **dentro** de la fila, que es pulsable para entrar.
      Sin este caso, un control que no detuviera el toque abriría el hilo al
      silenciarlo --y entrar marca leído, que es justo lo contrario de lo que
      se pedía--.
    */
    const abrir = vi.fn();
    render(
      <ChatConversationList
        conversations={[conv()]}
        onSelect={abrir}
        onSilenciar={() => {}}
        emptyMessage="No hay conversaciones"
      />,
    );

    await userEvent.click(
      screen.getByRole("switch", { name: "Silenciar Residentes" }),
    );
    expect(abrir).not.toHaveBeenCalled();
  });

  it("sin forma de silenciar, no se pinta el interruptor", () => {
    // La pantalla del guardia no lo pasa: no hay a quién llamar.
    render(
      <ChatConversationList
        conversations={[conv()]}
        onSelect={() => {}}
        emptyMessage="No hay conversaciones"
      />,
    );

    expect(screen.queryByRole("switch")).toBeNull();
  });
});
