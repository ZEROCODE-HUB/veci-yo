import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio, supabase } from "./cliente";
import {
  archivarCanal,
  guardarCanal,
  obtenerCanales,
} from "@/features/administrador/services/canales.repo";
import {
  enviarMensaje,
  obtenerConversaciones,
  obtenerMensajes,
  retirarMensaje,
  silenciarConversacion,
} from "@/features/home/services/chat.repo";

/**
 * Recorrido: los canales del chat del edificio.
 *
 * El cliente pidió el 02/10/2026 seis cosas del chat. Hasta entonces no había
 * canales: había **dos grupos fijos**, y lo eran en tres sitios a la vez --un
 * enum de dos valores, un índice único por `(condominio, ámbito)`, y la
 * pertenencia escrita dentro de una función--. Cambiar los roles de un grupo
 * era escribir una migración, y un edificio dado de alta desde el panel nacía
 * con el chat vacío.
 *
 * Lo que se comprueba aquí:
 *
 *   · un canal se crea con nombre y roles, y se edita;
 *   · **quien tiene el rol entra solo** --no se añade a nadie-- y quien no lo
 *     tiene no ve el canal, que es el control que hace que lo anterior
 *     signifique algo;
 *   · silenciar apaga el contador, que es lo único que VeciYo avisa hoy;
 *   · la administración retira un mensaje ajeno de un canal y un vecino no;
 *   · y **nadie reescribe** un mensaje enviado, que era un agujero abierto
 *     desde el 22/09 con un comentario que afirmaba lo contrario.
 *
 * Sobre la limpieza: una `conversacion` no tiene política de baja --es la
 * constancia de que un hilo existió-- así que el canal que se crea aquí se
 * retira con la escoba de servicio, por su id, en el `afterAll`.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const ADMIN = "admin@veciyo.test"; // Marcela: administra y vive en la 301
const PROPIETARIO = "propietario@veciyo.test"; // Guillermo: 101 y 205
const HUESPED = "nuevo.inquilino@veciyo.test"; // Tomás, de paso en la 102
const U102 = "44444444-4444-4444-4444-444444444443"; // donde se aloja Tomás

const MARCA = "[prueba] canales";
const NOMBRE_CANAL = `${MARCA} Obras`;

let adminId = "";
let propietarioId = "";
let canalId = "";
const mensajes: string[] = [];

beforeAll(async () => {
  propietarioId = await entrarComo(PROPIETARIO);
  await salir();
  adminId = await entrarComo(ADMIN);
});

afterAll(async () => {
  await salir();

  for (const id of mensajes) {
    await servicio.from("mensaje").delete().eq("id", id);
  }
  if (canalId) {
    await servicio.from("canal_rol").delete().eq("conversacion_id", canalId);
    await servicio
      .from("participante_conversacion")
      .delete()
      .eq("conversacion_id", canalId);
    const { error } = await servicio
      .from("conversacion")
      .delete()
      .eq("id", canalId);
    // Una limpieza que no comprueba si limpió no es una limpieza.
    expect(error).toBeNull();
  }
});

describe("el administrador arma los canales", () => {
  it("el edificio ya tiene los suyos, con sus roles", async () => {
    /*
      `panel_crear_condominio` los deja al dar de alta el edificio, y la
      migración los sembró en los dos que ya existían. Sin este caso, todo lo
      de abajo pasaría igual en un edificio sin ningún canal.
    */
    const canales = await obtenerCanales(CONDOMINIO);

    const residentes = canales.find((c) => c.nombre === "Residentes");
    expect(residentes).toBeTruthy();
    expect(residentes!.rolesVivienda).toContain("propietario");
    expect(residentes!.rolesVivienda).toContain("corresidente");
    // El huésped está de paso: antes lo excluía la función a mano y ahora es,
    // sencillamente, un rol que no viene en la lista.
    expect(residentes!.rolesVivienda).not.toContain("huesped_temporal");

    // Y a cuánta gente alcanza, que es lo que hace útil la pantalla.
    expect(residentes!.personas).toBeGreaterThan(0);
  });

  it("crea uno nuevo con nombre y roles", async () => {
    canalId = await guardarCanal({
      condominioId: CONDOMINIO,
      nombre: NOMBRE_CANAL,
      rolesVivienda: ["propietario"],
      rolesEdificio: ["administrador"],
    });
    expect(canalId).toBeTruthy();

    const canales = await obtenerCanales(CONDOMINIO);
    const mio = canales.find((c) => c.id === canalId);

    expect(mio).toBeTruthy();
    expect(mio!.nombre).toBe(NOMBRE_CANAL);
    expect(mio!.rolesVivienda).toEqual(["propietario"]);
    expect(mio!.rolesEdificio).toEqual(["administrador"]);
  });

  it("y un canal sin ningún rol no se guarda", async () => {
    /*
      No lo vería nadie más que la administración, así que no se podría ni
      abrir para arreglarlo. Lo rechaza la base, no la pantalla: el formulario
      también lo avisa, pero la base es la que manda.
    */
    await expect(
      guardarCanal({
        condominioId: CONDOMINIO,
        nombre: `${MARCA} Vacío`,
        rolesVivienda: [],
        rolesEdificio: [],
      }),
    ).rejects.toThrow(/al menos un rol/i);
  });

  it("se le cambia el nombre y los roles, y se reemplazan, no se suman", async () => {
    await guardarCanal({
      condominioId: CONDOMINIO,
      nombre: `${MARCA} Obras y mantenimiento`,
      rolesVivienda: ["inquilino_lider"],
      rolesEdificio: [],
      canalId,
    });

    const mio = (await obtenerCanales(CONDOMINIO)).find((c) => c.id === canalId);
    expect(mio!.nombre).toBe(`${MARCA} Obras y mantenimiento`);
    // `propietario` estaba y ya no: la pantalla manda la lista entera.
    expect(mio!.rolesVivienda).toEqual(["inquilino_lider"]);
    expect(mio!.rolesEdificio).toEqual([]);
  });
});

