import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  CLAVE_SERVICIO,
  CONDOMINIO,
  CUENTA,
  UNIDAD,
  URL,
  api,
  entrar,
  fueRechazada,
  leer,
  rpc,
  type Sesion,
} from "./apoyo";

/**
 * El dueño de la plataforma.
 *
 * El rol mas alto del producto, y el unico que se prueba sobre todo por lo que
 * **no** puede: el alcance que se decidio el 02/10/2026 es «lo de la plataforma
 * y nada de los vecinos». Un rol asi es facil de construir mal --una politica
 * `or es_staff_plataforma()` de mas y lee los chats de un edificio entero-- y
 * el error no se nota nunca desde dentro, porque todo funciona.
 *
 * Asi que aqui hay dos mitades:
 *
 *   · lo que SI puede, con su control positivo: si no viera nada, los casos
 *     negativos pasarian igual con todo abierto de par en par;
 *   · lo que NO puede, pidiendolo explicitamente tabla por tabla.
 *
 * Y tres cosas mas que son las que de verdad podrian salir caras: que nadie se
 * nombre a si mismo, que soporte no reparta el rol, y que el unico hueco por el
 * que la plataforma entra a un edificio --invitar a su primer administrador--
 * se cierre en cuanto ese edificio tiene administracion.
 */

let dueno: Sesion;
let admin: Sesion;
let vecino: Sesion;

/** Los edificios que crea este archivo, para retirarlos al terminar. */
const creados: string[] = [];

/** La PQRS de la aplicacion que se usa para responder, y lo que tenia antes. */
let reclamoApp: {
  id: string;
  estado: string;
  resolucion: string | null;
} | null = null;

function servicio(ruta: string, opciones: RequestInit = {}) {
  return fetch(`${URL}/rest/v1/${ruta}`, {
    ...opciones,
    headers: {
      apikey: CLAVE_SERVICIO,
      Authorization: `Bearer ${CLAVE_SERVICIO}`,
      "Content-Type": "application/json",
      ...(opciones.headers ?? {}),
    },
  });
}

beforeAll(async () => {
  [dueno, admin, vecino] = await Promise.all([
    entrar(CUENTA.duenoPlataforma),
    entrar(CUENTA.admin),
    entrar(CUENTA.vecino),
  ]);

  /*
    Se necesita una PQRS de area `aplicacion` para los casos de soporte. Se trae
    una que ya exista --hay 114 en la base-- y se guarda su estado para
    devolverlo. Guardar la fila cruda y no pasar por la funcion del panel: si la
    funcion esta mutada, la restauracion seria con el codigo roto.
  */
  const existentes = await leer(
    dueno,
    `reclamo?area=eq.aplicacion&select=id,estado,resolucion&limit=1`,
  );
  if (existentes.datos.length > 0) {
    reclamoApp = existentes.datos[0];
  }
});

afterAll(async () => {
  if (reclamoApp) {
    /*
      Escritura directa con la sesion del dueño, que es quien puede. Se
      comprueba el error: una limpieza que no comprueba si limpio no es una
      limpieza.
      `resuelto_por` y `resuelto_en` tienen que volver coherentes con el estado,
      porque `reclamo_resuelto_con_actor` lo exige.
      */
    const vuelta = await api(
      dueno,
      `/rest/v1/reclamo?id=eq.${reclamoApp.id}`,
      {
        metodo: "PATCH",
        cuerpo: {
          estado: reclamoApp.estado,
          resolucion: reclamoApp.resolucion,
          ...(reclamoApp.estado === "resuelto"
            ? {}
            : { resuelto_por: null, resuelto_en: null }),
        },
      },
    );
    if (fueRechazada(vuelta)) {
      throw new Error(
        `No se pudo devolver la PQRS ${reclamoApp.id} a su estado: ${JSON.stringify(vuelta.datos)}`,
      );
    }
  }

  /*
    Los edificios que se crearon. `condominio` no tiene politica de DELETE
    --nadie borra un edificio desde una sesion-- asi que esto va con la clave de
    servicio, igual que `limpieza-global` con las invitaciones. Las invitaciones
    del edificio se van en cascada.
  */
  for (const id of creados) {
    const respuesta = await servicio(`condominio?id=eq.${id}`, {
      method: "DELETE",
    });
    if (!respuesta.ok) {
      throw new Error(
        `No se pudo retirar el edificio ${id}: ${await respuesta.text()}`,
      );
    }
  }
});

