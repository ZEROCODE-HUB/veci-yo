import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio, supabase } from "./cliente";
import {
  crearAnuncio,
  obtenerAnuncios,
} from "@/features/anuncios/services/anuncios.repo";
import { guardarPreferenciaDeAviso } from "@/features/home/services/notificaciones.repo";

/**
 * Recorrido: un anuncio avisa al publicarse.
 *
 * `motivo_notificacion` tenía el valor `anuncio_publicado` desde el 22/09/2026
 * y **nadie lo insertaba**: se publicaba un anuncio y ningún vecino recibía
 * nada. Lo confirmó el cliente el 05/10/2026 --«pues al publicar el anuncio
 * debe notificarles, no?»-- y eligió tres cosas:
 *
 *   · avisar es **opcional, por publicación**, y vale igual para un anuncio y
 *     para una encuesta;
 *   · **nada de recordatorios** antes de que cierre una encuesta;
 *   · la fecha de publicación **programa de verdad**: hasta ese día no se ve, y
 *     ese día salen los avisos.
 *
 * Corregir un anuncio ya publicado se construyó y se retiró el mismo día: el
 * cliente lo zanjó --«pero si no había lo de corregir anuncio, pues no lo
 * pongas»-- y tenía razón, porque no era lo que había pedido. Lo que queda es
 * el aviso al publicar.
 *
 * Lo que importa comprobar: que el aviso **llega a quien le toca y a nadie
 * más**. El anuncio ya tenía audiencia --propietarios, residentes, huéspedes--
 * y la lista de a quién avisar está escrita en otra función, así que hay un
 * caso que comprueba que las dos dicen lo mismo: es el riesgo de «dos sitios
 * que arman el mismo texto lo arman distinto».
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const ADMIN = "admin@veciyo.test"; // Marcela: administra, y es propietaria de la 301
const SOFIA = "vecino@veciyo.test"; // propietaria de la 102
const HUESPED = "nuevo.inquilino@veciyo.test"; // Tomás, alojado en la 102

const MARCA = "[prueba] aviso";

let adminId = "";
let sofiaId = "";
let huespedId = "";
const publicaciones: string[] = [];

beforeAll(async () => {
  huespedId = await entrarComo(HUESPED);
  await salir();
  sofiaId = await entrarComo(SOFIA);
  await salir();
  adminId = await entrarComo(ADMIN);
});

afterAll(async () => {
  await salir();

  for (const id of publicaciones) {
    await servicio.from("notificacion").delete().eq("entidad_id", id);
    await servicio.from("opcion_voto").delete().eq("publicacion_id", id);
    const { error } = await servicio.from("publicacion").delete().eq("id", id);
    // Una limpieza que no comprueba si limpió no es una limpieza.
    expect(error).toBeNull();
  }

  // Las preferencias vuelven a «no hay fila», que es el estado por defecto.
  await servicio.from("preferencia_aviso").delete().eq("usuario_id", sofiaId);
});

/** Los avisos de anuncio que tiene esa persona ahora mismo. */
async function avisosDe(usuarioId: string): Promise<number> {
  const { count } = await servicio
    .from("notificacion")
    .select("id", { count: "exact", head: true })
    .eq("usuario_id", usuarioId)
    .eq("tipo", "anuncio_publicado");
  return count ?? 0;
}

async function publicar(params: {
  titulo: string;
  avisar?: boolean;
  desde?: Date | null;
  paraPropietarios?: boolean;
  paraResidentes?: boolean;
  paraHuespedes?: boolean;
  tipo?: "anuncio" | "encuesta";
  opciones?: string[];
}): Promise<string> {
  const id = await crearAnuncio({
    condominioId: CONDOMINIO,
    tipo: params.tipo ?? "anuncio",
    categoria: "Mantenimiento",
    titulo: params.titulo,
    descripcion: "Lo de siempre",
    publicadaDesde: params.desde ?? new Date(),
    paraPropietarios: params.paraPropietarios ?? true,
    paraResidentes: params.paraResidentes ?? true,
    paraHuespedes: params.paraHuespedes ?? false,
    avisar: params.avisar ?? true,
    opciones: params.opciones,
  });
  publicaciones.push(id);
  return id;
}