describe("quien tiene el rol entra solo", () => {
  it("el propietario ve el canal de propietarios", async () => {
    // Se le devuelven los roles de propietario para esta comprobación.
    await guardarCanal({
      condominioId: CONDOMINIO,
      nombre: NOMBRE_CANAL,
      rolesVivienda: ["propietario"],
      rolesEdificio: ["administrador"],
      canalId,
    });

    await salir();
    try {
      await entrarComo(PROPIETARIO);
      const conversaciones = await obtenerConversaciones({
        usuarioId: propietarioId,
        comoPersonal: false,
        unidadIds: [],
      });

      expect(conversaciones.some((c) => c.id === canalId)).toBe(true);
    } finally {
      await salir();
      await entrarComo(ADMIN);
    }
  });

  it("y si el canal deja de incluir su rol, deja de verlo", async () => {
    /*
      El caso que demuestra que la pertenencia **se deduce** y no se guarda.
      Nadie le quita nada a nadie: cambia la lista de roles del canal y la
      visibilidad cambia con ella.
    */
    await guardarCanal({
      condominioId: CONDOMINIO,
      nombre: NOMBRE_CANAL,
      rolesVivienda: ["corresidente"],
      rolesEdificio: ["administrador"],
      canalId,
    });

    await salir();
    try {
      await entrarComo(PROPIETARIO);
      const conversaciones = await obtenerConversaciones({
        usuarioId: propietarioId,
        comoPersonal: false,
        unidadIds: [],
      });
      expect(conversaciones.some((c) => c.id === canalId)).toBe(false);
    } finally {
      await salir();
      await entrarComo(ADMIN);
    }
  });

  it("el huésped temporal no entra en un canal que no lo nombre", async () => {
    /*
      Control positivo al lado: ve **algo** --su hilo con la portería-- así que
      la lista vacía no es la razón de que no vea el canal.

      Y su unidad va en la llamada: `obtenerConversaciones` filtra los hilos de
      área por las viviendas propias --regla 8, para que quien administra y
      además vive no vea los de sus vecinos-- así que con la lista vacía se
      queda sin su propio hilo y el control positivo pasaría a medir nada. Fue
      el primer rojo de este archivo.
    */
    await salir();
    try {
      const huespedId = await entrarComo(HUESPED);
      const conversaciones = await obtenerConversaciones({
        usuarioId: huespedId,
        comoPersonal: false,
        unidadIds: [U102],
      });

      expect(conversaciones.length).toBeGreaterThan(0);
      expect(conversaciones.some((c) => c.id === canalId)).toBe(false);
      expect(conversaciones.some((c) => c.nombre === "Residentes")).toBe(false);
    } finally {
      await salir();
      await entrarComo(ADMIN);
    }
  });
});

