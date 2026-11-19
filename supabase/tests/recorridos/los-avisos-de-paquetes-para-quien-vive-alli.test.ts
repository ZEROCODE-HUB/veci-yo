import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio } from "./cliente";
import {
  crearCorrespondencia,
  reportarIncidencia,
} from "@/features/correspondencia/services/correspondencia.repo";

/**
 * Recorrido: los avisos de paquetes, para quien vive allí (15/10/2026, huecos
 * 29 y 27).
 *
 * En la 205 vive Laura y el dueño es Guillermo. Se le pone a Guillermo como no
 * residente de la 205 --la app entonces le oculta la correspondencia-- y se
 * comprueba que tampoco le llega el aviso. Al lado, el control: como
 * residente, sí le llega.
 *
 * Y una novedad con el paquete que anota la portería le llega a la vivienda.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U205 = "44444444-4444-4444-4444-444444444442";
const GUARDIA = "guardia@veciyo.test"; // Juan
const LAURA = "laura.invitada@veciyo.test"; // vive en la 205
const GUILLERMO = "propietario@veciyo.test"; // dueño de la 205
const MARCA = "[prueba] avisos de paquetes";

let lauraId = "";
let guillermoId = "";
let guardiaId = "";
let membresiaId = "";
let residenteAntes = true;
const paquetes: string[] = [];

const ponerResidente = async (valor: boolean) => {
  const { error } = await servicio
    .from("membresia_unidad")
    .update({ es_residente: valor })
    .eq("id", membresiaId);
  if (error) throw new Error(error.message);
};

/** Los avisos de ese paquete que tiene esa persona. */
const avisos = async (usuarioId: string, paquete: string, tipo: string) => {
  const { data } = await servicio
    .from("notificacion")
    .select("id")
    .eq("usuario_id", usuarioId)
    .eq("entidad_id", paquete)
    .eq("tipo", tipo);
  return (data ?? []).length;
};

const registrarPaquete = async () => {
  await entrarComo(GUARDIA);
  const id = await crearCorrespondencia({
    condominioId: CONDOMINIO,
    unidadId: U205,
    empresa: MARCA,
  });
  await salir();
  paquetes.push(id);
  return id;
};

beforeAll(async () => {
  lauraId = await entrarComo(LAURA);
  await salir();
  guillermoId = await entrarComo(GUILLERMO);
  await salir();
  guardiaId = await entrarComo(GUARDIA);
  await salir();

  // La fila cruda, para devolverla tal cual aunque la prueba falle a medias.
  const { data: m } = await servicio
    .from("membresia_unidad")
    .select("id, es_residente")
    .eq("unidad_id", U205)
    .eq("usuario_id", guillermoId)
    .single();
  membresiaId = m!.id;
  residenteAntes = m!.es_residente;
});

afterAll(async () => {
  await salir();
  await ponerResidente(residenteAntes);
  if (paquetes.length) {
    await servicio.from("notificacion").delete().in("entidad_id", paquetes);
    await servicio.from("incidencia_correspondencia").delete().in("correspondencia_id", paquetes);
    const { error } = await servicio.from("correspondencia").delete().in("id", paquetes);
    if (error) throw new Error(error.message);
  }
});

describe("un paquete para la 205", () => {
  /*
    Hasta el 09/11/2026 al dueño que no vive ahí no le llegaba; ese día el
    cliente pidió que sí (Correcciones, fila 10). Y el 18/11/2026, que con
    inquilino líder no: el día a día es de quien vive ahí. En la 205 vive
    Laura como inquilina líder, así que a Guillermo no le llega. El control
    es Laura: sin él, el caso pasaría igual si no avisara a nadie.
  */
  it("con inquilino líder, le llega a quien vive allí y no al dueño (18/11/2026)", async () => {
    await ponerResidente(false);
    const id = await registrarPaquete();
    expect(await avisos(lauraId, id, "correspondencia_recibida")).toBe(1);
    expect(await avisos(guillermoId, id, "correspondencia_recibida")).toBe(0);
  });

  it("una novedad que anota la portería le llega a quien vive allí, y no a la portería", async () => {
    const id = paquetes.at(-1)!;
    await entrarComo(GUARDIA);
    await reportarIncidencia(id, "Llegó con la caja mojada");
    await salir();

    expect(await avisos(lauraId, id, "correspondencia_incidencia")).toBe(1);
    expect(await avisos(guardiaId, id, "correspondencia_incidencia")).toBe(0);
    // Guillermo, con inquilino líder en la 205, no (18/11/2026).
    expect(await avisos(guillermoId, id, "correspondencia_incidencia")).toBe(0);

    const { data } = await servicio
      .from("notificacion")
      .select("titulo, mensaje")
      .eq("usuario_id", lauraId)
      .eq("entidad_id", id)
      .eq("tipo", "correspondencia_incidencia")
      .single();
    expect(data!.titulo).toBe("Novedad con tu paquete");
    expect(data!.mensaje).toContain("caja mojada");
  });
});
