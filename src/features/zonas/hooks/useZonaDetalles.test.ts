import { describe, expect, it, vi } from "vitest";

vi.mock("@/shared/services/supabase", () => ({ supabase: {} }));
vi.mock("@/stores", () => ({ useAuthStore: vi.fn(), useUbicacionStore: vi.fn() }));
vi.mock("@/shared/hooks", () => ({ useUnidadesDisponibles: vi.fn() }));
vi.mock("@react-navigation/native", () => ({
  useNavigation: vi.fn(),
  useRoute: vi.fn(),
}));
vi.mock("./useZonas", () => ({ useZonas: vi.fn() }));

const { mediasHoras } = await import("./useZonaDetalles");

/**
 * Grilla de medias horas de una zona comun.
 *
 * Era una lista fija de 08:00 a 22:00 para todas las zonas. El gimnasio del
 * condominio de prueba abre a las 06:00 y el salon de eventos cierra a las
 * 23:00, asi que la grilla ocultaba horas reservables y ofrecia otras con la
 * zona cerrada.
 */
describe("mediasHoras", () => {
  it("cubre el horario de la zona en tramos de media hora", () => {
    // La piscina: 08:00 a 20:00 son doce horas, veinticuatro medias.
    const horas = mediasHoras("08:00", "20:00");
    expect(horas).toHaveLength(24);
    expect(horas[0]).toBe("08:00");
    expect(horas[1]).toBe("08:30");
    expect(horas.at(-1)).toBe("19:30");
  });

  it("empieza cuando abre la zona, no a las ocho", () => {
    // El gimnasio abre a las 06:00.
    expect(mediasHoras("06:00", "22:00")[0]).toBe("06:00");
  });

  it("termina cuando cierra la zona, no a las veintidos", () => {
    // El salon de eventos cierra a las 23:00.
    expect(mediasHoras("10:00", "23:00").at(-1)).toBe("22:30");
  });

  it("no ofrece la hora de cierre como reservable", () => {
    expect(mediasHoras("08:00", "09:00")).toEqual(["08:00", "08:30"]);
  });

  it("sin horario no inventa una grilla", () => {
    expect(mediasHoras(undefined, "20:00")).toEqual([]);
    expect(mediasHoras("08:00", undefined)).toEqual([]);
  });

  it("devuelve vacio si el cierre no es posterior a la apertura", () => {
    expect(mediasHoras("22:00", "08:00")).toEqual([]);
  });

  it("y desde una hora, no ofrece lo que ya pasó", () => {
    /*
      A las 18:45 la grilla ofrecia la franja de las 06:00 de hoy, y la base la
      aceptaba (R-15). La base ya no; la pantalla tampoco debe ofrecerla,
      porque ofrecer algo que va a ser rechazado es peor que no ofrecerlo.
    */
    const horas = mediasHoras("06:00", "22:00", "18:45");

    expect(horas[0]).toBe("19:00");
    expect(horas).not.toContain("06:00");
    expect(horas).not.toContain("18:30");
  });

  it("alinea con la media hora, no ofrece una franja a las y cuarto", () => {
    expect(mediasHoras("06:00", "22:00", "10:10")[0]).toBe("10:30");
    expect(mediasHoras("06:00", "22:00", "10:30")[0]).toBe("10:30");
  });

  it("y sin hora sigue ofreciendo el horario entero", () => {
    // El control: porteria y administracion no pasan hora, y tienen que
    // seguir viendo la grilla completa para registrar usos ya ocurridos.
    expect(mediasHoras("06:00", "22:00")[0]).toBe("06:00");
  });

  it("si ya cerró, no ofrece nada en vez de ofrecer el día siguiente", () => {
    expect(mediasHoras("06:00", "22:00", "23:00")).toEqual([]);
  });
});