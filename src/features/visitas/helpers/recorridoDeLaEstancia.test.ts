import { describe, expect, it } from "vitest";
import type { Invitado, VisitaItem } from "@/shared/types";
import { recorridoDeLaEstancia } from "./recorridoDeLaEstancia";

const persona = (p: Partial<Invitado> = {}): Invitado => ({
  nombre: "Ana",
  llego: false,
  timeline: {},
  ...p,
});

const estancia = (p: Partial<VisitaItem> = {}): VisitaItem =>
  ({
    id: 1,
    tipo: "huesped-temporal",
    nombre: "Ana",
    ci: "",
    estado: "Programada",
    invitados: [persona()],
    tieneVehiculo: false,
    esEvento: false,
    vehiculos: [],
    ...p,
  }) as VisitaItem;

const paso = (v: VisitaItem, clave: string) =>
  recorridoDeLaEstancia(v).find((p) => p.clave === clave)!;

describe("recorridoDeLaEstancia", () => {
  it("dice de dónde salió la reserva", () => {
    expect(paso(estancia({ origen: "calendario" }), "origen").detalle).toMatch(/Airbnb/);
    expect(paso(estancia(), "origen").detalle).toBe("Creada en Veciyo");
  });

  it("el preregistro distingue sin enviar, enviado y completo", () => {
    expect(paso(estancia(), "preregistro").detalle).toBe("Sin enviar");
    expect(
      paso(estancia({ invitados: [persona({ timeline: { preregistroEnviado: true } })] }), "preregistro").detalle,
    ).toBe("Enlace enviado, sin terminar");
    expect(
      paso(estancia({ invitados: [persona({ timeline: { precheckinCerrado: true } })] }), "preregistro").hecho,
    ).toBe(true);
  });

  it("la verificación cuenta solo adultos, y avisa si alguien espera tu aprobación", () => {
    const v = estancia({
      invitados: [
        persona({ verificacion: "aprobada" }),
        persona({ verificacion: "revision" }),
        persona({ esMenor: true }),
      ],
    });
    expect(paso(v, "verificacion").hecho).toBe(false);
    expect(paso(v, "verificacion").detalle).toBe("1 persona requiere tu aprobación");
  });

  it("una salida parcial no completa la estancia; la última sí", () => {
    const parcial = estancia({
      estado: "Ingresado",
      invitados: [persona({ llego: true, horaSalida: "10:00" }), persona({ llego: true })],
    });
    expect(paso(parcial, "salida").hecho).toBe(false);
    expect(paso(parcial, "salida").detalle).toBe("Salieron 1 de 2");
    expect(paso(estancia({ estado: "Finalizado" }), "salida").detalle).toBe("Estancia completa");
  });

  it("el uso de la app sale de si el titular tiene cuenta", () => {
    expect(paso(estancia({ invitados: [persona({ tieneCuenta: true })] }), "app").hecho).toBe(true);
    expect(paso(estancia(), "app").hecho).toBe(false);
  });
});