describe("al publicar, avisa", () => {
  it("a la audiencia, y no a quien lo publicó", async () => {
    const antesSofia = await avisosDe(sofiaId);
    const antesAdmin = await avisosDe(adminId);

    await publicar({ titulo: `${MARCA} corte de agua` });

    expect(await avisosDe(sofiaId)).toBe(antesSofia + 1);
    // Marcela es propietaria de la 301, así que entra en la audiencia. Y no
    // recibe nada porque lo publicó ella: ya lo sabe.
    expect(await avisosDe(adminId)).toBe(antesAdmin);
  });

  it("y el aviso dice de qué es y a dónde lleva", async () => {
    const { data } = await servicio
      .from("notificacion")
      .select("titulo, mensaje, entidad_tipo, entidad_id")
      .eq("usuario_id", sofiaId)
      .eq("tipo", "anuncio_publicado")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    expect(data!.titulo).toBe("Nuevo anuncio");
    // El título del anuncio en el cuerpo: «Nuevo anuncio» a secas obliga a
    // entrar para saber si importa.
    expect(data!.mensaje).toContain("corte de agua");
    // Y a dónde lleva al tocarlo.
    expect(data!.entidad_tipo).toBe("publicacion");
    expect(publicaciones).toContain(data!.entidad_id);
  });

  it("una encuesta avisa igual, y lo dice", async () => {
    const antes = await avisosDe(sofiaId);

    await publicar({
      titulo: `${MARCA} pintamos la reja`,
      tipo: "encuesta",
      opciones: ["Sí", "No"],
    });

    expect(await avisosDe(sofiaId)).toBe(antes + 1);

    const { data } = await servicio
      .from("notificacion")
      .select("titulo")
      .eq("usuario_id", sofiaId)
      .eq("tipo", "anuncio_publicado")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    expect(data!.titulo).toBe("Nueva encuesta");
  });

  it("y si no se quiere avisar, no avisa", async () => {
    /*
      La casilla del formulario. El control positivo es el primer caso: sin él,
      «no llegó» pasaría igual con el aviso roto por cualquier otra razón.
    */
    const antes = await avisosDe(sofiaId);
    await publicar({ titulo: `${MARCA} sin aviso`, avisar: false });
    expect(await avisosDe(sofiaId)).toBe(antes);
  });

  it("ni a quien apagó los avisos de anuncio", async () => {
    await salir();
    try {
      await entrarComo(SOFIA);
      await guardarPreferenciaDeAviso({
        motivo: "anuncio_publicado",
        porApp: false,
        porCorreo: false,
        porWhatsapp: false,
      });
    } finally {
      await salir();
      await entrarComo(ADMIN);
    }

    const antes = await avisosDe(sofiaId);
    await publicar({ titulo: `${MARCA} con la casilla apagada` });
    expect(await avisosDe(sofiaId)).toBe(antes);

    // Y se devuelve, que lo demás depende de ello.
    await salir();
    try {
      await entrarComo(SOFIA);
      await guardarPreferenciaDeAviso({
        motivo: "anuncio_publicado",
        porApp: true,
        porCorreo: false,
        porWhatsapp: false,
      });
    } finally {
      await salir();
      await entrarComo(ADMIN);
    }
  });

  it("y la audiencia manda: un anuncio solo para huéspedes no le llega a la propietaria", async () => {
    const antesSofia = await avisosDe(sofiaId);
    const antesHuesped = await avisosDe(huespedId);

    await publicar({
      titulo: `${MARCA} solo para huespedes`,
      paraPropietarios: false,
      paraResidentes: false,
      paraHuespedes: true,
    });

    // El control positivo y el negativo, juntos: sin el positivo, «no le llegó
    // a Sofía» pasaría igual con el aviso apagado del todo.
    expect(await avisosDe(huespedId)).toBe(antesHuesped + 1);
    expect(await avisosDe(sofiaId)).toBe(antesSofia);
  });

  it("y la lista de a quién avisar coincide con quién lo ve", async () => {
    /*
      `quien_alcanza_la_publicacion` y `audiencia_alcanza` dicen lo mismo desde
      dos sitios: una devuelve la lista y la otra responde «yo sí o no». No se
      puede evitar --la segunda pregunta por `auth.uid()`-- pero sí comprobarse.

      Es el riesgo de «dos sitios que arman el mismo texto lo arman distinto»:
      si alguien cambia una y no la otra, se avisaría a quien no lo ve, o al
      contrario.
    */
    const { data: todas } = await servicio
      .from("publicacion")
      .select("id, para_propietarios, para_residentes, para_huespedes")
      .in("id", publicaciones);

    for (const pub of todas ?? []) {
      const { data: alcanzados } = await servicio.rpc(
        "quien_alcanza_la_publicacion",
        { p_publicacion_id: pub.id },
      );
      const lista = ((alcanzados ?? []) as { usuario_id: string }[]).map(
        (f) => f.usuario_id,
      );

      const { data: loVeSofia } = await supabase.rpc("audiencia_alcanza", {
        p_condominio_id: CONDOMINIO,
        p_para_propietarios: pub.para_propietarios,
        p_para_residentes: pub.para_residentes,
        p_para_huespedes: pub.para_huespedes,
      });

      // La sesión abierta es la de la administración, que además es
      // propietaria de la 301: las dos respuestas tienen que coincidir.
      expect(lista.includes(adminId)).toBe(loVeSofia);
    }
  });
});

