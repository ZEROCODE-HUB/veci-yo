import { beforeAll, describe, expect, it } from "vitest";
import { CUENTA, entrar, rpc, type Sesion } from "./apoyo";

/**
 * Las funciones internas no se pueden llamar desde la aplicación.
 *
 * Tres funciones del proyecto están escritas **a propósito** sin comprobar
 * quién pregunta, porque cada una tiene delante una hermana pública que sí lo
 * hace:
 *
 *   · `anotar_verificacion` descuenta y anota una verificación de antecedentes
 *     --que se paga-- «SIN mirar quien la pide», dice su comentario. La que
 *     comprueba el permiso es `verificar_antecedentes`;
 *   · `consumo_verificaciones_de` devuelve el saldo de una vivienda sin
 *     comprobar de quién es;
 *   · `viviendas_de_en` dice en qué deptos vive alguien, de cualquier edificio.
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

/** Las tres, con unos argumentos que no escriben nada aunque se ejecuten. */
const INTERNAS: { nombre: string; argumentos: Record<string, unknown> }[] = [
  { nombre: "viviendas_de_en", argumentos: { p_usuario_id: NADIE, p_condominio_id: CONDOMINIO } },
  { nombre: "consumo_verificaciones_de", argumentos: { p_unidad_id: NADIE } },
  { nombre: "anotar_verificacion", argumentos: { p_invitado_id: NADIE } },
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
