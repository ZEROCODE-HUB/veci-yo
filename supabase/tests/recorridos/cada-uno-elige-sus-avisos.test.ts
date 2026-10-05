import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio, supabase } from "./cliente";
import {
  guardarPreferenciaDeAviso,
  obtenerPreferenciasDeAviso,
} from "@/features/home/services/notificaciones.repo";

/**
 * Recorrido: cada uno elige por dónde le avisan.
 *
 * El cliente lo pidió el 02/10/2026: «WhatsApp configurable por residente y por
 * tipo de aviso». Y está en el alcance desde el principio --el KT nombra
 * «integración WhatsApp» entre las de notificaciones, marcada como no
 * verificada en código--. No lo estaba: no había nada. El único ajuste parecido
 * era `perfil.usar_contacto_alt`, que dice **a qué dirección** escribir, no
 * **por dónde** ni **de qué**.
 *
 * Lo que de verdad importa comprobar aquí es que la casilla **se lee**. Ocho
 * casillas decorativas van contadas en este proyecto, todas con la misma forma:
 * la decisión vivía en la pantalla y el dato no la sujetaba, o al revés. Así
 * que el caso central no mide que el `update` escriba: apaga un motivo, provoca
 * el aviso de verdad y cuenta las filas de `notificacion`.
 *
 * El correo y el WhatsApp **no se envían todavía** --falta SMTP propio y una
 * cuenta de WhatsApp Business API-- y eso lo dice la pantalla. Lo que se
 * comprueba de ellos es que la elección se guarda y que no se puede encender
 * WhatsApp sin un teléfono donde recibirlo.
 */

const SOFIA = "vecino@veciyo.test"; // propietaria de la 102
const U102 = "44444444-4444-4444-4444-444444444443";

let sofiaId = "";
const notificaciones: string[] = [];

beforeAll(async () => {
  sofiaId = await entrarComo(SOFIA);
});

afterAll(async () => {
  await salir();

  for (const id of notificaciones) {
    const { error } = await servicio.from("notificacion").delete().eq("id", id);
    // Una limpieza que no comprueba si limpió no es una limpieza.
    expect(error).toBeNull();
  }

  // Las preferencias se devuelven a «no hay fila», que es el estado por
  // defecto: lo que no está escrito se deduce.
  await servicio.from("preferencia_aviso").delete().eq("usuario_id", sofiaId);
});

/** Cuántos avisos de ese motivo tiene Sofía ahora mismo. */
async function cuantosAvisos(motivo: string): Promise<number> {
  const { count } = await servicio
    .from("notificacion")
    .select("id", { count: "exact", head: true })
    .eq("usuario_id", sofiaId)
    .eq("tipo", motivo);
  return count ?? 0;
}

/**
 * Provoca el aviso por el camino de verdad.
 *
 * `notificar_unidad` es la función que usan los disparadores de
 * correspondencia, de reservas y de la entrada de una visita. Se llama con la
 * clave de servicio porque es interna --desde el 05/10/2026, cuando se vio que
 * cualquiera podía usarla para meter una notificación con el texto que
 * quisiera-- y porque así se mide **la función que avisa**, no una copia de su
 * lógica escrita en la prueba.
 */
async function provocarAviso(marca: string) {
  const { error } = await servicio.rpc("notificar_unidad", {
    p_unidad_id: U102,
    p_tipo: "anuncio_publicado",
    p_titulo: marca,
    p_mensaje: marca,
  });
  if (error) throw error;

  const { data } = await servicio
    .from("notificacion")
    .select("id")
    .eq("titulo", marca);
  for (const fila of data ?? []) notificaciones.push(fila.id);
}