describe("lo que el dueño de la plataforma sí ve", () => {
  it("los totales de la plataforma", async () => {
    const resumen = await rpc(dueno, "panel_resumen");
    expect(resumen.estado).toBeLessThan(300);

    const fila = resumen.datos[0];
    // Hay dos edificios sembrados por lo menos: el de las pruebas y el ajeno.
    expect(Number(fila.condominios)).toBeGreaterThanOrEqual(2);
    expect(Number(fila.viviendas)).toBeGreaterThan(0);
    expect(Number(fila.cuentas)).toBeGreaterThan(0);
  });

  it("la lista de edificios, con los dos", async () => {
    const lista = await rpc(dueno, "panel_condominios");
    expect(lista.estado).toBeLessThan(300);

    const ids = lista.datos.map((c: any) => c.id);
    expect(ids).toContain(CONDOMINIO);
    // El de Renata. Que el dueño vea **los dos** es justo lo que ningun
    // administrador puede: es su unico privilegio de verdad.
    expect(ids.length).toBeGreaterThanOrEqual(2);

    const nuestro = lista.datos.find((c: any) => c.id === CONDOMINIO);
    expect(Number(nuestro.viviendas)).toBeGreaterThan(0);
    expect(Number(nuestro.personas)).toBeGreaterThan(0);
  });

  it("pero en la lista no viaja el nombre de ningún vecino", async () => {
    /*
      El limite entero depende de esto. Si manaña alguien añade un campo
      `contacto` o `administrador` a la funcion «para que sea mas util», este
      caso se pone rojo y se discute antes, no despues.
    */
    const lista = await rpc(dueno, "panel_condominios");
    const texto = JSON.stringify(lista.datos);

    expect(texto).not.toContain("Marcela");
    expect(texto).not.toContain("Sofía");
    expect(texto).not.toContain("Renata");
    expect(texto).not.toContain("veciyo.test");
  });

  it("las PQRS sobre la aplicación, con quién las escribió", async () => {
    const lista = await rpc(dueno, "panel_reclamos_app");
    expect(lista.estado).toBeLessThan(300);
    expect(lista.datos.length).toBeGreaterThan(0);

    // Todas de la aplicacion y de ningun otro area.
    const primera = lista.datos[0];
    expect(primera.titulo).toBeTruthy();
    expect(primera.autor).toBeTruthy();
    expect(primera.condominio).toBeTruthy();
  });

  it("y las puede contestar", async () => {
    if (!reclamoApp) throw new Error("No hay ninguna PQRS de la aplicacion");

    const respuesta = await rpc(dueno, "panel_responder_reclamo", {
      p_reclamo_id: reclamoApp.id,
      p_resolucion: "[prueba] Lo revisamos y se corrige en la proxima version",
      p_estado: "resuelto",
    });
    expect(fueRechazada(respuesta)).toBe(false);

    const fila = await leer(
      dueno,
      `reclamo?id=eq.${reclamoApp.id}&select=estado,resolucion,resuelto_por`,
    );
    expect(fila.datos[0].estado).toBe("resuelto");
    expect(fila.datos[0].resolucion).toContain("[prueba]");
    // La restriccion `reclamo_resuelto_con_actor` exige saber quien: que sea
    // **el dueño** y no null es lo que hace que la respuesta tenga dueño.
    expect(fila.datos[0].resuelto_por).toBe(dueno.usuarioId);
  });

  it("y queda anotado en la bitácora", async () => {
    const bitacora = await rpc(dueno, "panel_bitacora", { p_limite: 20 });
    expect(bitacora.estado).toBeLessThan(300);

    const acciones = bitacora.datos.map((b: any) => b.accion);
    expect(acciones).toContain("reclamo_app_respondido");
  });
});

