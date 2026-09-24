import {
  CLAVE_SERVICIO,
  CUENTA,
  MARCA_PRUEBA,
  URL,
  api,
  entrar,
  type Sesion,
} from "./apoyo";

/**
 * Borra las reservas de prueba antes de que arranque la suite.
 *
 * Estaba como una función que cada archivo tenía que acordarse de llamar, y
 * `huesped.test.ts` no la llamaba: dejó **cincuenta y nueve reservas
 * idénticas** en la piscina, todas el 15/11/2026 de 10 a 12. Nadie se enteró
 * hasta que el disparador de cupos simultáneos empezó a rechazar la número
 * sesenta y las dos pruebas se pusieron rojas.
 *
 * Aquí corre una sola vez, antes que todo, y ningún archivo puede olvidarla.
 */
/**
 * El prefijo por el que se barre.
 *
 * `MARCA_PRUEBA` es `[prueba]`, con corchete de cierre, pero no todas las
 * pruebas marcan igual: la de correspondencia escribe
 * `[prueba correspondencia] DHL`, que **no** casa con `[prueba]%`. Se barre por
 * `[prueba`, que las cubre todas y sigue sin poder confundirse con un dato del
 * cliente.
 */
const PREFIJO = MARCA_PRUEBA.replace("]", "");

/** `like.` de PostgREST, ya codificado. */
const like = encodeURIComponent(PREFIJO + "%");

export default async function limpiar() {
  const marcela = await entrar(CUENTA.admin);

  /*
    Lo que una corrida interrumpida deja atras.

    Cada prueba limpia lo suyo al terminar, pero un `afterAll` no corre si el
    proceso muere a medias --y paso: el sistema mato la suite por falta de
    memoria y dejo ocho paquetes, diez reclamos y **sesenta y ocho anuncios** de
    prueba en el Supabase del cliente, que son los que se ven en la aplicacion--.

    Todas estas tablas cascadean lo suyo (incidencias, adjuntos, opciones y
    votos), asi que basta con borrar la fila de cabecera.
  */
  await api(marcela, `/rest/v1/reserva_zona?comentarios=like.${like}`, { metodo: "DELETE" });
  await api(marcela, `/rest/v1/correspondencia?empresa=like.${like}`, { metodo: "DELETE" });
  await api(marcela, `/rest/v1/publicacion?titulo=like.${like}`, { metodo: "DELETE" });
  await barrerReclamosDePrueba(marcela);
  await barrerVisitasDePrueba(marcela);

  await comprobarQueNoQuedaNada(marcela);
}

/**
 * Los reclamos, que no se pueden borrar y ademas dejan archivos.
 *
 * `reclamo` solo tiene politicas de alta, gestion y lectura: **no de borrado**,
 * y esta bien que asi sea --una PQRS se resuelve, no se hace desaparecer--. Con
 * sesion de persona el `delete` responde exito y no borra nada, que es como se
 * acumularon diez sin que ninguna corrida se pusiera roja: el `afterAll` del
 * recorrido de PQRS llevaba dias sin borrar y nadie lo veia.
 *
 * `adjunto_reclamo` cascadea, pero el fichero del bucket `pqrs` no se va con la
 * fila: quedaria un archivo privado que ya no puede ver ni referenciar nadie.
 * Se retiran primero los ficheros y despues las filas.
 */