describe("la fecha de publicación programa de verdad", () => {
  let programado = "";

  it("un anuncio con fecha futura no avisa todavía", async () => {
    /*
      Hasta el 05/10/2026 «Fecha de publicación*» era un campo obligatorio que
      no programaba nada: nadie filtraba por él --ni la política, ni
      `obtenerAnuncios`-- así que el anuncio se veía al momento de crearlo.
    */
    const antes = await avisosDe(sofiaId);

    const dentroDeTres = new Date();
    dentroDeTres.setDate(dentroDeTres.getDate() + 3);
    programado = await publicar({
      titulo: `${MARCA} el jueves cortan la luz`,
      desde: dentroDeTres,
    });

    expect(await avisosDe(sofiaId)).toBe(antes);
  });

  it("ni se ve: la audiencia no lo tiene en la lista", async () => {
    await salir();
    try {
      await entrarComo(SOFIA);
      const suyos = await obtenerAnuncios();
      expect(suyos.some((a) => a.uuid === programado)).toBe(false);
      // Y ve otros: la lista vacía cumpliría lo de arriba por la razón
      // equivocada.
      expect(suyos.length).toBeGreaterThan(0);
    } finally {
      await salir();
      await entrarComo(ADMIN);
    }
  });

  it("pero la administración sí lo ve, para poder corregirlo antes", async () => {
    const todos = await obtenerAnuncios();
    expect(todos.some((a) => a.uuid === programado)).toBe(true);
  });

  it("y el día que llega, la pasada diaria avisa", async () => {
    /*
      Se adelanta la fecha y se corre la pasada, que es lo que hace el cron a
      las 12:05 UTC. Así se comprueba el camino de verdad y no una copia de su
      criterio escrita en la prueba.
    */
    const antes = await avisosDe(sofiaId);

    await servicio
      .from("publicacion")
      .update({ publicada_desde: new Date().toISOString() })
      .eq("id", programado);

    const { data, error } = await servicio.rpc(
      "avisar_publicaciones_programadas",
    );
    expect(error).toBeNull();
    expect(data).toBeGreaterThan(0);

    expect(await avisosDe(sofiaId)).toBe(antes + 1);
  });

  it("y no avisa dos veces", async () => {
    // `avisado_en` es lo que lo evita: sin él, el cron repetiría el aviso cada
    // día mientras el anuncio siguiera publicado.
    const antes = await avisosDe(sofiaId);
    await servicio.rpc("avisar_publicaciones_programadas");
    expect(await avisosDe(sofiaId)).toBe(antes);
  });
});
