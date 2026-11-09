import { beforeEach, describe, expect, it, vi } from "vitest";
import { render as montar, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "@/stores";
import type { ContactoDeLaVivienda } from "../services/contactos.repo";
import { ContactosDeLaVivienda } from "./ContactosDeLaVivienda";

/**
 * A quién contactar en una vivienda, desde el directorio (09/11/2026,
 * Correcciones filas 8 y 9): una tarjeta por contacto, numerada en el orden
 * de contactación, y la llamada por la app solo si a la portería se la
 * habilitaron.
 *
 * Lo que trae la base se dobla: quién la puede pedir lo comprueba la propia
 * función `contactos_de_la_vivienda`.
 */
let contactos: ContactoDeLaVivienda[] = [];
vi.mock("../services/contactos.repo", () => ({
  obtenerContactosDeLaVivienda: () => Promise.resolve(contactos),
}));
vi.mock("@/shared/hooks", async (original) => ({
  ...(await original<typeof import("@/shared/hooks")>()),
  useNavegacion: () => ({ navigate: vi.fn() }),
  useCondominioActivo: () => "c1",
  useNombreDelCitofono: () => "Citófono Virtual",
}));

const persona = (p: Partial<ContactoDeLaVivienda>): ContactoDeLaVivienda => ({
  membresiaId: p.nombre ?? "x",
  nombre: "x",
  rol: "residente",
  esAnfitrionPrimario: false,
  esAdminPrimario: false,
  codigoPais: "CO",
  telefono: "3001112233",
  whatsapp: false,
  chat: false,
  emergencia: null,
  alterno: null,
  recibeLlamadasApp: true,
  tieneCuenta: true,
  ...p,
});

const render = () =>
  montar(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ContactosDeLaVivienda unidadId="u-102" onAbrirChat={vi.fn()} />
    </QueryClientProvider>,
  );

beforeEach(() => {
  contactos = [
    persona({ nombre: "Ana", rol: "propietario" }),
    persona({
      nombre: "Luis",
      esAnfitrionPrimario: true,
      emergencia: { nombre: "Marta", codigoPais: "CO", telefono: "3009998877" },
    }),
    persona({ nombre: "Diego", rol: "huesped_temporal" }),
  ];
});

describe("orden de contactación", () => {
  it("una tarjeta por contacto: huésped, anfitrión, su emergencia y el resto", async () => {
    useAuthStore.setState({ rolActivo: "administrador", condominios: [] });
    render();
    expect(await screen.findByText("Orden de contactación")).toBeTruthy();
    const nombres = ["Diego", "Luis", "Marta", "Ana"].map((n) => screen.getByText(n));
    for (let i = 1; i < nombres.length; i++) {
      // Cada nombre va después del anterior en la página.
      expect(nombres[i - 1].compareDocumentPosition(nombres[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    expect(screen.getByText("Contacto de emergencia del anfitrión")).toBeTruthy();
  });
});

describe("llamar por el citófono desde la portería", () => {
  it("con las llamadas habilitadas, se ofrece", async () => {
    useAuthStore.setState({
      rolActivo: "guardia",
      condominios: [{ rol: "guardia", permisos: { llamadas: true } }] as never,
    });
    render();
    expect((await screen.findAllByText("📱 Llamar por el Citófono Virtual")).length).toBe(3);
  });

  it("sin ellas no se ofrece, y se dice por qué", async () => {
    useAuthStore.setState({
      rolActivo: "guardia",
      condominios: [{ rol: "guardia", permisos: {} }] as never,
    });
    render();
    await screen.findByText("Orden de contactación");
    expect(screen.queryByText("📱 Llamar por el Citófono Virtual")).toBeNull();
    expect(
      screen.getAllByText("La administración no te habilitó las llamadas por el Citófono Virtual.").length,
    ).toBe(3);
  });
});
