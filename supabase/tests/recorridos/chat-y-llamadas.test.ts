import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio, supabase } from "./cliente";
import {
  abrirConversacionArea,
  enviarMensaje,
  marcarLeida,
  obtenerConversaciones,
  obtenerHistorialLlamadas,
  obtenerMensajes,
  registrarLlamada,
} from "@/features/home/services/chat.repo";

/**
 * Recorrido: el chat por áreas y la bitácora de llamadas.
 *
 * Una vivienda habla con portería y con administración por hilos separados, y
 * eso no es un detalle de presentación: **la administración no lee el hilo con
 * portería**. Lo que un vecino le cuenta al guardia a las tres de la mañana no
 * es asunto de quien administra el edificio, y hay una migración entera
 * dedicada a eso (`20260923270000`).
 *
 * La llamada la cursa el teléfono, no la app: esta tabla es la bitácora de a
 * quién se llamó y cuándo. El historial era un array con la duración como texto
 * (`'03:25'`) y el contacto como nombre suelto --dos personas con el mismo
 * nombre compartían historial--.
 *
 * Sobre la limpieza: una `conversacion` **no tiene política de baja**, y está
 * bien que no la tenga, porque es la constancia de que un hilo existió. Por eso
 * la que abre este recorrido se retira con la escoba de servicio, por `id`, en
 * el `afterAll`; los mensajes los borra su propio autor, que sí puede.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const SOFIA = "vecino@veciyo.test"; // vive en la 102
const GUARDIA = "guardia@veciyo.test";
const ADMIN = "admin@veciyo.test";
const AJENO = "propietario@veciyo.test"; // Guillermo: 101 y 205

const MARCA = "[prueba] recorrido chat";

let sofiaId = "";
let guardiaId = "";
let adminId = "";

/** El hilo con administración que abre este recorrido. */
let hiloAdmin = "";
/** El hilo con portería de la 102, que ya existía: no se crea ni se retira. */
let hiloPorteria = "";

const mensajes: string[] = [];
const llamadas: string[] = [];

beforeAll(async () => {
  sofiaId = await entrarComo(SOFIA);
  await salir();
  guardiaId = await entrarComo(GUARDIA);
  await salir();
  adminId = await entrarComo(ADMIN);
  await salir();
  await entrarComo(SOFIA);
});

afterAll(async () => {
  await salir();

  // Los mensajes y las llamadas, por `id` y de uno en uno. Nada de filtros
  // anchos: con la clave de servicio no hay RLS que pare un borrado listillo.
  for (const id of mensajes) {
    await servicio.from("mensaje").delete().eq("id", id);
  }
  for (const id of llamadas) {
    await servicio.from("llamada").delete().eq("id", id);
  }
  if (hiloAdmin) {
    await servicio
      .from("participante_conversacion")
      .delete()
      .eq("conversacion_id", hiloAdmin);
    await servicio.from("conversacion").delete().eq("id", hiloAdmin);
  }
});

/** Apunta el mensaje recién escrito para poder retirarlo. */
async function ultimoMensajeDe(conversacionId: string) {
  const { data } = await supabase
    .from("mensaje")
    .select("id, texto, autor_id, autor_nombre, enviado_en")
    .eq("conversacion_id", conversacionId)
    .order("enviado_en", { ascending: false })
    .limit(1)
    .single();
  if (!mensajes.includes(data!.id)) mensajes.push(data!.id);
  return data!;
}