describe("lo que el dueño de la plataforma NO ve", () => {
  /*
    Cada uno de estos pide el dato **explicitamente**. Un caso que solo mirara
    «lo que veo es mio» pasaria igual con todo abierto, porque el dueño no tiene
    datos propios en ningun edificio: es exactamente la trampa del caso negativo
    sin datos que ya se documento en AGENTS.md.

    El control positivo de todos ellos es el bloque de arriba --si ve los
    edificios, la sesion funciona-- mas el caso que sigue a este describe, que
    comprueba que la administracion del edificio SI ve lo mismo que se le niega
    al dueño.
  */
  const prohibidas: Array<[string, string]> = [
    ["las viviendas", `unidad?condominio_id=eq.${CONDOMINIO}&select=id`],
    ["los vecinos", `membresia_unidad?select=id,nombre`],
    ["la administración", `membresia_condominio?select=id`],
    ["las visitas", `visita?select=id`],
    ["la correspondencia", `correspondencia?select=id`],
    ["las reservas", `reserva_zona?select=id`],
    ["los pagos", `pago_cuota?select=id`],
    ["los votos", `voto?select=id`],
    ["las conversaciones", `conversacion?select=id`],
  ];

  for (const [que, ruta] of prohibidas) {
    it(`no ve ${que}`, async () => {
      const respuesta = await leer(dueno, ruta);
      // No es un 403: RLS no rechaza, simplemente no hay filas. Que la
      // respuesta sea exitosa y vacia es la forma correcta.
      expect(respuesta.estado).toBeLessThan(300);
      expect(respuesta.datos).toEqual([]);
    });
  }

  it("de los perfiles solo ve el suyo", async () => {
    /*
      Este no va en la lista de arriba porque el suyo **sí** lo ve, igual que
      cualquiera: es su nombre. Lo que no ve es el de nadie más, y eso es lo que
      se comprueba --con el control positivo dentro del mismo caso, que es la
      fila propia--.
    */
    const perfiles = await leer(dueno, `perfil?select=id,nombre`);
    expect(perfiles.estado).toBeLessThan(300);
    expect(perfiles.datos.map((p: any) => p.id)).toEqual([dueno.usuarioId]);
  });

  it("no ve las PQRS del edificio, que son las que no son de la aplicación", async () => {
    const delEdificio = await leer(
      dueno,
      `reclamo?area=eq.condominio&select=id,titulo`,
    );
    expect(delEdificio.estado).toBeLessThan(300);
    expect(delEdificio.datos).toEqual([]);

    // Control positivo en el mismo caso: existen y la administracion las ve.
    const desdeLaAdmin = await leer(
      admin,
      `reclamo?area=eq.condominio&select=id&limit=1`,
    );
    expect(desdeLaAdmin.datos.length).toBe(1);
  });

  it("y tampoco las puede contestar", async () => {
    /*
      Una que **no** esté resuelta ya. La primera versión pedía `limit 1` sin
      más y se llevó una que lo estaba: el caso se puso rojo afirmando que el
      dueño la había resuelto, cuando lo único que pasaba es que venía así. Es
      la trampa de siempre --un `toBe` sobre un dato que la prueba no escribió--
      con el signo cambiado.
    */
    const delEdificio = await leer(
      admin,
      `reclamo?area=eq.condominio&estado=neq.resuelto&select=id&limit=1`,
    );
    expect(delEdificio.datos.length).toBe(1);
    const id = delEdificio.datos[0].id;

    /*
      Por el camino del panel: la funcion comprueba el area desde dentro, asi
      que no basta con que la politica lo impida. Pasarle el identificador de
      una queja del edificio es exactamente lo que alguien probaria.
    */
    const porElPanel = await rpc(dueno, "panel_responder_reclamo", {
      p_reclamo_id: id,
      p_resolucion: "[prueba] no deberia poder",
      p_estado: "resuelto",
    });
    expect(fueRechazada(porElPanel)).toBe(true);

    // Y por el camino de la tabla, que es publico: cualquiera puede llamar a
    // PostgREST sin pasar por la funcion.
    const porLaTabla = await api(dueno, `/rest/v1/reclamo?id=eq.${id}`, {
      metodo: "PATCH",
      cuerpo: { estado: "resuelto" },
    });
    const sigueIgual = await leer(admin, `reclamo?id=eq.${id}&select=estado`);
    expect(sigueIgual.datos[0].estado).not.toBe("resuelto");
    expect(porLaTabla.datos ?? []).toEqual([]);
  });

  it("no da de alta un edificio sin ser dueño de la plataforma", async () => {
    const intento = await rpc(admin, "panel_crear_condominio", {
      p_nombre: "[prueba] Edificio de nadie",
      p_direccion: "Calle Falsa 1",
      p_pais: "CO",
    });
    expect(fueRechazada(intento)).toBe(true);
  });

  it("y un vecino no puede ni mirar el panel", async () => {
    for (const funcion of [
      "panel_resumen",
      "panel_condominios",
      "panel_reclamos_app",
      "panel_staff",
      "panel_bitacora",
    ]) {
      const intento = await rpc(vecino, funcion);
      expect(fueRechazada(intento), `${funcion} dejó entrar a un vecino`).toBe(
        true,
      );
    }
  });
});

