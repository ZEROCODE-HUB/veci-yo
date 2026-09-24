import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, supabase } from "./cliente";
import {
  crearReserva,
  obtenerReservas,
  resolverReserva,
} from "@/features/zonas/services/zonas.repo";

/**
 * Recorrido: la administración aprueba y rechaza reservas de zona.
 *
 * Es la decisión que habilita el uso de un espacio que a veces se paga, así
 * que tiene que poder auditarse: quién la tomó y cuándo. La base lo exige con
 * un `check` --`reserva_zona_resuelta_con_actor`--, no con la buena voluntad
 * de la pantalla.
 *
 * Y el motivo del rechazo importa tanto como el rechazo: un vecino al que le
 * dicen que no sin decirle por qué vuelve a pedirlo la semana siguiente.
 */

const U102 = "44444444-4444-4444-4444-444444444443";
const ADMIN = "admin@veciyo.test";
const VECINA = "vecino@veciyo.test"; // Sofía, propietaria de la 102
const OTRO = "propietario@veciyo.test";

const MARCA = "[prueba] recorrido resolver";

let zonaConAprobacion = "";
const creadas: string[] = [];

function dia(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return [
    String(d.getDate()).padStart(2, "0"),
    String(d.getMonth() + 1).padStart(2, "0"),
    d.getFullYear(),
  ].join("/");
}

async function estadoDe(id: string) {
  const { data } = await supabase
    .from("reserva_zona")
    .select("estado, resuelta_por, resuelta_en, motivo_rechazo")
    .eq("id", id)
    .single();
  return data!;
}

async function pedirReserva(hora: string, offset = 2): Promise<string> {
  const id = (await crearReserva({
    zonaId: zonaConAprobacion,
    unidadId: U102,
    fecha: dia(offset),
    horaInicio: hora,
    horaFin: `${String(Number(hora.slice(0, 2)) + 1).padStart(2, "0")}:00`,
    comentarios: MARCA,
  })).id;
  creadas.push(id);
  return id;
}

beforeAll(async () => {
  await entrarComo(VECINA);
  const { data } = await supabase
    .from("zona_comun")
    .select("id")
    .eq("activa", true)
    .eq("permite_estancia_larga", true)
    .limit(1)
    .single();
  zonaConAprobacion = data!.id;
});

afterAll(async () => {
  await salir();
  await entrarComo(ADMIN);
  for (const id of creadas) {
    await supabase.from("reserva_zona").delete().eq("id", id);
  }
  await salir();
});

describe("resolver una reserva", () => {
  it("la administración la aprueba, y queda quién y cuándo", async () => {
    const id = await pedirReserva("08:00");

    await salir();
    await entrarComo(ADMIN);
    await resolverReserva(id, "Aprobada");

    const fila = await estadoDe(id);
    expect(fila.estado).toBe("aprobada");
    // Quién resolvió es una FK real: es la decisión que habilita el uso de un
    // espacio que a veces se paga.
    const { data: sesion } = await supabase.auth.getUser();
    expect(fila.resuelta_por).toBe(sesion.user!.id);
    expect(fila.resuelta_en).not.toBeNull();
  });

  it("la rechaza con su motivo", async () => {
    await salir();
    await entrarComo(VECINA);
    const id = await pedirReserva("10:00");

    await salir();
    await entrarComo(ADMIN);
    await resolverReserva(id, "Rechazada", "[prueba] el salón está en obras");

    const fila = await estadoDe(id);
    expect(fila.estado).toBe("rechazada");
    expect(fila.motivo_rechazo).toContain("obras");
    expect(fila.resuelta_por).not.toBeNull();
  });

  it("y la vecina ve el resultado en su lista", async () => {
    await salir();
    await entrarComo(VECINA);
    const reservas = await obtenerReservas();
    const mias = reservas.filter((r) => creadas.includes(r.uuid ?? ""));
    // Las etiquetas del cliente van en masculino --"Aprobado"--, aunque el
    // enum de la base sea `aprobada`. Se comprueba lo que de verdad ve la
    // pantalla.
    expect(mias.map((r) => r.estado).sort()).toEqual([
      "Aprobado",
      "Rechazado",
    ]);
  });

  it("pero una vecina no se aprueba su propia reserva", async () => {
    /*
      Lo que impide esto no es que la pantalla le esconda el botón: es la
      política. Aprobar es de la administración porque es quien responde por el
      uso del espacio.
    */
    const id = await pedirReserva("12:00");
    await resolverReserva(id, "Aprobada").catch(() => {});

    // Se comprueba con una sesión que sí puede ver el resultado.
    await salir();
    await entrarComo(ADMIN);
    expect((await estadoDe(id)).estado).not.toBe("aprobada");
  });

  it("ni el dueño de otra vivienda", async () => {
    await salir();
    await entrarComo(VECINA);
    const id = await pedirReserva("14:00");

    await salir();
    await entrarComo(OTRO);
    await resolverReserva(id, "Aprobada").catch(() => {});

    await salir();
    await entrarComo(ADMIN);
    expect((await estadoDe(id)).estado).not.toBe("aprobada");
  });
});