describe("el chat por áreas", () => {
  it("la vecina abre el hilo con administración de su vivienda", async () => {
    hiloAdmin = await abrirConversacionArea({
      condominioId: CONDOMINIO,
      unidadId: U102,
      area: "administracion",
      usuarioId: sofiaId,
    });
    expect(hiloAdmin).toBeTruthy();

    const { data } = await supabase
      .from("conversacion")
      .select("tipo, area, unidad_id, creada_por")
      .eq("id", hiloAdmin)
      .single();
    expect(data!.tipo).toBe("area");
    expect(data!.unidad_id).toBe(U102);
    // Quién lo abrió, con FK real y no con un nombre en texto.
    expect(data!.creada_por).toBe(sofiaId);
  });

  it("y abrirlo otra vez devuelve el mismo, no uno nuevo", async () => {
    /*
      `conversacion_area_unica` lo sujeta en la base, pero el repositorio busca
      antes de insertar: sin eso, cada vez que la pantalla se abre saldría un
      error de clave duplicada en lugar del hilo de siempre.
    */
    const otra = await abrirConversacionArea({
      condominioId: CONDOMINIO,
      unidadId: U102,
      area: "administracion",
      usuarioId: sofiaId,
    });
    expect(otra).toBe(hiloAdmin);

    const { count } = await supabase
      .from("conversacion")
      .select("id", { count: "exact", head: true })
      .eq("tipo", "area")
      .eq("area", "administracion")
      .eq("unidad_id", U102);
    expect(count).toBe(1);
  });

  it("la vecina escribe y la administración lo lee y contesta", async () => {
    await enviarMensaje({
      conversacionId: hiloAdmin,
      texto: `${MARCA} — hay una gotera en el pasillo`,
      usuarioId: sofiaId,
      nombre: "Sofía",
    });
    const suyo = await ultimoMensajeDe(hiloAdmin);
    // El autor va con FK; el nombre se guarda además para que la burbuja no
    // dependa de una consulta a otra tabla, pero quien manda es el id.
    expect(suyo.autor_id).toBe(sofiaId);

    await salir();
    await entrarComo(ADMIN);
    const recibidos = await obtenerMensajes(hiloAdmin, adminId);
    expect(recibidos.some((m) => m.texto.includes("gotera"))).toBe(true);
    /*
      La burbuja se pinta a un lado u otro según quién escribió. Esto vivía
      dentro de `de` como el literal «yo» y ahora va en `esMio`: en un grupo,
      el autor de los mensajes propios salía escrito «yo» en la pantalla.
    */
    const ajeno = recibidos.find((m) => m.texto.includes("gotera"))!;
    expect(ajeno.esMio).toBe(false);
    // Y `de` es el nombre, siempre: es lo que se pinta junto al depto.
    expect(ajeno.de).toBe("Sofía");

    await enviarMensaje({
      conversacionId: hiloAdmin,
      texto: `${MARCA} — mandamos al técnico mañana`,
      usuarioId: adminId,
      nombre: "Administración",
    });
    await ultimoMensajeDe(hiloAdmin);

    /*
      Y el control por el otro lado: el suyo propio, leído por ella misma. Sin
      este caso, `esMio: false` pasaría igual con la bandera escrita a fuego, y
      es la que decide a qué lado va la burbuja.
    */
    const despues = await obtenerMensajes(hiloAdmin, adminId);
    const propio = despues.find((m) => m.texto.includes("técnico"))!;
    expect(propio.esMio).toBe(true);
    expect(propio.de).toBe("Administración");
  });

  it("lo propio no cuenta como no leído, y marcar lectura lo pone a cero", async () => {
    await salir();
    await entrarComo(SOFIA);

    const { data: unidades } = await supabase
      .from("membresia_unidad")
      .select("unidad_id")
      .eq("usuario_id", sofiaId)
      .eq("activo", true);
    const unidadIds = (unidades ?? []).map((u) => u.unidad_id);

    const antes = await obtenerConversaciones({
      usuarioId: sofiaId,
      comoPersonal: false,
      unidadIds,
    });
    const mio = antes.find((c) => c.id === hiloAdmin)!;
    // Uno solo: el suyo no cuenta aunque nunca haya marcado lectura.
    expect(mio.noLeidos).toBe(1);

    await marcarLeida({ conversacionId: hiloAdmin, usuarioId: sofiaId });

    const despues = await obtenerConversaciones({
      usuarioId: sofiaId,
      comoPersonal: false,
      unidadIds,
    });
    expect(despues.find((c) => c.id === hiloAdmin)!.noLeidos).toBe(0);
  });

  it("la administración no lee el hilo de la vivienda con portería", async () => {
    /*
      El caso que justifica que los hilos estén separados. Lo que un vecino le
      cuenta al guardia de madrugada no es asunto de quien administra.

      Con control positivo delante: el hilo **existe y tiene mensajes**, y el
      guardia los ve. Sin eso, "no veo nada" podría significar que no hay nada.
    */
    await salir();
    await entrarComo(GUARDIA);

    const { data } = await supabase
      .from("conversacion")
      .select("id")
      .eq("tipo", "area")
      .eq("area", "seguridad")
      .eq("unidad_id", U102)
      .single();
    hiloPorteria = data!.id;

    const vistosPorPorteria = await obtenerMensajes(hiloPorteria, guardiaId);
    expect(vistosPorPorteria.length).toBeGreaterThan(0);

    await salir();
    await entrarComo(ADMIN);
    const vistosPorAdmin = await obtenerMensajes(hiloPorteria, adminId);
    expect(vistosPorAdmin).toEqual([]);
  });

  it("y un vecino de otra vivienda no ve ni el hilo ni lo que se dice en él", async () => {
    await salir();
    const ajenoId = await entrarComo(AJENO);

    expect(await obtenerMensajes(hiloAdmin, ajenoId)).toEqual([]);

    const { data } = await supabase
      .from("conversacion")
      .select("id")
      .eq("id", hiloAdmin);
    expect(data).toEqual([]);

    // Y tampoco puede escribir en él, que es la otra mitad.
    await expect(
      enviarMensaje({
        conversacionId: hiloAdmin,
        texto: `${MARCA} — intruso`,
        usuarioId: ajenoId,
        nombre: "Guillermo",
      }),
    ).rejects.toThrow();
  });
});