async function barrerReclamosDePrueba(marcela: Sesion) {
  const reclamos = await api<Array<{ id: string }>>(
    marcela,
    `/rest/v1/reclamo?titulo=like.${like}&select=id`,
  );
  const ids = (reclamos.datos ?? []).map((r) => r.id);
  if (!ids.length) return;

  const adjuntos = await api<Array<{ ruta: string }>>(
    marcela,
    `/rest/v1/adjunto_reclamo?reclamo_id=in.(${ids.join(",")})&select=ruta`,
  );
  const rutas = (adjuntos.datos ?? []).map((a) => a.ruta).filter(Boolean);
  if (rutas.length) {
    await fetch(`${URL}/storage/v1/object/pqrs`, {
      method: "DELETE",
      headers: {
        apikey: CLAVE_SERVICIO,
        Authorization: `Bearer ${CLAVE_SERVICIO}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prefixes: rutas }),
    });
  }

  await fetch(`${URL}/rest/v1/reclamo?titulo=like.${like}`, {
    method: "DELETE",
    headers: {
      apikey: CLAVE_SERVICIO,
      Authorization: `Bearer ${CLAVE_SERVICIO}`,
      "Content-Type": "application/json",
    },
  });
}

/**
 * Cuenta lo que quedo y lo dice en voz alta.
 *
 * Un `delete` que no borra responde exito igual --ya paso con `reporte_legal`--,
 * asi que lo unico que no miente es contar despues. No se lanza: una limpieza
 * que tumba la suite entera por una fila huerfana seria peor que el problema.
 */
async function comprobarQueNoQuedaNada(marcela: Sesion) {
  const sitios: Array<[string, string]> = [
    ["reserva_zona", "comentarios"],
    ["correspondencia", "empresa"],
    ["publicacion", "titulo"],
    ["reclamo", "titulo"],
    ["visita", "profesion"],
  ];
  for (const [tabla, columna] of sitios) {
    const r = await api<Array<{ id: string }>>(
      marcela,
      `/rest/v1/${tabla}?${columna}=like.${like}&select=id`,
    );
    const n = (r.datos ?? []).length;
    if (n > 0) {
      console.warn(`[limpieza] quedaron ${n} fila(s) de prueba en ${tabla}`);
    }
  }
}

/**
 * Retira las visitas marcadas que sobrevivieron a corridas anteriores.
 *
 * Cada recorrido limpia lo suyo en su `afterAll`, pero eso **se traga los
 * fallos**: `supabase-js` no lanza cuando el borrado se rechaza, asi que la
 * suite sigue en verde y la fila se queda. Se vieron mirando la aplicacion, no
 * la suite.
 *
 * Y el borrado se rechaza de verdad. `reporte_legal` y
 * `verificacion_antecedentes` apuntan al invitado con `on delete restrict` --y
 * esta bien que asi sea: una presentacion a TRA/SIRE y un chequeo de
 * antecedentes son constancias que no deben desaparecer porque alguien borre
 * una visita--. El resultado es un 409 que nadie miraba.
 *
 * A la aplicacion no le afecta: `eliminarVisita` es un borrado **logico**. Es
 * la limpieza de las pruebas la que borra en duro y tiene que abrirse paso.
 *
 * Se barre por las dos marcas que usan los recorridos --la profesion de la
 * visita y el nombre del invitado--, porque no todos marcan la misma. Lo que no
 * lleve `[prueba]` no se toca: es dato del cliente.
 */
async function barrerVisitasDePrueba(marcela: Sesion) {
  const marca = like;

  const porProfesion = await api<Array<{ id: string }>>(
    marcela,
    `/rest/v1/visita?profesion=like.${marca}&select=id`,
  );
  // `api` devuelve `{ estado, datos, mensaje }`, no el array pelado.
  const porInvitado = await api<Array<{ visita_id: string | null }>>(
    marcela,
    `/rest/v1/invitado?nombre=like.${marca}&select=visita_id`,
  );

  const ids = [
    ...new Set([
      ...(porProfesion.datos ?? []).map((v) => v.id),
      ...(porInvitado.datos ?? []).map((i) => i.visita_id).filter(Boolean),
    ]),
  ] as string[];

  for (const id of ids) {
    const invitados = await api<Array<{ id: string }>>(
      marcela,
      `/rest/v1/invitado?visita_id=eq.${id}&select=id`,
    );
    for (const { id: invitadoId } of invitados.datos ?? []) {
      /*
        El reporte legal se retira con la clave de **servicio**, y no por
        comodidad: `reporte_legal` solo tiene politicas de alta, cambio y
        lectura. No tiene borrado, y esta bien que no lo tenga --una
        presentacion a TRA/SIRE es una constancia ante una autoridad--. Con
        sesion de persona el `delete` responde exito y no borra nada, y la
        visita se queda atascada en un 409 que nadie mira.

        Estrecho a proposito: por `invitado_id`, y solo de los invitados de una
        visita ya marcada `[prueba]`.
      */
      await fetch(
        `${URL}/rest/v1/reporte_legal?invitado_id=eq.${invitadoId}`,
        {
          method: "DELETE",
          headers: {
            apikey: CLAVE_SERVICIO,
            Authorization: `Bearer ${CLAVE_SERVICIO}`,
            "Content-Type": "application/json",
          },
        },
      );
      await api(
        marcela,
        `/rest/v1/verificacion_antecedentes?invitado_id=eq.${invitadoId}`,
        { metodo: "DELETE" },
      );
    }
    await api(marcela, `/rest/v1/visita?id=eq.${id}`, { metodo: "DELETE" });
  }

}
