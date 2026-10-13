import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio } from "./cliente";
import {
  crearReserva,
  guardarZonaEntera,
  obtenerZonas,
} from "@/features/zonas/services/zonas.repo";

/**
 * Recorrido: una zona abre los días que dice.
 *
 * El formulario de la administración pinta «Días habilitados» y «Fechas
 * especiales», y hasta el 13/10/2026:
 *
 *   · **no se guardaban** --el formulario no los mandaba--;
 *   · y aunque se guardaran, **nadie los leía**: se podía reservar un día en
 *     que la zona no abre, o una fecha cerrada por mantenimiento.
 *
 * Las dos mitades, entonces: que se guarden y vuelvan como la pantalla los
 * pinta, y que la base rechace la reserva que no toca. Cada rechazo lleva al
 * lado una reserva que sí pasa: sin ella, una zona que no deja reservar nunca
 * pasaría igual.
 *
 * La zona **es de este recorrido**: se crea y se retira aquí. Cambiarle los
 * días a una compartida dejaría en rojo a los archivos que reservan en ella.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const ADMIN = "admin@veciyo.test";
const VECINA = "vecino@veciyo.test";

const MARCA = "[prueba] zona con dias";
const DIAS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

let zonaId = "";

/** Un día a `n` de hoy: lejos, para que una hora de desfase no lo cambie. */
function dia(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return {
    iso: `${d.getFullYear()}-${mm}-${dd}`,
    pantalla: `${dd}/${mm}/${d.getFullYear()}`,
    nombre: DIAS[d.getDay()],
  };
}

// El mismo día de la semana tres semanas seguidas, y el siguiente.
const abierto = dia(20);
const otroDiaDeLaSemana = dia(21);
const cerrado = dia(27);
const conHorarioPropio = dia(34);

const reservar = (fecha: string, horaInicio: string, horaFin: string) =>
  crearReserva({
    zonaId,
    unidadId: U102,
    fecha,
    horaInicio,
    horaFin,
    comentarios: MARCA,
  });

beforeAll(async () => {
  // Una corrida que muriera a mitad deja su zona: se retira antes de crearla.
  await servicio.from("zona_comun").delete().eq("nombre", MARCA);
  await entrarComo(ADMIN);
});

afterAll(async () => {
  await salir();
  if (!zonaId) return;
  const { error: errorReservas } = await servicio
    .from("reserva_zona")
    .delete()
    .eq("zona_id", zonaId);
  expect(errorReservas).toBeNull();
  const { error } = await servicio.from("zona_comun").delete().eq("id", zonaId);
  expect(error).toBeNull();
});

describe("la administración dice cuándo abre la zona", () => {
  it("los días y las fechas especiales se guardan", async () => {
    zonaId = await guardarZonaEntera({
      zona: {
        condominioId: CONDOMINIO,
        nombre: MARCA,
        tipo: "recreacion",
        horarioApertura: "08:00",
        horarioCierre: "22:00",
        // Un solo día de la semana: con los siete no se sabría si viajan.
        diasHabilitados: [DIAS.indexOf(abierto.nombre)],
        duracionMinimaMin: 30,
        duracionMaximaMin: 240,
        tiempoMinimoEntreReservas: 0,
        cuposSimultaneos: 5,
        activa: true,
        permiteCorta: true,
        permiteLarga: true,
      },
      fechas: [
        { fecha: cerrado.iso, tipo: "cerrada", motivo: "Mantenimiento anual" },
        {
          fecha: conHorarioPropio.iso,
          tipo: "horario_especial",
          motivo: "Evento por la tarde",
          horaApertura: "10:00",
          horaCierre: "12:00",
        },
        // Repetida: no deja la zona sin ninguna, se queda una.
        { fecha: cerrado.iso, tipo: "cerrada", motivo: "Mantenimiento anual" },
      ],
    });

    const { data } = await servicio
      .from("zona_comun")
      .select("dias_habilitados, fechas:zona_fecha_especial ( fecha, tipo )")
      .eq("id", zonaId)
      .single();
    expect(data!.dias_habilitados).toEqual([DIAS.indexOf(abierto.nombre)]);
    expect(data!.fechas.map((f) => f.fecha).sort()).toEqual(
      [cerrado.iso, conHorarioPropio.iso].sort(),
    );
  });

  it("y vuelven como el formulario los pinta", async () => {
    // Llegaban «0…6» contra «Lunes»: al editar, ningún día salía marcado.
    const { gestion } = await obtenerZonas();
    const zona = gestion[zonaId];
    expect(zona.diasHabilitados).toEqual([abierto.nombre]);

    const especial = zona.fechasEspeciales.find(
      (f) => f.fecha === conHorarioPropio.iso,
    );
    expect(especial?.tipo).toBe("horario_especial");
    expect(especial?.horaApertura).toBe("10:00");
    expect(especial?.horaCierre).toBe("12:00");
  });
});

describe("y la base lo respeta al reservar", () => {
  beforeAll(async () => {
    await salir();
    await entrarComo(VECINA);
  });

  it("un día que abre, sí", async () => {
    await expect(
      reservar(abierto.pantalla, "09:00", "10:00"),
    ).resolves.toBeTruthy();
  });

  it("otro día de la semana, no", async () => {
    await expect(
      reservar(otroDiaDeLaSemana.pantalla, "09:00", "10:00"),
    ).rejects.toThrow(/no abre ese día/i);
  });

  it("una fecha cerrada, tampoco, y dice por qué", async () => {
    await expect(
      reservar(cerrado.pantalla, "09:00", "10:00"),
    ).rejects.toThrow(/Mantenimiento anual/);
  });

  it("y con horario propio, solo dentro de él", async () => {
    await expect(
      reservar(conHorarioPropio.pantalla, "09:00", "10:00"),
    ).rejects.toThrow(/abre de 10:00 a 12:00/);

    await expect(
      reservar(conHorarioPropio.pantalla, "10:00", "11:00"),
    ).resolves.toBeTruthy();
  });
});