describe("silenciar", () => {
  it("un canal silenciado deja de contar, y lo dice", async () => {
    /*
      Lo que se silencia es el contador de no leídos: un mensaje de chat **no
      genera notificación** en VeciYo, así que esa cifra es lo único que avisa.
      Se comprueba con un mensaje ajeno de verdad, no con la columna: medir la
      columna sería comprobar que un `update` escribe.
    */
    await guardarCanal({
      condominioId: CONDOMINIO,
      nombre: NOMBRE_CANAL,
      rolesVivienda: ["propietario"],
      rolesEdificio: ["administrador"],
      canalId,
    });

    await enviarMensaje({
      conversacionId: canalId,
      texto: `${MARCA} empieza el lunes`,
      usuarioId: adminId,
      nombre: "Administración",
    });
    const { data: puesto } = await servicio
      .from("mensaje")
      .select("id")
      .eq("conversacion_id", canalId)
      .order("enviado_en", { ascending: false })
      .limit(1)
      .single();
    mensajes.push(puesto!.id);

    await salir();
    try {
      await entrarComo(PROPIETARIO);

      const antes = (
        await obtenerConversaciones({
          usuarioId: propietarioId,
          comoPersonal: false,
          unidadIds: [],
        })
      ).find((c) => c.id === canalId);
      expect(antes!.noLeidos).toBeGreaterThan(0);
      expect(antes!.silenciado).toBe(false);

      await silenciarConversacion({ conversacionId: canalId, silenciar: true });

      const despues = (
        await obtenerConversaciones({
          usuarioId: propietarioId,
          comoPersonal: false,
          unidadIds: [],
        })
      ).find((c) => c.id === canalId);
      expect(despues!.noLeidos).toBe(0);
      expect(despues!.silenciado).toBe(true);
      // Y el mensaje sigue ahí: silenciar no es borrar.
      expect(despues!.ultimoMensaje).toContain("empieza el lunes");

      // Y se vuelve a oír.
      await silenciarConversacion({ conversacionId: canalId, silenciar: false });
      const otraVez = (
        await obtenerConversaciones({
          usuarioId: propietarioId,
          comoPersonal: false,
          unidadIds: [],
        })
      ).find((c) => c.id === canalId);
      expect(otraVez!.noLeidos).toBeGreaterThan(0);
    } finally {
      await salir();
      await entrarComo(ADMIN);
    }
  });

  it("y nadie silencia el hilo de otro", async () => {
    /*
      `silenciar_conversacion` es `security invoker` a propósito: la política
      exige `usuario_id = auth.uid()`. Con `definer` se podría silenciar
      pasando el id de cualquiera. El caso lo comprueba por el otro lado: la
      fila que se escribe es la de quien llama, nunca otra.
    */
    await silenciarConversacion({ conversacionId: canalId, silenciar: true });

    const { data: filas } = await servicio
      .from("participante_conversacion")
      .select("usuario_id, silenciado")
      .eq("conversacion_id", canalId)
      .eq("silenciado", true);

    expect(filas!.length).toBeGreaterThan(0);
    for (const fila of filas!) {
      expect(fila.usuario_id).toBe(adminId);
    }

    await silenciarConversacion({ conversacionId: canalId, silenciar: false });
  });
});

