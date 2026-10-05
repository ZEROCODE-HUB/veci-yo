import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio, supabase } from "./cliente";
import {
  abrirConversacionArea,
  enviarMensaje,
  obtenerMensajes,
} from "@/features/home/services/chat.repo";

/**
 * Recorrido: cada mensaje dice de qué depto sale.
 *
 * El cliente lo pidió el 02/10/2026 como «el TAG del depto junto al rol», y al
 * preguntarle en qué pantalla lo había visto contestó lo que de verdad quería:
 * «va siempre, casi en todo lado donde salga el nombre o el alias».
 *
 * En casi todos esos sitios ya estaba --el directorio es la vivienda, el cuadro
 * de honor titula con el departamento, `quien_reservo` devuelve las dos cosas--.
 * Faltaba el **chat**: en un grupo de residentes un mensaje mostraba
 * `autor_nombre` a secas.
 *
 * Lo que se comprueba aquí, y es lo que importa: el depto **lo pone la base**.
 * `autor_nombre` lo manda la aplicación --cualquiera puede firmar un mensaje
 * con el nombre que quiera, que es otro asunto-- y el depto no se le deja poner
 * a nadie: si lo pusiera el cliente, un vecino podría escribir en el grupo con
 * el depto de otro.
 *
 * Una `conversacion` no tiene política de baja --es constancia de que un hilo
 * existió-- así que la que se abre aquí se retira con la escoba de servicio.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const U102 = "44444444-4444-4444-4444-444444444443";
const SOFIA = "vecino@veciyo.test"; // vive en la 102
const GUARDIA = "guardia@veciyo.test"; // no vive en el edificio

const MARCA = "[prueba] depto del autor";

let sofiaId = "";
let guardiaId = "";
let hilo = "";
/**
 * Si el hilo lo abrio esta prueba.
 *
 * El de porteria de la 102 **ya existe** --lo usa `chat-y-llamadas`-- y una
 * `conversacion` no tiene politica de baja porque es la constancia de que un
 * hilo existio. Retirar uno que ya estaba seria borrarle al cliente una
 * conversacion de verdad.
 */
let hiloEsMio = false;
const mensajes: string[] = [];

beforeAll(async () => {
  guardiaId = await entrarComo(GUARDIA);
  await salir();
  sofiaId = await entrarComo(SOFIA);
});

afterAll(async () => {
  await salir();
  for (const id of mensajes) {
    const { error } = await servicio.from("mensaje").delete().eq("id", id);
    // Una limpieza que no comprueba si limpió no es una limpieza.
    expect(error).toBeNull();
  }
  if (hilo && hiloEsMio) {
    await servicio
      .from("participante_conversacion")
      .delete()
      .eq("conversacion_id", hilo);
    await servicio.from("conversacion").delete().eq("id", hilo);
  }
});

/** La fila cruda del último mensaje, que es lo único que no miente. */
async function ultimoCrudo() {
  const { data } = await servicio
    .from("mensaje")
    .select("id, autor_nombre, autor_unidad")
    .eq("conversacion_id", hilo)
    .order("enviado_en", { ascending: false })
    .limit(1)
    .single();
  if (!mensajes.includes(data!.id)) mensajes.push(data!.id);
  return data!;
}

