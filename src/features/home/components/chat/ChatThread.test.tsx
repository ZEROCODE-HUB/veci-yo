import { describe, expect, it, vi } from "vitest";
import { render as montar, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Conversation, MensajeChat } from "@/shared/types";
import { ChatThread } from "./ChatThread";

/**
 * El hueco que deja un mensaje retirado, y quién puede retirarlo.
 *
 * Lo decidió el cliente el 07/10/2026 (REVISAR-A-OJO 137): hasta entonces un
 * mensaje retirado **desaparecía sin dejar rastro** y la conversación perdía
 * mensajes en silencio.
 *
 * Esto se prueba aquí y no con una prueba de datos porque es exactamente lo
 * que una prueba de datos no ve: la base devuelve `retirado_por` y el texto en
 * null, y lo que hay que comprobar es que **la pantalla lo pinta y pinta cuál
 * de los dos casos es**. Ya pasó con el número de lavadora: se guardaba bien y
 * no aparecía en ninguna de las cuatro pantallas que lo tenían que enseñar.
 *
 * Y el botón de retirar, que es el eslabón que faltaba: la función estaba en
 * la base desde el 05/10 y **no había ningún sitio desde donde llamarla**.
 */
/**
 * `ChatThread` pide los guardias de turno para la cabecera de un hilo de
 * seguridad, y eso pasa por React Query. No es el asunto de estas pruebas
 * --la consulta no se usa en un canal de residentes-- pero sin el proveedor el
 * componente ni se monta.
 */
const render = (ui: React.ReactElement) =>
  montar(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      {ui}
    </QueryClientProvider>,
  );

const conversacion: Conversation = {
  id: "c1",
  tipo: "grupo",
  nombre: "Residentes",
  ultimoMensaje: "",
  ultimaHora: "",
  ultimaFecha: "",
  avatarEmoji: "🏘️",
  noLeidos: 0,
};

const mensaje = (parcial: Partial<MensajeChat> = {}): MensajeChat => ({
  id: "m1",
  de: "Sofía Martínez",
  esMio: false,
  texto: "El sábado cortan el agua",
  hora: "13:16",
  fecha: "22/09/2026",
  leido: true,
  unidad: "102",
  ...parcial,
});

describe("la lápida de un mensaje retirado", () => {
  it("dice que lo retiró la administración", () => {
    render(
      <ChatThread
        conversation={conversacion}
        messages={[mensaje({ retiradoPor: "administracion", texto: "" })]}
      />,
    );

    expect(
      screen.getByText("Mensaje retirado por la administración"),
    ).toBeTruthy();
  });

  it("y distingue a quien se arrepintió de lo suyo", () => {
    render(
      <ChatThread
        conversation={conversacion}
        messages={[mensaje({ retiradoPor: "autor", texto: "" })]}
      />,
    );

    /*
      Las dos mitades. Sin la segunda, un componente que pintara siempre
      «Mensaje retirado por la administración» pasaría este caso, y entonces el
      hueco estaría diciendo que el edificio moderó algo que su autor borró.
    */
    expect(screen.getByText("Mensaje retirado")).toBeTruthy();
    expect(screen.queryByText("Mensaje retirado por la administración")).toBeNull();
  });

  it("un mensaje publicado sigue enseñando su texto", () => {
    render(<ChatThread conversation={conversacion} messages={[mensaje()]} />);

    expect(screen.getByText("El sábado cortan el agua")).toBeTruthy();
    expect(screen.queryByText(/Mensaje retirado/)).toBeNull();
  });
});

describe("quién ve el botón de retirar", () => {
  it("quien escribió el mensaje", () => {
    render(
      <ChatThread
        conversation={conversacion}
        messages={[mensaje({ esMio: true })]}
      />,
    );
    expect(screen.getByText("Retirar")).toBeTruthy();
  });

  it("un vecino cualquiera no, sobre lo de otro", () => {
    render(
      <ChatThread
        conversation={conversacion}
        messages={[mensaje({ esMio: false })]}
      />,
    );
    expect(screen.queryByText("Retirar")).toBeNull();
  });

  it("la administración sí, sobre lo de otro", () => {
    render(
      <ChatThread
        conversation={conversacion}
        messages={[mensaje({ esMio: false })]}
        puedeModerar
      />,
    );
    expect(screen.getByText("Retirar")).toBeTruthy();
  });

  it("y sobre uno ya retirado no se ofrece otra vez", () => {
    render(
      <ChatThread
        conversation={conversacion}
        messages={[mensaje({ retiradoPor: "autor", texto: "" })]}
        puedeModerar
      />,
    );
    expect(screen.queryByText("Retirar")).toBeNull();
  });
});

describe("retirar pregunta antes", () => {
  it("no retira al primer toque: pide confirmación", async () => {
    const onRetirar = vi.fn();
    render(
      <ChatThread
        conversation={conversacion}
        messages={[mensaje({ esMio: true })]}
        onRetirar={onRetirar}
      />,
    );

    await userEvent.click(screen.getByText("Retirar"));

    /*
      Retirar es de ida --un disparador impide volver a publicar lo retirado--
      así que un toque accidental no puede llevarse lo que alguien escribió.
    */
    expect(onRetirar).not.toHaveBeenCalled();
    expect(screen.getByText("¿Retirarlo? No se puede deshacer.")).toBeTruthy();

    await userEvent.click(screen.getByText("Sí, retirar"));
    expect(onRetirar).toHaveBeenCalledWith("m1");
  });

  it("y cancelar lo deja como estaba", async () => {
    const onRetirar = vi.fn();
    render(
      <ChatThread
        conversation={conversacion}
        messages={[mensaje({ esMio: true })]}
        onRetirar={onRetirar}
      />,
    );

    await userEvent.click(screen.getByText("Retirar"));
    await userEvent.click(screen.getByText("Cancelar"));

    expect(onRetirar).not.toHaveBeenCalled();
    expect(screen.getByText("El sábado cortan el agua")).toBeTruthy();
  });
});