describe("la administración modera", () => {
  let delPropietario = "";

  it("un vecino escribe en el canal", async () => {
    await salir();
    try {
      await entrarComo(PROPIETARIO);
      await enviarMensaje({
        conversacionId: canalId,
        texto: `${MARCA} esto no debería quedar`,
        usuarioId: propietarioId,
        nombre: "Guillermo Provenzano",
      });
    } finally {
      await salir();
      await entrarComo(ADMIN);
    }

    const { data } = await servicio
      .from("mensaje")
      .select("id")
      .eq("conversacion_id", canalId)
      .eq("autor_id", propietarioId)
      .order("enviado_en", { ascending: false })
      .limit(1)
      .single();

    delPropietario = data!.id;
    mensajes.push(delPropietario);
  });

  it("y la administración lo retira, con constancia de quién", async () => {
    await retirarMensaje(delPropietario);

    const { data } = await servicio
      .from("mensaje")
      .select("deleted_at, eliminado_por")
      .eq("id", delPropietario)
      .single();

    expect(data!.deleted_at).not.toBeNull();
    // Con valor: lo quitó la administración. Null sería «me arrepentí», y para
    // quien lee el hueco que queda no es lo mismo.
    expect(data!.eliminado_por).toBe(adminId);
  });

  it("y desaparece del hilo", async () => {
    /*
      El control que hace que lo de arriba signifique algo: comprobar que se
      escribe `deleted_at` no es comprobar que deja de verse.

      Se miran los mensajes del hilo y no «el último de la lista»: el último
      puede ser otro y entonces el caso pasaría sin comprobar nada.
    */
    const leidos = await obtenerMensajes(canalId, adminId);
    expect(leidos.some((m) => m.texto.includes("no debería quedar"))).toBe(false);
    // Y queda algo: una lista vacía cumpliría lo de arriba por la razón
    // equivocada.
    expect(leidos.length).toBeGreaterThan(0);
  });

  it("un vecino no retira el mensaje de otro", async () => {
    await enviarMensaje({
      conversacionId: canalId,
      texto: `${MARCA} aviso de la administración`,
      usuarioId: adminId,
      nombre: "Administración",
    });
    const { data } = await servicio
      .from("mensaje")
      .select("id")
      .eq("conversacion_id", canalId)
      .eq("autor_id", adminId)
      .is("deleted_at", null)
      .order("enviado_en", { ascending: false })
      .limit(1)
      .single();
    const delAdmin = data!.id;
    mensajes.push(delAdmin);

    await salir();
    try {
      await entrarComo(PROPIETARIO);
      await expect(retirarMensaje(delAdmin)).rejects.toThrow();

      const { data: sigue } = await servicio
        .from("mensaje")
        .select("deleted_at")
        .eq("id", delAdmin)
        .single();
      expect(sigue!.deleted_at).toBeNull();
    } finally {
      await salir();
      await entrarComo(ADMIN);
    }
  });

  it("pero sí retira el suyo, y queda sin firma de moderación", async () => {
    await salir();
    let suyo = "";
    try {
      await entrarComo(PROPIETARIO);
      await enviarMensaje({
        conversacionId: canalId,
        texto: `${MARCA} me equivoqué`,
        usuarioId: propietarioId,
        nombre: "Guillermo Provenzano",
      });

      const { data } = await servicio
        .from("mensaje")
        .select("id")
        .eq("conversacion_id", canalId)
        .eq("autor_id", propietarioId)
        .is("deleted_at", null)
        .order("enviado_en", { ascending: false })
        .limit(1)
        .single();
      suyo = data!.id;
      mensajes.push(suyo);

      await retirarMensaje(suyo);
    } finally {
      await salir();
      await entrarComo(ADMIN);
    }

    const { data } = await servicio
      .from("mensaje")
      .select("deleted_at, eliminado_por")
      .eq("id", suyo)
      .single();
    expect(data!.deleted_at).not.toBeNull();
    expect(data!.eliminado_por).toBeNull();
  });
});