describe("la lista de avisos", () => {
  it("trae los motivos que hay, con sus valores por defecto", async () => {
    const avisos = await obtenerPreferenciasDeAviso();

    // Los ocho del enum. La pantalla no los escribe: los recorre la base, así
    // que añadir un motivo no obliga a tocarla.
    expect(avisos.length).toBeGreaterThanOrEqual(8);

    const paquete = avisos.find((a) => a.motivo === "correspondencia_recibida");
    expect(paquete).toBeTruthy();
    // La campana, encendida; lo que todavía no sale de la base, apagado.
    expect(paquete!.porApp).toBe(true);
    expect(paquete!.porCorreo).toBe(false);
    expect(paquete!.porWhatsapp).toBe(false);
    expect(paquete!.configurable).toBe(true);
  });

  it("y la alarma de S.O.S. no se configura", async () => {
    /*
      Una alarma de pánico que se puede silenciar no es una alarma. La pantalla
      lo dice en vez de enseñar un interruptor desactivado, y la base lo
      rechaza con un `check`: si alguna vez hay que poder, será una decisión
      del cliente y no un descuido.
    */
    const avisos = await obtenerPreferenciasDeAviso();
    const sos = avisos.find((a) => a.motivo === "sos_activado");

    expect(sos!.configurable).toBe(false);

    await expect(
      guardarPreferenciaDeAviso({
        motivo: "sos_activado",
        porApp: false,
        porCorreo: false,
        porWhatsapp: false,
      }),
    ).rejects.toThrow();
  });
});

describe("apagar un motivo lo apaga de verdad", () => {
  it("con la campana encendida, el aviso llega", async () => {
    /*
      El control positivo, y va primero a propósito: sin él, «no llegó» pasaría
      igual con el aviso roto por cualquier otra razón.
    */
    const antes = await cuantosAvisos("anuncio_publicado");
    await provocarAviso("[prueba] avisos encendido");
    expect(await cuantosAvisos("anuncio_publicado")).toBe(antes + 1);
  });

  it("y apagada, no llega", async () => {
    await guardarPreferenciaDeAviso({
      motivo: "anuncio_publicado",
      porApp: false,
      porCorreo: false,
      porWhatsapp: false,
    });

    const antes = await cuantosAvisos("anuncio_publicado");
    await provocarAviso("[prueba] avisos apagado");

    // No se inserta y se marca leída: no se inserta.
    expect(await cuantosAvisos("anuncio_publicado")).toBe(antes);
  });

  it("y al volver a encenderla, otra vez llega", async () => {
    await guardarPreferenciaDeAviso({
      motivo: "anuncio_publicado",
      porApp: true,
      porCorreo: false,
      porWhatsapp: false,
    });

    const antes = await cuantosAvisos("anuncio_publicado");
    await provocarAviso("[prueba] avisos otra vez");
    expect(await cuantosAvisos("anuncio_publicado")).toBe(antes + 1);
  });

  it("y apagar un motivo no apaga los demás", async () => {
    /*
      «Por tipo de aviso» es la mitad de lo que se pidió, y sin este caso
      pasaría igual una bandera única que apagara la campana entera.
    */
    await guardarPreferenciaDeAviso({
      motivo: "anuncio_publicado",
      porApp: false,
      porCorreo: false,
      porWhatsapp: false,
    });

    const avisos = await obtenerPreferenciasDeAviso();
    expect(avisos.find((a) => a.motivo === "anuncio_publicado")!.porApp).toBe(false);
    expect(
      avisos.find((a) => a.motivo === "correspondencia_recibida")!.porApp,
    ).toBe(true);

    const antes = await cuantosAvisos("correspondencia_recibida");
    const { error } = await servicio.rpc("notificar_unidad", {
      p_unidad_id: U102,
      p_tipo: "correspondencia_recibida",
      p_titulo: "[prueba] avisos otro motivo",
      p_mensaje: "[prueba] avisos otro motivo",
    });
    expect(error).toBeNull();

    const { data } = await servicio
      .from("notificacion")
      .select("id")
      .eq("titulo", "[prueba] avisos otro motivo");
    for (const fila of data ?? []) notificaciones.push(fila.id);

    expect(await cuantosAvisos("correspondencia_recibida")).toBe(antes + 1);
  });
});