describe("la bitácora de llamadas", () => {
  it("se registra en segundos, no en texto", async () => {
    await salir();
    await entrarComo(SOFIA);

    await registrarLlamada({
      condominioId: CONDOMINIO,
      usuarioId: sofiaId,
      aNombre: `${MARCA} — portería`,
      aUsuarioId: guardiaId,
      unidadId: U102,
      tipo: "saliente",
      duracionSegundos: 205,
    });

    const { data } = await supabase
      .from("llamada")
      .select("id, duracion_segundos, tipo, de_usuario, a_usuario")
      .eq("a_nombre", `${MARCA} — portería`)
      .single();
    llamadas.push(data!.id);

    // 205 segundos, no '03:25': la duración es un número (regla 5). El mm:ss
    // se arma al pintar.
    expect(data!.duracion_segundos).toBe(205);
    expect(data!.de_usuario).toBe(sofiaId);

    const historial = await obtenerHistorialLlamadas();
    const mia = historial.find((l) => l.id === data!.id)!;
    expect(mia.duracion).toBe("03:25");
  });

  it("una perdida no puede durar nada", async () => {
    /*
      `llamada_perdida_sin_duracion`. Una llamada perdida que duró tres minutos
      es una contradicción, y en la bitácora de una portería esa contradicción
      es la diferencia entre "avisé" y "no contestaron".
    */
    await expect(
      registrarLlamada({
        condominioId: CONDOMINIO,
        usuarioId: sofiaId,
        aNombre: `${MARCA} — imposible`,
        tipo: "perdida",
        duracionSegundos: 180,
      }),
    ).rejects.toThrow();
  });

  it("la ve quien llamó y quien recibió, y nadie más", async () => {
    /*
      A quién llama un residente y cuánto habla no es asunto de la
      administración. Control positivo: el guardia, que fue la otra parte, sí
      la ve.
    */
    await salir();
    await entrarComo(GUARDIA);
    const delGuardia = await obtenerHistorialLlamadas();
    expect(delGuardia.some((l) => l.id === llamadas[0])).toBe(true);

    await salir();
    await entrarComo(ADMIN);
    const delAdmin = await obtenerHistorialLlamadas();
    expect(delAdmin.some((l) => l.id === llamadas[0])).toBe(false);

    await salir();
    await entrarComo(AJENO);
    const delAjeno = await obtenerHistorialLlamadas();
    expect(delAjeno.some((l) => l.id === llamadas[0])).toBe(false);
  });

  it("y nadie registra una llamada a nombre de otro", async () => {
    // `de_usuario = auth.uid()`: si no, cualquiera podría fabricar la
    // constancia de un aviso que nunca hizo.
    await expect(
      supabase
        .from("llamada")
        .insert({
          condominio_id: CONDOMINIO,
          de_usuario: sofiaId,
          a_nombre: `${MARCA} — suplantada`,
          tipo: "saliente",
          duracion_segundos: 10,
        })
        .throwOnError(),
    ).rejects.toThrow();
  });
});
