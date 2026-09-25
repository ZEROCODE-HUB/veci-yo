import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { textoCompleto } from "@/pruebas/texto";
import type { VisitaItem } from "@/shared/types";

/**
 * La pantalla de Visitas, por rol.
 *
 * Es la que el cliente pidió analizar entera --«analiza toda la pantalla
 * mejor»-- y donde salieron dos controles que no podían hacer nada. El
 * arreglo vive en `permisosDeVisitas`, que ya tiene sus casos; lo que **no**
 * comprobaba nadie es que la pantalla los use. Arreglé `mostrarTipoTabs` en
 * el hook y que la pantalla lo mirara dependía de que me acordara.
 *
 * Aquí se monta la pantalla de verdad: los filtros y los permisos corren sin
 * doblar, y solo se doblan las fuentes de datos.
 */
let rol = "huesped-temporal";
let visitas: VisitaItem[] = [];

/*
  React Query doblado entero: las fuentes de datos ya vienen dobladas por
  hook, asi que aqui solo estorbaria pidiendo un `QueryClientProvider`. Se
  devuelven los tres que la pantalla y sus hijos usan; si falta uno, vitest lo
  dice por su nombre, que es una forma comoda de descubrir el arbol.
*/
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: null, isLoading: false }),
  useMutation: () => ({ mutate: () => {}, mutateAsync: async () => {}, isPending: false }),
  useQueryClient: () => ({ invalidateQueries: () => {}, setQueryData: () => {} }),
}));
vi.mock("@/stores", () => ({
  useAuthStore: (selector: (e: unknown) => unknown) =>
    selector({
      rolActivo: rol,
      modo: "real",
      // `useConsumoVerificaciones` mira la primera vivienda del usuario.
      unidades: [{ unidadId: "u1", codigo: "102" }],
      condominios: [],
    }),
  useUbicacionStore: (selector: (e: unknown) => unknown) =>
    selector({ ubicaciones: [{ codigo: "102", favorito: true }] }),
  useAdminStore: (selector: (e: unknown) => unknown) =>
    selector({ estacionamientosVisitantes: { total: 1, ocupados: 0 } }),
  useUIStore: (selector?: (e: unknown) => unknown) => {
    const estado = { addToast: () => {} };
    return selector ? selector(estado) : estado;
  },
}));
vi.mock("@/shared/hooks", () => ({
  useUnidadActiva: () => ({ unidadId: "u1", codigo: "102" }),
  /*
    `torres` y `codigosDe` los usa el panel de filtros para llenar sus dos
    desplegables. Antes eran listas fijas --«Torre 1», «Torre 2», «Torre 3»--
    y se podia filtrar por una torre que no existe en este condominio.
  */
  useUnidadesDisponibles: () => ({
    resolverUnidad: () => ({ unidadId: "u1" }),
    torres: ["1", "2"],
    codigosDe: () => ["101", "102", "205"],
  }),
  useCondominioActivo: () => "c1",
}));
vi.mock("@/features/propietario/hooks/useHuespedesTemporales", () => ({
  useHuespedesTemporales: () => ({
    tieneSuscripcion: true,
    showPayment: false,
    setShowPayment: () => {},
    precio: null,
    pagoSimulado: true,
    irAlPago: () => {},
    confirmarPago: () => {},
    paymentLoading: false,
  }),
}));
vi.mock("@/features/visitas/hooks", async (original) => ({
  ...((await original()) as Record<string, unknown>),
  useVisitas: () => ({
    // La pantalla lo llama `items`, no `visitas`.
    items: visitas,
    cargando: false,
    actualizarVisita: () => {},
    registrarAnuncio: () => {},
    eliminarVisita: () => {},
    marcarLlegadaInvitado: () => {},
    registrarHoraInvitado: () => {},
    verificarDocumentoInvitado: () => {},
    actualizarInvitado: () => {},
    adjuntarFotosVisita: () => {},
    reportarTraSire: () => {},
    aceptarTerminos: () => {},
    verificarAntecedentes: () => {},
    comprarPaquete: () => {},
    comprandoPaquete: false,
  }),
  useEstacionamientosVisita: () => ({ porVisita: {}, cupos: [] }),
}));

const { VisitasHistorialScreen } = await import("./VisitasHistorialScreen");

const visita = (parcial: Partial<VisitaItem> = {}): VisitaItem =>
  ({
    uuid: "v1",
    id: 1,
    nombre: "Lucía Fernández",
    tipo: "amigos",
    depto: "102",
    torre: "1",
    estado: "Programada",
    invitados: [],
    fechaDesde: "25/09/2026",
    ...parcial,
  }) as unknown as VisitaItem;

beforeEach(() => {
  rol = "huesped-temporal";
  visitas = [];
});

