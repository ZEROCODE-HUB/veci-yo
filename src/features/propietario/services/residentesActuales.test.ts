import { describe, expect, it } from "vitest";
import {
  estaVigente,
  hoyEnFecha,
  residentesActuales,
} from "./residentesActuales";
import type { ResidenteDeUnidad } from "./residentes.repo";

const persona = (
  nombre: string,
  vigenteDesde: string | null,
  vigenteHasta: string | null,
): ResidenteDeUnidad =>
  ({
    id: nombre,
    usuarioId: nombre,
    nombre,
    rol: "Huesped Temporal",
    ci: "",
    fecha: "",
    telefono: "",
    vigenteDesde,
    vigenteHasta,
    esAnfitrionPrimario: false,
    esAdministradorPrimario: false,
    esResidente: true,
    esMenor: false,
    datosVisibles: true,
    contactableChat: true,
    contactableWhatsapp: true,
  }) satisfies ResidenteDeUnidad;

/**
 * Los tres casos son los tres huéspedes que la 102 tiene de verdad en la base
 * --uno que se fue en agosto, uno alojado ahora y una que llega en octubre--,
 * porque son justo los que hacían que el contador dijera cuatro.
 */
describe("quién vive hoy en la vivienda", () => {
  const HOY = "2026-09-25";

  it("cuenta a quien está alojado ahora", () => {
    expect(estaVigente(persona("Tomás", "2026-09-22", "2026-09-30"), HOY)).toBe(
      true,
    );
  });

  it("no cuenta la estancia que ya terminó", () => {
    expect(estaVigente(persona("Ramiro", "2026-08-01", "2026-08-07"), HOY)).toBe(
      false,
    );
  });

  it("ni la que todavía no empieza", () => {
    expect(estaVigente(persona("Nadia", "2026-10-02", "2026-10-07"), HOY)).toBe(
      false,
    );
  });

  it("los dos extremos entran", () => {
    // Quien llega hoy ya es residente: es el dia en que la base le entrega las
    // credenciales de la puerta. Y quien se va hoy todavia lo es.
    expect(estaVigente(persona("llega", "2026-09-25", "2026-09-30"), HOY)).toBe(
      true,
    );
    expect(estaVigente(persona("se va", "2026-09-20", "2026-09-25"), HOY)).toBe(
      true,
    );
  });

  it("y un rol sin fechas está siempre vigente", () => {
    // El propietario y el inquilino lider no caducan.
    expect(estaVigente(persona("Sofía", null, null), HOY)).toBe(true);
    expect(estaVigente(persona("desde siempre", null, "2026-12-31"), HOY)).toBe(
      true,
    );
    expect(estaVigente(persona("sin final", "2026-01-01", null), HOY)).toBe(
      true,
    );
  });

  it("de los cuatro de la 102, hoy viven dos", () => {
    const lista = [
      persona("Laura", "2026-09-21", "2026-09-26"),
      persona("Nadia", "2026-10-02", "2026-10-07"),
      persona("Ramiro", "2026-08-01", "2026-08-07"),
      persona("Tomás", "2026-09-22", "2026-12-31"),
    ];
    expect(residentesActuales(lista, HOY).map((r) => r.nombre)).toEqual([
      "Laura",
      "Tomás",
    ]);
  });

  it("la fecha de hoy se arma en local, no en UTC", () => {
    /*
      `toISOString().slice(0, 10)` daria el dia siguiente desde Colombia a
      partir de las 19:00, y un huesped que llega manana veria sus credenciales
      esta noche.
    */
    expect(hoyEnFecha(new Date(2026, 8, 25, 23, 30))).toBe("2026-09-25");
    expect(hoyEnFecha(new Date(2026, 0, 1, 0, 5))).toBe("2026-01-01");
  });
});