describe("el depto viaja en el mensaje", () => {
  it("la vecina escribe en su hilo con porteria", async () => {
    /*
      Con porteria y no con administracion porque mas abajo hace falta que
      responda el guardia, y `puede_ver_conversacion` no le deja entrar en el
      hilo de administracion --correctamente: lo que un vecino le cuenta al
      guardia no es asunto de quien administra, y hay una migracion dedicada a
      eso--.
    */
    const { data: yaHabia } = await servicio
      .from("conversacion")
      .select("id")
      .eq("tipo", "area")
      .eq("area", "seguridad")
      .eq("unidad_id", U102)
      .maybeSingle();
    hiloEsMio = !yaHabia;

    hilo = await abrirConversacionArea({
      condominioId: CONDOMINIO,
      unidadId: U102,
      area: "seguridad",
      usuarioId: sofiaId,
    });
    expect(hilo).toBeTruthy();

    await enviarMensaje({
      conversacionId: hilo,
      texto: `${MARCA} hola`,
      usuarioId: sofiaId,
      nombre: "Sofia Martinez",
    });

    // 102 es la vivienda de Sofía, y nadie la escribió en el insert.
    expect((await ultimoCrudo()).autor_unidad).toBe("102");
  });

  it("y la pantalla lo vuelve a leer", async () => {
    /*
      El control que hace que lo de arriba signifique algo: comprobar que se
      escribe no es comprobar que se ve. Ya pasó con el número de lavadora, que
      se guardaba bien y no aparecía en ninguna de las cuatro pantallas.
    */
    const leidos = await obtenerMensajes(hilo, sofiaId);
    const mio = leidos.find((m) => m.texto === `${MARCA} hola`);

    expect(mio).toBeTruthy();
    expect(mio!.unidad).toBe("102");
  });

  it("lo que el cliente manda como depto no cuenta", async () => {
    /*
      El caso que justifica que esto sea un disparador y no un parámetro.
      `enviarMensaje` no ofrece la columna, así que se escribe por debajo, que
      es lo que puede hacer cualquiera con el token de su propia sesión: la
      política de alta de `mensaje` solo exige que el autor sea quien escribe.
    */
    const { error } = await supabase.from("mensaje").insert({
      conversacion_id: hilo,
      autor_id: sofiaId,
      autor_nombre: "Sofia Martinez",
      autor_unidad: "301",
      texto: `${MARCA} firmado con el depto de otra`,
    });
    expect(error).toBeNull();

    const fila = await ultimoCrudo();
    expect(fila.autor_unidad).not.toBe("301");
    expect(fila.autor_unidad).toBe("102");
  });

  it("quien no vive en el edificio no lleva depto", async () => {
    /*
      La portería y la administración no tienen vivienda. Una etiqueta vacía
      --o un «sin depto»-- saldría en cada mensaje que escriben, y son los que
      más escriben. `EtiquetaVivienda` no pinta nada con esto en null.
    */
    await salir();
    try {
      await entrarComo(GUARDIA);
      await enviarMensaje({
        conversacionId: hilo,
        texto: `${MARCA} desde porteria`,
        usuarioId: guardiaId,
        nombre: "Roberto Hornado",
      });

      const fila = await ultimoCrudo();
      expect(fila.autor_nombre).toBe("Roberto Hornado");
      expect(fila.autor_unidad).toBeNull();
    } finally {
      await salir();
      await entrarComo(SOFIA);
    }
  });

  it("y quien tiene dos deptos los lleva los dos", async () => {
    /*
      Guillermo es de la 101 y de la 205. Elegir uno al azar sería mentir la
      mitad de las veces, así que `viviendas_de_en` los agrega.

      Se comprueba contra la función y no mandando un mensaje suyo: abrir
      sesión como él para una sola lectura gasta un inicio de sesión del cupo
      del proyecto, que ya puso 56 casos en rojo una vez.

      Y se busca a quien tenga dos en lugar de escribir su uuid: la prueba se
      trae lo que necesita, así que si esa cuenta cambia de viviendas esto lo
      dice en vez de pasar por casualidad.
    */
    const { data: filas } = await servicio
      .from("membresia_unidad")
      .select("usuario_id, unidad:unidad_id!inner ( condominio_id )")
      .eq("activo", true)
      .eq("unidad.condominio_id", CONDOMINIO)
      .not("usuario_id", "is", null);

    const cuantas = new Map<string, number>();
    for (const fila of filas ?? []) {
      const quien = fila.usuario_id as string;
      cuantas.set(quien, (cuantas.get(quien) ?? 0) + 1);
    }
    const conDos = [...cuantas].find(([, n]) => n > 1)?.[0];
    expect(conDos).toBeTruthy();

    const { data, error } = await servicio.rpc("viviendas_de_en", {
      p_usuario_id: conDos!,
      p_condominio_id: CONDOMINIO,
    });

    expect(error).toBeNull();
    expect(String(data).split(", ").length).toBeGreaterThan(1);
  });

  it("y nadie puede preguntar dónde vive nadie", async () => {
    /*
      `viviendas_de_en` es `security definer` y no comprueba quién pregunta:
      con el `execute` que Postgres regala a PUBLIC, cualquiera podría pedir la
      dirección de cualquier vecino de cualquier edificio. Está revocada.
    */
    const { error } = await supabase.rpc("viviendas_de_en", {
      p_usuario_id: sofiaId,
      p_condominio_id: CONDOMINIO,
    });
    expect(error).toBeTruthy();
  });
});