describe("la pantalla de visitas de un huésped", () => {
  it("no pinta una barra de una sola pestaña", () => {
    /*
      Sin reservas de huesped, «Todos» y «Visitas» enseñarian lo mismo, asi
      que el hook deja una sola pestaña. La pantalla la pintaba igual: se leia
      «Visitas», se pulsaba «Visitas», y seguia en «Visitas».
    */
    render(<VisitasHistorialScreen />);
    expect(screen.queryByText(textoCompleto("Huéspedes"))).toBeNull();
    expect(screen.queryByText(textoCompleto("Todos"))).toBeNull();
  });

  it("y al propietario sí se la pinta, porque tiene tres", () => {
    // Control: si un dia `mostrarTipoTabs` se quedara siempre en falso, la
    // barra desapareceria para todos y esta prueba lo dice.
    rol = "propietario";
    render(<VisitasHistorialScreen />);
    expect(screen.getByText(textoCompleto("Huéspedes"))).toBeDefined();
  });

  it("no le ofrece filtrar por torre ni por departamento", async () => {
    /*
      Con el panel **abierto**: empieza plegado, asi que una prueba que no lo
      abra pasa sin comprobar nada. Lo descubri porque el caso de la porteria
      --el control positivo-- fallaba por lo mismo.
    */
    render(<VisitasHistorialScreen />);
    await userEvent.click(screen.getByRole("button", { name: "Mostrar filtros" }));

    expect(screen.queryByText(textoCompleto("Torre"))).toBeNull();
    expect(screen.queryByText(textoCompleto("Departamento"))).toBeNull();
  });

  it("y a la portería sí, que mira el edificio entero", async () => {
    rol = "guardia";
    render(<VisitasHistorialScreen />);
    await userEvent.click(screen.getByRole("button", { name: "Mostrar filtros" }));

    expect(screen.getAllByText(textoCompleto("Torre")).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(textoCompleto("Departamento")).length,
    ).toBeGreaterThan(0);
  });

  it("y el botón que los despliega dice qué hace", async () => {
    /*
      Solo lleva un icono. Sin etiqueta, un lector de pantalla lee «boton» y
      ya; y sin `aria-expanded`, tampoco si lo que despliega esta abierto.
    */
    render(<VisitasHistorialScreen />);
    const boton = screen.getByRole("button", { name: "Mostrar filtros" });
    expect(boton.getAttribute("aria-expanded")).toBe("false");

    await userEvent.click(boton);
    expect(
      screen.getByRole("button", { name: "Ocultar filtros" }),
    ).toBeDefined();
  });

  it("le ofrece registrar amigos y profesional temporal, y nada más", () => {
    /*
      Un huesped no da de alta un profesional permanente ni una reserva de
      huesped: eso es del dueño de la vivienda.
    */
    render(<VisitasHistorialScreen />);
    expect(screen.getByText(textoCompleto("Amigos Familiares"))).toBeDefined();
    expect(screen.getByText(textoCompleto("Profesional Temporal"))).toBeDefined();
    expect(screen.queryByText(textoCompleto("Profesional Permanente"))).toBeNull();
    expect(screen.queryByText(textoCompleto("Huésped Temporal"))).toBeNull();
  });
});

describe("los filtros de la lista", () => {
  it("cuentan lo que se ve, no lo que hay", () => {
    visitas = [
      visita({ id: 1, uuid: "a", estado: "Programada" }),
      visita({ id: 2, uuid: "b", estado: "Finalizado", nombre: "Juan Pérez" }),
    ];
    render(<VisitasHistorialScreen />);
    expect(screen.getByText(textoCompleto("Mostrando 2 de 2 visitas"))).toBeDefined();
  });

  it("y los chips de estado filtran de verdad", async () => {
    /*
      A diferencia de los de zonas comunes, que alimentaban una lista que
      nadie pintaba (hallazgo 31). Estos si: se comprueba con el contador, que
      sale de la misma lista que se pinta.
    */
    visitas = [
      visita({ id: 1, uuid: "a", estado: "Programada" }),
      visita({ id: 2, uuid: "b", estado: "Finalizado", nombre: "Juan Pérez" }),
    ];
    render(<VisitasHistorialScreen />);

    await userEvent.click(screen.getByText(textoCompleto("Finalizado")));
    expect(screen.getByText(textoCompleto("Mostrando 1 de 2 visitas"))).toBeDefined();
    expect(screen.getByText(/Juan Pérez/)).toBeDefined();
    expect(screen.queryByText(/Lucía Fernández/)).toBeNull();
  });

  it("sin visitas lo dice, y no deja la lista en blanco", () => {
    render(<VisitasHistorialScreen />);
    expect(screen.getByText(/No hay visitas/)).toBeDefined();
  });
});
