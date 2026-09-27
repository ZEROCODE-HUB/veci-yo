import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, supabase } from "./cliente";
import {
  crearVisita,
  marcarLlegadaInvitado,
  obtenerVisitas,
  registrarAnuncio,
  registrarHoraInvitado,
} from "@/features/visitas/services/visitas.repo";

/**
 * Recorrido: la portería registra una entrada y una salida.
 *
 * Fija dos cosas que se arreglaron el 24/09/2026 y que no tenían prueba:
 *
 *   1. `visita.estado` --`programada`, `ingresada`, `finalizada`-- no lo movía
 *      nadie. La portería marca la llegada sobre `invitado`, y la visita se
 *      quedaba en `programada` para siempre: el guardia registraba entrada y
 *      salida y la etiqueta decía lo mismo. Ahora lo mantiene un disparador.
 *
 *   2. `telefonoResidente` se rellenaba **solo al crear** la visita y nunca se
 *      leía de la base, así que al recargar valía `undefined` y el botón de
 *      llamar abría un `tel:` vacío. Ahora el contacto sale de la vivienda.
 *
 * Los dos son cambios en la base real sin red de seguridad hasta aquí, que es
 * la razón de saltarse el orden de la lista y hacer este bloque antes.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const GUARDIA = "guardia@veciyo.test";
const ANFITRIONA = "vecino@veciyo.test"; // Sofía, propietaria de la 102
const ADMIN = "admin@veciyo.test";

const MARCA = "[prueba] recorrido porteria";

let visitaId = "";
let invitadoId = "";

/** El estado y las horas que la visita tiene ahora mismo, según la base. */
async function estadoDeLaVisita() {
  const { data } = await supabase
    .from("visita")
    .select("estado, ingreso_en, salida_en")
    .eq("id", visitaId)
    .single();
  return data!;
}

beforeAll(async () => {
  // La anfitriona registra la visita, que es como llega de verdad.
  await entrarComo(ANFITRIONA);
  visitaId = await crearVisita({
    condominioId: CONDOMINIO,
    unidadId: U102,
    tipo: "amigos",
    profesion: MARCA,
    aviso: "notificar_y_anunciar",
    invitados: [{ nombre: "[prueba] visita de portería" }],
  });

  const { data } = await supabase
    .from("invitado")
    .select("id")
    .eq("visita_id", visitaId)
    .single();
  invitadoId = data!.id;

  // A partir de aqui habla la porteria, que es de quien va el recorrido. Sin
  // esto el primer caso corria sin sesion y leia `null`, que no es lo mismo
  // que "no tiene permiso" pero se le parece bastante en una asercion floja.
  await salir();
  await entrarComo(GUARDIA);
});

afterAll(async () => {
  await salir();
  await entrarComo(ADMIN);
  if (visitaId) await supabase.from("visita").delete().eq("id", visitaId);
  await salir();
});

describe("la portería registra el paso de una visita", () => {
  it("nace programada", async () => {
    expect((await estadoDeLaVisita()).estado).toBe("programada");
  });

  it("el guardia la ve entre las del condominio", async () => {
    const visitas = await obtenerVisitas({ ambito: "condominio", unidadIds: [] });
    const mia = visitas.find((v) => v.uuid === visitaId);
    expect(mia).toBeDefined();
    // Y sabe a quién llamar: el contacto sale de la vivienda, no de la sesión
    // en la que se creó la visita.
    expect(mia!.telefonoResidente).toBeTruthy();
    expect(mia!.nombreResidente).toBeTruthy();
  });

  it("marca la llegada y la visita pasa a ingresada", async () => {
    await marcarLlegadaInvitado(invitadoId, true);
    const v = await estadoDeLaVisita();
    expect(v.estado).toBe("ingresada");
    // La hora real de la visita se deriva de la de su invitado; antes se
    // quedaba nula aunque alguien hubiera entrado.
    expect(v.ingreso_en).not.toBeNull();
  });

  it("registra la salida y pasa a finalizada", async () => {
    await registrarHoraInvitado(invitadoId, "salida", "18:30");
    const v = await estadoDeLaVisita();
    expect(v.estado).toBe("finalizada");
    expect(v.salida_en).not.toBeNull();
  });

  it("y si desmarca una llegada apuntada por error, vuelve atrás", async () => {
    /*
      Es reversible a propósito: un guardia que se equivoca de invitado tiene
      que poder deshacerlo, y el dato no puede quedarse diciendo que alguien
      entró. Sin este caso, un disparador que solo supiera avanzar pasaría.
    */
    await registrarHoraInvitado(invitadoId, "salida", "");
    await marcarLlegadaInvitado(invitadoId, false);
    const v = await estadoDeLaVisita();
    expect(v.estado).toBe("programada");
    expect(v.ingreso_en).toBeNull();
    expect(v.salida_en).toBeNull();
  });

  it("anuncia la visita, y queda con quién y cuándo", async () => {
    await registrarAnuncio(visitaId, true);
    const { data } = await supabase
      .from("visita")
      .select("anunciada_en, anunciada_por")
      .eq("id", visitaId)
      .single();
    expect(data!.anunciada_en).not.toBeNull();
    // Quién anunció es una FK real, no un nombre en texto (regla 2).
    const { data: sesion } = await supabase.auth.getUser();
    expect(data!.anunciada_por).toBe(sesion.user!.id);
  });
});
