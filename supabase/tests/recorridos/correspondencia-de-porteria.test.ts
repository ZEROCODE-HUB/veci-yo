import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, supabase } from "./cliente";
import {
  cambiarEstadoCorrespondencia,
  crearCorrespondencia,
  eliminarCorrespondencia,
  obtenerCorrespondencia,
  reportarIncidencia,
} from "@/features/correspondencia/services/correspondencia.repo";

/**
 * Recorrido: un paquete llega a portería y termina en manos del vecino.
 *
 * El estado tenía el sentido invertido. El enum llegó a contener
 * `delivery`, `sobres` y `paqueteria` --que son **tipos** de envío, no
 * estados-- y un paquete nacía como si ya estuviera entregado. Ahora son los
 * tres momentos reales: `no_recibido`, `en_porteria`, `entregado`, y nace en
 * portería, que es donde de verdad está cuando alguien lo registra.
 *
 * Cada cambio deja su marca de tiempo y su actor: el guardia que lo recibió y
 * a quién se lo dio. Sin eso, "yo nunca recibí ese paquete" no tiene respuesta.
 *
 * Este recorrido **no toca correspondencia que ya existiera**: crea la suya,
 * marcada, y la retira al terminar. La tanda anterior dejó datos del cliente
 * estropeados por restaurar de menos, y la lección es no escribir sobre lo
 * ajeno en primer lugar.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const GUARDIA = "guardia@veciyo.test";
const VECINA = "vecino@veciyo.test"; // Sofía, de la 102
const AJENO = "propietario@veciyo.test"; // Guillermo: 101 y 205

const MARCA = "[prueba] recorrido correspondencia";

const creadas: string[] = [];

async function filaDe(uuid: string) {
  const { data } = await supabase
    .from("correspondencia")
    .select(
      "estado, recibida_en, recibida_por, entregada_en, entregada_a, deleted_at",
    )
    .eq("id", uuid)
    .single();
  return data!;
}

beforeAll(async () => {
  await entrarComo(GUARDIA);
});

afterAll(async () => {
  await salir();
  await entrarComo("admin@veciyo.test");
  for (const id of creadas) {
    await supabase.from("correspondencia").delete().eq("id", id);
  }
  await salir();
});

describe("un paquete en portería", () => {
  it("nace en portería, no entregado", async () => {
    /*
      El estado por defecto era el de un paquete ya entregado. Un paquete que
      se registra está **en portería**: es donde está cuando alguien lo apunta.
    */
    const id = await crearCorrespondencia({
      condominioId: CONDOMINIO,
      unidadId: U102,
      empresa: "[prueba] transportadora",
      descripcion: MARCA,
    });
    creadas.push(id);

    expect((await filaDe(id)).estado).toBe("en_porteria");
  });

  it("el vecino lo ve en su lista", async () => {
    await salir();
    await entrarComo(VECINA);
    const items = await obtenerCorrespondencia();
    expect(items.some((i) => i.uuid === creadas[0])).toBe(true);
  });

  it("y el de otra vivienda no", async () => {
    /*
      Un paquete dice quién te compra qué. Guillermo no vive en la 102.
    */
    await salir();
    await entrarComo(AJENO);
    const items = await obtenerCorrespondencia();
    expect(items.some((i) => i.uuid === creadas[0])).toBe(false);
    await salir();
    await entrarComo(GUARDIA);
  });

  it("se entrega, y queda a quién y cuándo", async () => {
    await cambiarEstadoCorrespondencia(creadas[0], "Entregado", {
      entregadoA: "[prueba] Sofía en persona",
    });

    const fila = await filaDe(creadas[0]);
    expect(fila.estado).toBe("entregado");
    expect(fila.entregada_en).not.toBeNull();
    // A quién se le dio: sin esto, "yo nunca recibí ese paquete" no tiene
    // respuesta.
    expect(fila.entregada_a).toContain("Sofía");
  });

  it("una incidencia queda colgada del paquete, y no crea otro", async () => {
    // Un paquete que llega abierto o mojado es un hecho sobre **ese** paquete.
    const { count: antes } = await supabase
      .from("correspondencia")
      .select("id", { count: "exact", head: true })
      .eq("condominio_id", CONDOMINIO);

    await reportarIncidencia(creadas[0], `${MARCA} — llegó abierto`);

    const { data } = await supabase
      .from("incidencia_correspondencia")
      .select("descripcion")
      .eq("correspondencia_id", creadas[0]);
    expect(data).toHaveLength(1);
    expect(data![0].descripcion).toContain("abierto");

    /*
      Y no aparece un paquete de la nada. La pantalla de «Informar» hacía justo
      eso: registraba una correspondencia **nueva** y le pegaba la incidencia,
      en vez de colgarla de la que el guardia tenía delante. Ni siquiera
      llegaba a ocurrir --el formulario ocultaba los campos que su propio
      esquema exigía, así que el botón no hacía nada-- pero la intención estaba
      escrita, y este caso la deja fijada.
    */
    const { count: despues } = await supabase
      .from("correspondencia")
      .select("id", { count: "exact", head: true })
      .eq("condominio_id", CONDOMINIO);
    expect(despues).toBe(antes);
  });

  it("retirarlo es un borrado lógico: el historial de portería no se pierde", async () => {
    const id = await crearCorrespondencia({
      condominioId: CONDOMINIO,
      unidadId: U102,
      empresa: "[prueba] por retirar",
      descripcion: MARCA,
    });
    creadas.push(id);

    await eliminarCorrespondencia(id);

    // Desaparece de la lista...
    const items = await obtenerCorrespondencia();
    expect(items.some((i) => i.uuid === id)).toBe(false);
    // ...pero la fila sigue, con su marca. Quién recibió qué y cuándo es lo
    // que resuelve una discusión meses después.
    expect((await filaDe(id)).deleted_at).not.toBeNull();
  });
});