describe("el WhatsApp", () => {
  it("se guarda, aunque todavía no se envíe nada", async () => {
    /*
      Deliberado y es lo contrario de una casilla decorativa: la elección se
      guarda y `quiere_aviso` la lee. Lo que falta para que salga es una cuenta
      de WhatsApp Business API, que no es código.
    */
    await guardarPreferenciaDeAviso({
      motivo: "visita_ingreso",
      porApp: true,
      porCorreo: true,
      porWhatsapp: true,
    });

    const avisos = await obtenerPreferenciasDeAviso();
    const visita = avisos.find((a) => a.motivo === "visita_ingreso");
    expect(visita!.porCorreo).toBe(true);
    expect(visita!.porWhatsapp).toBe(true);
  });

  it("y quien avise lo tiene en cuenta", async () => {
    /*
      `quiere_aviso` es la que preguntarán el correo y el WhatsApp cuando
      existan. Se comprueba con la clave de servicio porque es interna --no
      comprueba quién pregunta-- y es justo el contrato que hace falta dejar
      probado antes de que haya envío: el día que lo haya, esto ya dice la
      verdad.
    */
    const { data: porWhatsapp, error } = await servicio.rpc("quiere_aviso", {
      p_usuario_id: sofiaId,
      p_motivo: "visita_ingreso",
      p_canal: "whatsapp",
    });
    expect(error).toBeNull();
    expect(porWhatsapp).toBe(true);

    // Y un motivo que no tocó: por WhatsApp, no.
    const { data: otro } = await servicio.rpc("quiere_aviso", {
      p_usuario_id: sofiaId,
      p_motivo: "reserva_aprobada",
      p_canal: "whatsapp",
    });
    expect(otro).toBe(false);

    // La alarma de pánico va siempre, por todo lo que haya.
    const { data: sos } = await servicio.rpc("quiere_aviso", {
      p_usuario_id: sofiaId,
      p_motivo: "sos_activado",
      p_canal: "whatsapp",
    });
    expect(sos).toBe(true);

    // Y un canal que no existe no recibe nada: un error de escritura en el
    // nombre no debe convertirse en avisar por todas partes.
    const { data: inventado } = await servicio.rpc("quiere_aviso", {
      p_usuario_id: sofiaId,
      p_motivo: "visita_ingreso",
      p_canal: "paloma mensajera",
    });
    expect(inventado).toBe(false);
  });

  it("pero no se enciende sin un teléfono donde recibirlo", async () => {
    /*
      Sin esto, alguien enciende WhatsApp, se queda tranquilo, y el aviso no
      sale nunca sin que nada lo diga: es «una pantalla que anuncia lo que no
      intentó». Va en un disparador porque el teléfono está en otra tabla y un
      `check` no puede mirarla.

      Se quita el teléfono con la propia sesión de Sofía --es su perfil-- y se
      devuelve al terminar.
    */
    const { data: antes } = await servicio
      .from("perfil")
      .select("telefono, usar_contacto_alt, telefono_alt")
      .eq("id", sofiaId)
      .single();

    try {
      const { error: quitando } = await supabase
        .from("perfil")
        .update({ telefono: null })
        .eq("id", sofiaId);
      expect(quitando).toBeNull();

      await expect(
        guardarPreferenciaDeAviso({
          motivo: "reserva_rechazada",
          porApp: true,
          porCorreo: false,
          porWhatsapp: true,
        }),
      ).rejects.toThrow(/telefono|teléfono/i);

      // Y sin WhatsApp sí se guarda: lo que se rechaza es el canal, no todo.
      await guardarPreferenciaDeAviso({
        motivo: "reserva_rechazada",
        porApp: false,
        porCorreo: false,
        porWhatsapp: false,
      });
      const avisos = await obtenerPreferenciasDeAviso();
      expect(
        avisos.find((a) => a.motivo === "reserva_rechazada")!.porApp,
      ).toBe(false);
    } finally {
      // La fila cruda, con una escritura directa: así la restauración sigue
      // siendo correcta aunque el repositorio esté roto a propósito.
      await servicio
        .from("perfil")
        .update({ telefono: antes!.telefono })
        .eq("id", sofiaId);
    }
  });

  it("y nadie lee las preferencias de otro", async () => {
    /*
      Por dónde quiere un vecino que le avisen no es un dato del edificio: la
      política es solo de su dueño, ni la administración entra. El control
      positivo al lado --las suyas sí las ve-- porque una lista vacía cumpliría
      igual con la política abierta de par en par.
    */
    const mias = await obtenerPreferenciasDeAviso();
    expect(mias.length).toBeGreaterThan(0);

    const { data: ajenas } = await supabase
      .from("preferencia_aviso")
      .select("id, usuario_id")
      .neq("usuario_id", sofiaId);

    expect(ajenas ?? []).toEqual([]);
  });
});
