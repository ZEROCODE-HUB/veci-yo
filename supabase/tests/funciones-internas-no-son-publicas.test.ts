import { beforeAll, describe, expect, it } from "vitest";
import { CUENTA, entrar, rpc, type Sesion } from "./apoyo";

/**
 * Las funciones internas no se pueden llamar desde la aplicación.
 *
 * Cinco funciones del proyecto no comprueban quién pregunta, unas porque
 * tienen delante una hermana pública que sí lo hace y otras porque las llama
 * la propia base --un disparador, el cron-- y nadie más tendría por qué:
 *
 *   · `anotar_verificacion` descuenta y anota una verificación de antecedentes
 *     --que se paga-- «SIN mirar quien la pide», dice su comentario. La que
 *     comprueba el permiso es `verificar_antecedentes`;
 *   · `consumo_verificaciones_de` devuelve el saldo de una vivienda sin
 *     comprobar de quién es;
 *   · `viviendas_de_en` dice en qué deptos vive alguien, de cualquier edificio;
 *   · `notificar_unidad` mete en la campana de toda una vivienda una
 *     notificación con el texto que se le pase;
 *   · `enviar_recordatorios_precheckin` dispara la pasada diaria de
 *     recordatorios, y cada uno emite un enlace nuevo que anula el anterior.
 *
 * El único límite entre las dos mitades es un `revoke`. Y el que había escrito
 * **no revocaba nada**: Postgres concede `EXECUTE` de toda función nueva a
 * PUBLIC, y `revoke ... from anon, authenticated` retira una concesión directa
 * que nunca existió mientras deja intacta la de PUBLIC. Las tres se podían
 * llamar con la sesión de cualquier vecino. Está contado en la migración
 * `20261005130000`.
 *
 * Esta prueba es behavioral a propósito: PostgREST no deja consultar
 * `pg_proc`, así que la única forma de saber si el permiso está cerrado es
 * **llamar**. Se comprueba el mensaje y no solo que falle: con un uuid
 * inventado, `anotar_verificacion` también reventaría por no encontrar al
 * invitado, y eso se leería como un éxito de la revocación.
 *
 * El uuid inventado está puesto justo para eso: si la revocación se volviera a
 * romper, esta prueba no gasta un saldo ni deja una verificación firmada.
 */

const NADIE = "00000000-0000-0000-0000-0000000000ff";
const CONDOMINIO = "11111111-1111-1111-1111-111111111111";

/** Las cinco, con unos argumentos que no escriben nada aunque se ejecuten. */
const INTERNAS: { nombre: string; argumentos: Record<string, unknown> }[] = [
  { nombre: "viviendas_de_en", argumentos: { p_usuario_id: NADIE, p_condominio_id: CONDOMINIO } },
  { nombre: "consumo_verificaciones_de", argumentos: { p_unidad_id: NADIE } },
  { nombre: "anotar_verificacion", argumentos: { p_invitado_id: NADIE } },
  /*
    Las dos que aparecieron el 05/10/2026 al escribir las pruebas de las
    preferencias de aviso. Aqui el `grant` a `authenticated` estaba puesto a
    mano, no heredado de PUBLIC:

      · `notificar_unidad` mete una notificacion con el titulo y el texto que
        se le pasen a toda una vivienda --«Tienes un paquete en porteria»--;
      · `enviar_recordatorios_precheckin` dispara la pasada diaria entera, y
        cada recordatorio **emite un enlace nuevo al huesped**, que anula el
        que ya tenia.

    La unidad inventada es la que hace que, si la revocacion se rompiera, esta
    prueba no le mande un aviso falso a nadie ni le rompa el enlace a ningun
    huesped.
  */
  {
    nombre: "notificar_unidad",
    argumentos: {
      p_unidad_id: NADIE,
      p_tipo: "anuncio_publicado",
      p_titulo: "[prueba] no deberia llegar",
      p_mensaje: "[prueba] no deberia llegar",
    },
  },
  { nombre: "enviar_recordatorios_precheckin", argumentos: {} },
  // El calendario que se lee solo (09/10/2026): ninguna pregunta quien llama.
  { nombre: "valor_configuracion", argumentos: { p_clave: "calendario_intervalo_minutos" } },
  { nombre: "calendarios_por_sincronizar", argumentos: {} },
  { nombre: "sincronizar_calendarios_vencidos", argumentos: {} },
];

let vecina: Sesion;

beforeAll(async () => {
  // Una vecina sin más roles: la persona con menos permisos que hay con
  // sesión abierta. Si ella no puede, nadie de `authenticated` puede.
  vecina = await entrar(CUENTA.vecino);
});

describe("una función interna no la llama la aplicación", () => {
  for (const { nombre, argumentos } of INTERNAS) {
    it(`${nombre} responde permiso denegado`, async () => {
      const r = await rpc(vecina, nombre, argumentos);

      /*
        403 y no 404: PostgREST **encuentra** la función --está en el esquema
        expuesto-- y es Postgres el que la rechaza al ejecutarla. El mensaje es
        lo que distingue eso de un fallo de dentro de la función, que con un
        uuid inventado también daría error.
      */
      expect(r.estado).toBe(403);
      expect(r.mensaje ?? "").toMatch(/permission denied/i);
    });
  }

  it("y la hermana pública sí se llama, y comprueba el permiso", async () => {
    /*
      El control positivo. Sin él, los tres casos de arriba pasarían igual con
      el nombre mal escrito: hace falta saber que por esta vía se llega de
      verdad al código, y no que todo da error.

      `consumo_verificaciones` es la pública de `consumo_verificaciones_de`:
      llega al código, y lo que devuelve sobre una vivienda que no es de la
      vecina es nada.
    */
    const r = await rpc(vecina, "consumo_verificaciones", { p_unidad_id: NADIE });

    expect(r.estado).toBe(200);
  });
});
