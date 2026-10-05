import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio, supabase } from "./cliente";
import {
  dejarResultadosEnBorrador,
  encuestasPorDecidir,
  publicarResultados,
} from "@/features/anuncios/services/anuncios.repo";
import {
  contarRegalosPorDar,
  otorgarReconocimiento,
} from "@/features/inquilino-lider/services";
import { apartarReconocimientosDelMes } from "../apartar-reconocimientos";

/**
 * Recorrido: dos reglas de comunidad que el cliente pidió el 02/10/2026.
 *
 *   · «reconocimientos uno al mes y solo para residentes»;
 *   · al cerrar una encuesta, preguntarle al administrador si publica los
 *     resultados o los deja en borrador.
 *
 * Las dos tapan el mismo tipo de agujero. El reconocimiento no tenía medida:
 * con ocho insignias en el catálogo, una persona podía repartir ocho a su
 * vecino el mismo mes. Y la encuesta prometía en pantalla que «los resultados
 * se mostrarán al cierre» cuando **eso no pasaba nunca** —`ocultar_resultados`
 * se fijaba al crearla y nadie la volvía a tocar—.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const ADMIN = "admin@veciyo.test";
const VECINA = "vecino@veciyo.test";
/** Tomás: huésped de la 102 y **nada más**, para probar el rol en estado puro. */
const HUESPED = "nuevo.inquilino@veciyo.test";

const MARCA = "[prueba] comunidad con medida";

const creadas: string[] = [];
const reconocimientos: string[] = [];

