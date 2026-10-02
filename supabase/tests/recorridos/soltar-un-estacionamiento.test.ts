import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, supabase } from "./cliente";
import { crearVisita } from "@/features/visitas/services/visitas.repo";
import {
  asignarEstacionamiento,
  liberarEstacionamiento,
} from "@/features/administrador/services/arquitectura.repo";

/**
 * Recorrido: soltar un cupo de visita a mano.
 *
 * Normalmente el cupo se suelta solo, cuando la visita termina o se cancela,
 * que es cuando de verdad queda libre. Pero `liberarEstacionamiento` llevaba
 * días escrita sin que la llamara nadie, y el hueco se ve en dos casos reales
 * (R-8, R-19):
 *
 *   · el visitante mueve el coche antes de irse;
 *   · alguien **deshace** una salida --se puede-- y entonces el cupo se queda
 *     tomado sin nadie dentro y no hay forma de soltarlo.
 *
 * Con un solo estacionamiento de visita en el condominio, el segundo caso deja
 * la portería sin poder asignar nada a nadie hasta que alguien toque la base.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const GUARDIA = "guardia@veciyo.test";
const MARCA = "[prueba] cupo que se queda tomado";

let visitaId = "";
let cupoId = "";

const sigueTomado = async () => {
  const { data } = await supabase
    .from("asignacion_estacionamiento")
    .select("id")
    .eq("estacionamiento_id", cupoId)
    .is("liberado_en", null);
  return (data ?? []).length > 0;
};

beforeAll(async () => {
  await entrarComo(GUARDIA);

  const { data: cupo } = await supabase
    .from("estacionamiento")
    .select("id")
    .eq("condominio_id", CONDOMINIO)
    .eq("tipo", "visitante")
    .limit(1)
    .single();
  cupoId = cupo!.id;

  visitaId = await crearVisita({
    condominioId: CONDOMINIO,
    unidadId: U102,
    tipo: "amigos",
    fechaDesde: "01/10/2026",
    anotacionesIngreso: MARCA,
    invitados: [{ nombre: `${MARCA} titular` }],
  });
});

afterAll(async () => {
  await entrarComo(GUARDIA);
  // Se suelta antes de borrar la visita: si quedara tomado, el unico cupo de
  // visita del condominio se quedaria inutilizable para las demas pruebas.
  await liberarEstacionamiento(cupoId).catch(() => {});
  await supabase.from("visita").delete().eq("id", visitaId);
  await salir();
});

describe("un cupo de visita tomado", () => {
  it("se asigna a una visita", async () => {
    await entrarComo(GUARDIA);
    await asignarEstacionamiento(cupoId, visitaId);

    expect(await sigueTomado()).toBe(true);
  });

  it("y la portería lo puede soltar a mano", async () => {
    /*
      Es el caso de deshacer una salida: la visita sigue ahi, no se cancela, y
      el cupo tiene que poder liberarse igual. Antes solo se soltaba al
      terminar la visita, asi que se quedaba tomado sin nadie dentro.
    */
    await liberarEstacionamiento(cupoId);

    expect(await sigueTomado()).toBe(false);
  });

  it("y soltarlo dos veces no rompe nada", async () => {
    // Pulsar dos veces es lo normal. La segunda no encuentra ninguna
    // asignacion sin liberar y no hace nada, que es lo correcto.
    await liberarEstacionamiento(cupoId);

    expect(await sigueTomado()).toBe(false);
  });

  it("y queda libre para la siguiente visita", async () => {
    // El control que importa: soltar no puede dejar el cupo en un estado raro
    // en el que ya no se pueda volver a asignar.
    await asignarEstacionamiento(cupoId, visitaId);
    expect(await sigueTomado()).toBe(true);

    await liberarEstacionamiento(cupoId);
    await salir();
  });
});
