import { describe, expect, it } from "vitest";
import type { ReservaZona } from "@/shared/types";
import { reservasDelDia } from "./reservasDelDia";

const reserva = (id: number, fecha: string, horario: string, estado = "Aprobado"): ReservaZona => ({
  id,
  zonaId: "z",
  depto: "102",
  nombre: "Sofía",
  acompanantes: 0,
  reservaNum: String(id),
  horario,
  estado,
  personas: [],
  fecha,
});

describe("las reservas del día que ve la portería", () => {
  it("solo las de ese día, en orden de hora", () => {
    const lista = reservasDelDia(
      [
        reserva(1, "15/10/2026", "18:00 - 20:00"),
        reserva(2, "16/10/2026", "08:00 - 09:00"),
        reserva(3, "15/10/2026", "09:30 - 10:30"),
      ],
      "15/10/2026",
    );
    expect(lista.map((r) => r.id)).toEqual([3, 1]);
  });

  it("las canceladas y rechazadas no salen: no ocupan la zona", () => {
    const lista = reservasDelDia(
      [
        reserva(1, "15/10/2026", "18:00 - 20:00", "Cancelado"),
        reserva(2, "15/10/2026", "10:00 - 11:00", "Rechazado"),
        reserva(3, "15/10/2026", "12:00 - 13:00", "Pendiente"),
      ],
      "15/10/2026",
    );
    expect(lista.map((r) => r.id)).toEqual([3]);
  });
});