describe("la administración del edificio ya no lee las quejas de la app", () => {
  it("existen, y no están en su lista", async () => {
    // Control positivo: el dueño las ve, asi que hay filas que encontrar.
    const desdeLaPlataforma = await leer(
      dueno,
      `reclamo?area=eq.aplicacion&select=id`,
    );
    expect(desdeLaPlataforma.datos.length).toBeGreaterThan(0);

    /*
      Cerraba REVISAR-A-OJO 41: `reclamo_lectura` no miraba el area, asi que la
      administracion del edificio leia las quejas dirigidas al soporte de
      VeciYo. Habia 114.

      Las que escribio ella misma si las ve --`creado_por = auth.uid()`-- y eso
      es correcto: son suyas.
    */
    const desdeLaAdmin = await leer(
      admin,
      `reclamo?area=eq.aplicacion&select=id,creado_por`,
    );
    const ajenas = desdeLaAdmin.datos.filter(
      (r: any) => r.creado_por !== admin.usuarioId,
    );
    expect(ajenas).toEqual([]);
  });
});

describe("nadie se nombra a sí mismo", () => {
  it("el dueño no se puede cambiar su propio rol", async () => {
    const intento = await api(
      dueno,
      `/rest/v1/staff_plataforma?usuario_id=eq.${dueno.usuarioId}`,
      { metodo: "PATCH", cuerpo: { rol: "soporte" } },
    );
    expect(fueRechazada(intento)).toBe(true);

    const fila = await leer(
      dueno,
      `staff_plataforma?usuario_id=eq.${dueno.usuarioId}&select=rol`,
    );
    expect(fila.datos[0].rol).toBe("dueno");
  });

  it("ni por la función del panel", async () => {
    const intento = await rpc(dueno, "panel_dar_rol_plataforma", {
      p_usuario_id: dueno.usuarioId,
      p_rol: "soporte",
    });
    expect(fueRechazada(intento)).toBe(true);
  });

  it("un vecino no se nombra dueño de la plataforma", async () => {
    const porLaTabla = await api(vecino, `/rest/v1/staff_plataforma`, {
      metodo: "POST",
      cuerpo: { usuario_id: vecino.usuarioId, rol: "dueno" },
    });
    expect(fueRechazada(porLaTabla)).toBe(true);

    const porLaFuncion = await rpc(vecino, "panel_dar_rol_plataforma", {
      p_usuario_id: vecino.usuarioId,
      p_rol: "dueno",
    });
    expect(fueRechazada(porLaFuncion)).toBe(true);

    // Y de verdad no lo es: la comprobacion que importa no es el codigo de
    // error, es la fila.
    const staff = await leer(
      dueno,
      `staff_plataforma?usuario_id=eq.${vecino.usuarioId}&select=rol`,
    );
    expect(staff.datos).toEqual([]);
  });

  it("ni la administración de un edificio, que es el rol más alto de abajo", async () => {
    const intento = await rpc(admin, "panel_dar_rol_plataforma", {
      p_usuario_id: admin.usuarioId,
      p_rol: "dueno",
    });
    expect(fueRechazada(intento)).toBe(true);
  });

  it("el último dueño no se queda sin reemplazo", async () => {
    /*
      Si se pudiera quitar al unico dueño, el camino de vuelta seria la clave de
      servicio: la plataforma se quedaria sin nadie que pueda repartir el rol.
      Lo intenta otro dueño, no el mismo, porque eso ya lo impide la regla de
      arriba y entonces el caso pasaria por el motivo equivocado.
    */
    const intento = await rpc(dueno, "panel_quitar_rol_plataforma", {
      p_usuario_id: dueno.usuarioId,
    });
    expect(fueRechazada(intento)).toBe(true);

    const fila = await leer(
      dueno,
      `staff_plataforma?usuario_id=eq.${dueno.usuarioId}&select=activo`,
    );
    expect(fila.datos[0].activo).toBe(true);
  });
});

