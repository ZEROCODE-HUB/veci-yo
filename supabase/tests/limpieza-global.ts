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
export default async function limpiar() {
  const marcela = await entrar(CUENTA.admin);

  await api(
    marcela,
    `/rest/v1/reserva_zona?comentarios=like.${encodeURIComponent(MARCA_PRUEBA + "%")}`,
    { metodo: "DELETE" },
  );
  await barrerVisitasDePrueba(marcela);
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
  const marca = encodeURIComponent(MARCA_PRUEBA + "%");

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

  /*
    Y se comprueba **contando**, que es lo unico que no miente: un `delete` que
    no borra responde exito igual. Si algo sobrevive se dice en voz alta, no se
    deja para que lo descubra alguien mirando la aplicacion dentro de un mes.
  */
  const quedan = await api<Array<{ id: string }>>(
    marcela,
    `/rest/v1/visita?profesion=like.${marca}&select=id`,
  );
  if ((quedan.datos ?? []).length > 0) {
    console.warn(
      `[limpieza] quedaron ${quedan.datos!.length} visita(s) de prueba sin retirar`,
    );
  }
}