describe("un mensaje enviado no se reescribe", () => {
  it("ni su autor le cambia el texto", async () => {
    /*
      El agujero que apareció al leer la política de moderación.
      `mensaje_baja_propia` es un `for update` sobre toda la fila y llevaba
      desde el 22/09/2026 un comentario que decía «Solo para fijar
      `deleted_at`. El texto de un mensaje ya enviado no se reescribe». **No lo
      sujetaba nada.**

      O sea que se podía escribir algo en un canal, dejar que lo leyeran, y
      cambiarlo después por otra cosa. Y la pantalla no distingue un mensaje
      editado de uno que siempre dijo eso.

      No lo veía ninguna prueba: las de RLS comprueban **quién** puede
      escribir, y el autor puede. Lo que nadie comprobaba es **qué** puede
      cambiar. Va en un disparador porque RLS no sabe comparar el valor viejo
      con el nuevo.

      Se escribe por debajo y no por el repositorio porque el repositorio no
      ofrece esto: es lo que podía hacer cualquiera con el token de su sesión.
    */
    await salir();
    try {
      await entrarComo(PROPIETARIO);
      await enviarMensaje({
        conversacionId: canalId,
        texto: `${MARCA} lo que dije de verdad`,
        usuarioId: propietarioId,
        nombre: "Guillermo Provenzano",
      });

      const { data } = await servicio
        .from("mensaje")
        .select("id")
        .eq("conversacion_id", canalId)
        .eq("autor_id", propietarioId)
        .is("deleted_at", null)
        .order("enviado_en", { ascending: false })
        .limit(1)
        .single();
      const suyo = data!.id;
      mensajes.push(suyo);

      const { error } = await supabase
        .from("mensaje")
        .update({ texto: `${MARCA} otra cosa completamente` })
        .eq("id", suyo);

      expect(error).toBeTruthy();
      expect(error!.message).toMatch(/no se reescribe/i);

      const { data: sigue } = await servicio
        .from("mensaje")
        .select("texto")
        .eq("id", suyo)
        .single();
      expect(sigue!.texto).toContain("lo que dije de verdad");
    } finally {
      await salir();
      await entrarComo(ADMIN);
    }
  });

  it("ni se cambia de autor", async () => {
    // Firmar con el nombre de otro ya se podía al enviar --`autor_nombre` lo
    // manda el cliente, es otro asunto-- y cambiarlo después, no.
    const { data } = await servicio
      .from("mensaje")
      .select("id")
      .eq("conversacion_id", canalId)
      .eq("autor_id", adminId)
      .is("deleted_at", null)
      .limit(1)
      .single();

    const { error } = await supabase
      .from("mensaje")
      .update({ autor_nombre: "Otra persona" })
      .eq("id", data!.id);

    expect(error).toBeTruthy();
    expect(error!.message).toMatch(/no se reescribe/i);
  });
});

describe("archivar un canal", () => {
  it("no admite mensajes nuevos, y lo dicho se conserva", async () => {
    await archivarCanal({ canalId, archivar: true });

    await expect(
      enviarMensaje({
        conversacionId: canalId,
        texto: `${MARCA} tarde`,
        usuarioId: adminId,
        nombre: "Administración",
      }),
    ).rejects.toThrow(/archivado/i);

    // Lo dicho sigue: borrar el canal se llevaría los mensajes por el cascade.
    const { count } = await servicio
      .from("mensaje")
      .select("id", { count: "exact", head: true })
      .eq("conversacion_id", canalId);
    expect(count).toBeGreaterThan(0);
  });

  it("y se recupera", async () => {
    await archivarCanal({ canalId, archivar: false });

    const mio = (await obtenerCanales(CONDOMINIO)).find((c) => c.id === canalId);
    expect(mio!.archivado).toBe(false);
  });
});