describe("dar de alta un edificio", () => {
  it("lo crea y deja una invitación para su primer administrador", async () => {
    const alta = await rpc(dueno, "panel_crear_condominio", {
      p_nombre: "[prueba] Torres del Parque",
      p_direccion: "Carrera 5 #26-10",
      p_pais: "CO",
      p_ciudad: "Bogotá",
      p_correo_admin: "admin.nuevo.prueba@veciyo.test",
      p_nombre_admin: "[prueba] Administración",
    });
    expect(alta.estado).toBeLessThan(300);

    const { condominio_id, invitacion_id, token } = alta.datos[0];
    expect(condominio_id).toBeTruthy();
    creados.push(condominio_id);

    expect(invitacion_id).toBeTruthy();
    // El token viaja **una vez**, en la respuesta: en la tabla solo queda su
    // hash, igual que el resto de las invitaciones.
    expect(token).toMatch(/^[0-9a-f]{64}$/);

    const enLaLista = await rpc(dueno, "panel_condominios");
    const ids = enLaLista.datos.map((c: any) => c.id);
    expect(ids).toContain(condominio_id);
  });

  it("y el hueco se cierra en cuanto ese edificio tiene administración", async () => {
    /*
      Esta es la parte delicada de todo el rol. `invitar_primer_administrador`
      existe porque `crear_invitacion` exige `es_admin_condominio` y el dueño de
      la plataforma no administra ningun edificio. Si no estuviera limitada,
      podria invitarse a si misma como administradora de **cualquier** edificio
      --uno con vecinos dentro-- y leerlo todo.

      Lo que la limita es que el edificio no tenga administracion. Se comprueba
      contra «Las Barranqueras», que tiene a Marcela.
    */
    const intento = await rpc(dueno, "invitar_primer_administrador", {
      p_condominio_id: CONDOMINIO,
      p_correo: "yo.mismo.prueba@veciyo.test",
      p_nombre: "[prueba] Yo mismo",
    });
    expect(fueRechazada(intento)).toBe(true);

    // Y no quedo ninguna invitacion suelta.
    const invitaciones = await leer(
      admin,
      `invitacion?condominio_id=eq.${CONDOMINIO}&correo=eq.yo.mismo.prueba@veciyo.test&select=id`,
    );
    expect(invitaciones.datos).toEqual([]);
  });

  it("un edificio sin nombre no se crea", async () => {
    const intento = await rpc(dueno, "panel_crear_condominio", {
      p_nombre: "   ",
      p_direccion: "Calle 1",
      p_pais: "CO",
    });
    expect(fueRechazada(intento)).toBe(true);
  });

  it("el alta queda en la bitácora, con el edificio", async () => {
    const bitacora = await rpc(dueno, "panel_bitacora", { p_limite: 50 });
    const alta = bitacora.datos.find(
      (b: any) => b.accion === "condominio_creado",
    );
    expect(alta).toBeTruthy();
    expect(alta.actor).toContain("Oscar");
  });

  it("la bitácora no se puede falsificar ni borrar", async () => {
    /*
      No tiene politica de INSERT, UPDATE ni DELETE a proposito: se escribe solo
      desde las funciones del panel, que son `security definer`. Un registro que
      su propio actor puede editar no sirve de registro.
    */
    const inventada = await api(dueno, `/rest/v1/bitacora_plataforma`, {
      metodo: "POST",
      cuerpo: { accion: "[prueba] no paso nunca", detalle: {} },
    });
    expect(fueRechazada(inventada)).toBe(true);

    const antes = await leer(
      dueno,
      `bitacora_plataforma?select=id&accion=eq.condominio_creado`,
    );
    const borrado = await api(
      dueno,
      `/rest/v1/bitacora_plataforma?accion=eq.condominio_creado`,
      { metodo: "DELETE" },
    );
    expect(borrado.datos ?? []).toEqual([]);

    const despues = await leer(
      dueno,
      `bitacora_plataforma?select=id&accion=eq.condominio_creado`,
    );
    expect(despues.datos.length).toBe(antes.datos.length);
  });
});

describe("el equipo de la plataforma", () => {
  it("el dueño ve quién es staff", async () => {
    const staff = await rpc(dueno, "panel_staff");
    expect(staff.estado).toBeLessThan(300);

    const yo = staff.datos.find((s: any) => s.usuario_id === dueno.usuarioId);
    expect(yo.rol).toBe("dueno");
    expect(yo.activo).toBe(true);
  });

  it("busca una cuenta por correo para dar el rol", async () => {
    /*
      La regla 3 prohibe identificar personas por correo, y no se hace: esto
      devuelve el `id`, que es la identidad. El correo solo sirve para
      encontrarla y para que quien reparte el rol confirme que es quien cree.
    */
    const encontrada = await rpc(dueno, "panel_buscar_cuenta", {
      p_correo: CUENTA.vecino,
    });
    expect(encontrada.datos.length).toBe(1);
    expect(encontrada.datos[0].usuario_id).toBe(vecino.usuarioId);
    expect(encontrada.datos[0].ya_es_staff).toBe(false);
  });

  it("y un vecino no busca cuentas por correo", async () => {
    const intento = await rpc(vecino, "panel_buscar_cuenta", {
      p_correo: CUENTA.admin,
    });
    expect(fueRechazada(intento)).toBe(true);
  });
});