/** Una encuesta ya cerrada, con los resultados ocultos. */
async function encuestaCerrada(titulo: string) {
  const ayer = new Date(Date.now() - 86400000).toISOString();
  const anteayer = new Date(Date.now() - 2 * 86400000).toISOString();

  const { data, error } = await servicio
    .from("publicacion")
    .insert({
      condominio_id: CONDOMINIO,
      tipo: "encuesta",
      categoria: "administracion",
      titulo: `${MARCA} ${titulo}`,
      publicada_desde: anteayer,
      publicada_hasta: ayer,
      ocultar_resultados: true,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  creadas.push(data.id);
  return data.id as string;
}

afterAll(async () => {
  for (const id of creadas) {
    const { error } = await servicio.from("publicacion").delete().eq("id", id);
    if (error) throw new Error(`No se pudo retirar la encuesta ${id}: ${error.message}`);
  }
  for (const id of reconocimientos) {
    await servicio.from("reconocimiento").delete().eq("id", id);
  }
  /*
    Y por la marca, que es lo único que no miente: los casos de abajo pueden
    dejar uno más --el del huésped lo intentó-- y una limpieza que solo borra
    los ids que apuntó deja el resto a la vista del cliente.
  */
  await servicio.from("reconocimiento").delete().eq("motivo", MARCA);
  await salir();
});

describe("un reconocimiento al mes", () => {
  let insignias: { id: string }[] = [];
  let quienDa = "";
  let quienRecibe = "";

  beforeAll(async () => {
    const { data } = await servicio.from("insignia").select("id").limit(2);
    insignias = data ?? [];

    /*
      Se parte de limpio: si esta persona ya dio su reconocimiento del mes
      --y en los datos de prueba lo ha dado-- todo lo de abajo fallaría por una
      fila que esta prueba no escribió.

      **Los dos**, y eso faltaba. Se apartaba solo el de la vecina, y el último
      caso cambia de otorgante a la administración para esquivar el límite del
      mes: Marcela tiene dos reconocimientos del 02/10/2026 --de antes de que
      la regla existiera-- así que ese caso recibía «ya diste tu reconocimiento
      de este mes» en vez de «no vive en el edificio», y comprobaba otra cosa.
      Flaco por construcción: pasaba o no según lo que hubiera en la base.

      Y se apartan a un mes **libre**, no todos a 2020-01-15: el índice único
      por `(quien da, quien recibe, insignia, mes)` rechaza dos de la misma
      terna en el mismo mes, que es justo el caso de Marcela.
    */
    quienDa = await entrarComo(VECINA);
    await salir();
    quienRecibe = await entrarComo(ADMIN);
    await salir();

    /*
      Lo que dejó una corrida que murió a medias. El primer caso cuenta las
      filas con esta marca y espera una: si quedó alguna de antes, cuenta dos y
      el rojo aparece en el caso equivocado. Va antes de apartar, para que lo
      que se borra no cuente para el límite del mes.
    */
    await servicio.from("reconocimiento").delete().eq("motivo", MARCA);

    for (const quien of [quienDa, quienRecibe]) {
      await apartarReconocimientosDelMes({
        usuarioId: quien,
        condominioId: CONDOMINIO,
      });
    }
  });

  it("el primero del mes se da sin problema", async () => {
    await entrarComo(VECINA);

    expect(await contarRegalosPorDar({ condominioId: CONDOMINIO, usuarioId: quienDa })).toBe(1);

    await otorgarReconocimiento({
      insigniaId: insignias[0].id,
      destinatarioUsuarioId: quienRecibe,
      condominioId: CONDOMINIO,
      otorganteUsuarioId: quienDa,
      motivo: MARCA,
    });

    const { data } = await servicio
      .from("reconocimiento")
      .select("id")
      .eq("motivo", MARCA);
    for (const r of data ?? []) reconocimientos.push(r.id);
    expect((data ?? []).length).toBe(1);
  });

  it("el segundo del mismo mes no, aunque sea otra insignia y otra persona", async () => {
    /*
      Este es el agujero. El índice que había era único por
      `(quien da, quien recibe, insignia, mes)`: con ocho insignias en el
      catálogo, ocho reconocimientos al mismo vecino el mismo mes.
    */
    await expect(
      otorgarReconocimiento({
        insigniaId: insignias[1].id,
        destinatarioUsuarioId: quienRecibe,
        condominioId: CONDOMINIO,
        otorganteUsuarioId: quienDa,
        motivo: MARCA,
      }),
    ).rejects.toThrow(/este mes/i);
  });

  it("y la pantalla lo sabe antes de dejar pulsar", async () => {
    /*
      El control de que el mensaje no es lo único: si la cuenta siguiera
      diciendo «te quedan 7», la pantalla ofrecería lo que la base va a
      rechazar, que es el defecto más repetido de este proyecto.
    */
    expect(
      await contarRegalosPorDar({ condominioId: CONDOMINIO, usuarioId: quienDa }),
    ).toBe(0);
  });

  it("no se le puede dar a un huésped temporal", async () => {
    /*
      Tomás, que **solo** es huésped. Antes se elegía «el primer huésped que
      haya», y eso es una cita a ciegas: la primera es Laura, que además es
      residente de la 205, así que `es_vecino_del_condominio` decía que sí --con
      razón-- y el caso no comprobaba nada de lo que dice comprobar.

      Pasaba en verde por otro motivo todavía: el límite del mes saltaba antes
      que esta regla, así que el `rejects.toThrow` se cumplía con el mensaje
      equivocado. Dos errores que se tapaban entre sí.
    */
    const huespedPuro = await entrarComo(HUESPED);
    await salir();

    const { data: roles } = await servicio
      .from("membresia_unidad")
      .select("rol")
      .eq("usuario_id", huespedPuro)
      .eq("activo", true);

    // Si algún día Tomás pasa a residente, este caso deja de medir lo que dice
    // y es mejor que lo avise que pasar en verde.
    expect(roles ?? []).not.toHaveLength(0);
    for (const fila of roles ?? []) {
      expect(fila.rol).toBe("huesped_temporal");
    }

    const huesped = { usuario_id: huespedPuro };

    await salir();
    const otroQuienDa = await entrarComo(ADMIN);
    await expect(
      otorgarReconocimiento({
        insigniaId: insignias[0].id,
        destinatarioUsuarioId: huesped.usuario_id,
        condominioId: CONDOMINIO,
        otorganteUsuarioId: otroQuienDa,
        motivo: MARCA,
      }),
    ).rejects.toThrow(/vive en el edificio/i);
  });
});

describe("la encuesta cerrada espera al administrador", () => {
  let encuesta = "";

  beforeAll(async () => {
    await salir();
    await entrarComo(ADMIN);
    encuesta = await encuestaCerrada("resultados por decidir");
  });

  it("sale en la lista de lo que falta decidir", async () => {
    const lista = await encuestasPorDecidir(CONDOMINIO);
    expect(lista.some((e) => e.id === encuesta)).toBe(true);
  });

  it("al publicarlos queda quién y cuándo", async () => {
    await publicarResultados(encuesta);

    const { data } = await servicio
      .from("publicacion")
      .select("resultados_publicados_en, resultados_publicados_por")
      .eq("id", encuesta)
      .single();

    expect(data!.resultados_publicados_en).not.toBeNull();
    /*
      La firma importa: es una decisión de alguien sobre un dato de la
      comunidad. Sin ella no hay a quién preguntarle.
    */
    expect(data!.resultados_publicados_por).not.toBeNull();
  });

  it("y deja de salir en la lista", async () => {
    const lista = await encuestasPorDecidir(CONDOMINIO);
    expect(lista.some((e) => e.id === encuesta)).toBe(false);
  });

  it("se puede volver atrás: publicar por error no es definitivo", async () => {
    await dejarResultadosEnBorrador(encuesta);

    const { data } = await servicio
      .from("publicacion")
      .select("resultados_publicados_en")
      .eq("id", encuesta)
      .single();
    expect(data!.resultados_publicados_en).toBeNull();
  });

  it("una encuesta todavía abierta no se puede publicar", async () => {
    /*
      Publicar con la votación abierta cambia el resultado: quien no ha votado
      vería por dónde va y votaría a lo ganador.
    */
    const { data, error } = await servicio
      .from("publicacion")
      .insert({
        condominio_id: CONDOMINIO,
        tipo: "encuesta",
        categoria: "administracion",
        titulo: `${MARCA} todavía abierta`,
        publicada_hasta: new Date(Date.now() + 7 * 86400000).toISOString(),
        ocultar_resultados: true,
      })
      .select("id")
      .single();
    expect(error).toBeNull();
    creadas.push(data!.id);

    await expect(publicarResultados(data!.id)).rejects.toThrow(/abierta/i);
  });

  it("y quien no administra no decide nada", async () => {
    await salir();
    try {
      await entrarComo(VECINA);
      await expect(publicarResultados(encuesta)).rejects.toThrow(/administracion/i);
      // Su lista viene vacía, que es el otro lado de lo mismo.
      expect(await encuestasPorDecidir(CONDOMINIO)).toEqual([]);
    } finally {
      await salir();
      await entrarComo(ADMIN);
    }
  });
});
