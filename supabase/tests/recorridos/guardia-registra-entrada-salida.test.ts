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
    invitados: [
      {
        nombre: "[prueba] visita de portería",
        documentoNumero: "1098765432",
        tipoDocumento: "cedula_ciudadania",
      },
    ],
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

  it("y el documento del visitante queda con su tipo, no solo el número", async () => {
    /*
      El guardia elige el tipo en un desplegable --«Cédula de ciudadanía»,
      «Pasaporte»...-- y **no se guardaba**: `tipoId` no salía de la pantalla, así
      que el invitado quedaba con el número y sin decir de qué documento es, y la
      pantalla de detalle mostraba «No especificado» por mucho que el guardia lo
      hubiera puesto.

      La columna existía, la función de datos lo aceptaba y el desplegable
      ofrecía las seis etiquetas correctas: se rompía en el último eslabón, como
      los turnos. Salió recorriendo la pantalla de registro como portería.

      Aquí se comprueba de punta a punta: lo que se manda es la **clave** del
      enum --el desplegable da la etiqueta y hay que traducirla-- y lo que vuelve
      por la consulta de la aplicación es esa clave, para que la pantalla pueda
      pintar su etiqueta.
    */
    const { data, error } = await supabase
      .from("invitado")
      .select("tipo_documento, documento_numero")
      .eq("id", invitadoId)
      .single();
    expect(error).toBeNull();
    expect(data!.tipo_documento).toBe("cedula_ciudadania");
    expect(data!.documento_numero).toBe("1098765432");

    // Y llega a la pantalla por el camino que usa la aplicación.
    const visitas = await obtenerVisitas({ ambito: "condominio", unidadIds: [] });
    const invitado = visitas
      .find((v) => v.uuid === visitaId)!
      .invitados.find((i) => i.uuid === invitadoId)!;
    expect(invitado.tipoDocumento).toBe("cedula_ciudadania");
  });
});
