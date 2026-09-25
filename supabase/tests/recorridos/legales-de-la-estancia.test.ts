import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, supabase } from "./cliente";
import { crearVisita } from "@/features/visitas/services/visitas.repo";
import { abrirPrecheckin } from "@/features/visitas/services/precheckin.repo";

/**
 * Recorrido: los términos que el huésped acepta son los del edificio.
 *
 * En el precheckin se despliegan cuatro apartados y se marca «Acepto los
 * términos y condiciones». Ese «acepto» se guarda en
 * `invitado.terminos_aceptados` y es lo que el KT llama asumir la
 * responsabilidad legal.
 *
 * Lo que se desplegaba eran **cuatro párrafos escritos a mano en el código de
 * la web**, uno titulado «Términos y Condiciones del Condominio». Y en
 * `documento_legal` hay un documento con ese mismo nombre, del condominio y
 * marcado vigente, que no leía nadie: `obtenerLegalesDelCondominio` llevaba
 * días escrita sin que la llamara ninguna pantalla (R-5).
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const ANFITRIONA = "vecino@veciyo.test";
const MARCA = "[prueba] legales de la estancia";

let visitaId = "";
let token = "";

beforeAll(async () => {
  await entrarComo(ANFITRIONA);
  visitaId = await crearVisita({
    condominioId: CONDOMINIO,
    unidadId: U102,
    tipo: "huesped_temporal",
    fechaDesde: "01/11/2026",
    fechaHasta: "03/11/2026",
    anotacionesIngreso: MARCA,
    invitados: [],
  });
  token = (await abrirPrecheckin(visitaId)).enlace.split("/access/")[1];
  await salir();
});

afterAll(async () => {
  await entrarComo(ANFITRIONA);
  await supabase.from("visita").delete().eq("id", visitaId);
  await salir();
});

describe("los términos que se aceptan en el precheckin", () => {
  it("se leen sin sesión, como el resto del precheckin", async () => {
    const { data, error } = await supabase.rpc("legales_de_la_estancia", {
      p_token: token,
    });

    expect(error).toBeNull();
    expect((data as unknown[]).length).toBeGreaterThan(0);
  });

  it("y traen los del edificio, no solo los de la plataforma", async () => {
    /*
      El caso entero: hay un «Términos y Condiciones del Condominio» vigente
      en la base y la pantalla enseñaba un párrafo inventado con ese mismo
      título.
    */
    const { data } = await supabase.rpc("legales_de_la_estancia", {
      p_token: token,
    });
    const titulos = (data as { titulo: string }[]).map((d) => d.titulo);

    expect(titulos).toContain("Términos y Condiciones del Condominio");
    expect(titulos).toContain("Política de Privacidad");
  });

  it("y con un enlace inventado no devuelven nada", async () => {
    // No son secretos, pero tampoco se reparten a quien pase por ahí: se
    // entregan por el mismo camino que todo lo demás del precheckin.
    const { data } = await supabase.rpc("legales_de_la_estancia", {
      p_token: "d".repeat(64),
    });

    expect(data).toEqual([]);
  });
});
