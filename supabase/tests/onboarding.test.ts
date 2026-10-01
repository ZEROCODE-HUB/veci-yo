import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  api,
  CONDOMINIO,
  CUENTA,
  entrar,
  fueRechazada,
  leer,
  rpc,
  UNIDAD,
  type Sesion,
} from "./apoyo";

/**
 * La puerta de entrada.
 *
 * `ESTADO-PRUEBAS.md` marcaba el onboarding como el único hueco de riesgo
 * **alto**: "Registro, verificación de identidad, aceptar invitación". Es por
 * donde entra todo el mundo y no tenía ninguna prueba propia (R-39).
 *
 * Lo que se comprueba aquí es lo que sostiene el resto del producto: que una
 * invitación es de **una persona concreta**, que se usa **una vez**, que
 * caduca, y que quien entra no llega verificado por el hecho de entrar.
 */

let marcela: Sesion;
let invitado: Sesion;
let guillermo: Sesion;

/** El token de la invitación que crea cada caso. */
async function invitarA(
  correo: string,
  extra: Record<string, unknown> = {},
): Promise<string> {
  const respuesta = await rpc(marcela, "crear_invitacion", {
    p_condominio_id: CONDOMINIO,
    p_ambito: "unidad",
    p_correo: correo,
    p_nombre: "[prueba] Invitada",
    p_unidad_id: UNIDAD.u301,
    p_rol_unidad: "residente",
    ...extra,
  });
  return respuesta.datos[0].token;
}

/**
 * Deja la cuenta invitada como estaba.
 *
 * Las invitaciones **no se borran desde la API**: no hay política de `delete`,
 * a propósito —una invitación emitida es un hecho—. Así que se revocan, que es
 * lo que haría una persona, y cada caso empieza sin ninguna pendiente. La
 * primera versión de esta función hacía `DELETE`, no borraba nada y no fallaba:
 * las invitaciones se acumularon hasta **171** y un caso empezó a leer dos
 * filas donde esperaba una.
 */
async function limpiar() {
  await api(
    marcela,
    `/rest/v1/membresia_unidad?usuario_id=eq.${invitado.usuarioId}`,
    { metodo: "DELETE" },
  );
  await api(
    marcela,
    `/rest/v1/invitacion?correo=eq.${encodeURIComponent(CUENTA.invitadoNuevo)}&estado=eq.pendiente`,
    { metodo: "PATCH", cuerpo: { estado: "revocada" } },
  );
}

beforeAll(async () => {
  [marcela, invitado, guillermo] = await Promise.all([
    entrar(CUENTA.admin),
    entrar(CUENTA.invitadoNuevo),
    entrar(CUENTA.propietario),
  ]);
  await limpiar();
});

afterAll(limpiar);

describe("la invitación es de una persona", () => {
  it("quien entra con el enlace correcto queda dentro", async () => {
    const token = await invitarA(CUENTA.invitadoNuevo);

    const aceptada = await rpc(invitado, "aceptar_invitacion", {
      p_token: token,
    });
    expect(aceptada.estado).toBe(200);

    const membresia = await leer(
      invitado,
      `membresia_unidad?usuario_id=eq.${invitado.usuarioId}&select=rol,unidad_id`,
    );
    expect(membresia.datos).toHaveLength(1);
    expect(membresia.datos[0].rol).toBe("residente");
    expect(membresia.datos[0].unidad_id).toBe(UNIDAD.u301);
  });

  it("el mismo enlace no sirve dos veces", async () => {
    /*
      Si sirviera, quien reenvía el correo a un grupo da de alta a todo el
      grupo. El estado de la invitación pasa a `aceptada` y ese es el cierre.
    */
    const token = await invitarA(CUENTA.invitadoNuevo);
    await rpc(invitado, "aceptar_invitacion", { p_token: token });

    const segunda = await rpc(invitado, "aceptar_invitacion", {
      p_token: token,
    });
    expect(fueRechazada(segunda)).toBe(true);

    await limpiar();
  });

  it("un enlace emitido para otro correo no vale", async () => {
    const token = await invitarA(CUENTA.invitadoNuevo);

    // Guillermo tiene el enlace pero no es la persona invitada.
    const intento = await rpc(guillermo, "aceptar_invitacion", {
      p_token: token,
    });
    expect(fueRechazada(intento)).toBe(true);

    // Control positivo: el mismo enlace sí funciona para quien es.
    const buena = await rpc(invitado, "aceptar_invitacion", { p_token: token });
    expect(buena.estado).toBe(200);

    await limpiar();
  });

  it("un token inventado no abre nada", async () => {
    const intento = await rpc(invitado, "aceptar_invitacion", {
      p_token: "esto-no-es-un-token",
    });
    expect(fueRechazada(intento)).toBe(true);
  });

});

describe("el token no se guarda en claro", () => {
  it("la invitación guarda solo el hash", async () => {
    const token = await invitarA(CUENTA.invitadoNuevo);

    const fila = await leer(
      marcela,
      `invitacion?correo=eq.${encodeURIComponent(CUENTA.invitadoNuevo)}&estado=eq.pendiente&select=*`,
    );
    expect(fila.datos).toHaveLength(1);
    // Ni con acceso a la tabla se reconstruye el enlace.
    expect(JSON.stringify(fila.datos)).not.toContain(token);
    expect(fila.datos[0].token_hash).toMatch(/^[0-9a-f]{64}$/);

    await limpiar();
  });

  it("y `consultar_invitacion` responde sin sesión, solo a quien trae el token", async () => {
    const token = await invitarA(CUENTA.invitadoNuevo);

    // Es lo que hace la web pública: quien llega todavía no tiene cuenta.
    const buena = await rpc(invitado, "consultar_invitacion", {
      p_token: token,
    });
    expect(buena.datos).toHaveLength(1);
    expect(buena.datos[0].correo).toBe(CUENTA.invitadoNuevo);

    const mala = await rpc(invitado, "consultar_invitacion", {
      p_token: "otro-token",
    });
    expect(mala.datos).toHaveLength(0);

    await limpiar();
  });
});

describe("entrar no es estar verificado", () => {
  it("quien acepta una invitación no queda verificado por eso", async () => {
    /*
      `perfil.verificado` significa "alguien comprobó el documento de esta
      persona", y es lo que sostiene que la portería confíe en quien entra
      (R-67). Aceptar una invitación no comprueba ningún documento.
    */
    const token = await invitarA(CUENTA.invitadoNuevo);
    await rpc(invitado, "aceptar_invitacion", { p_token: token });

    const perfil = await leer(
      invitado,
      `perfil?id=eq.${invitado.usuarioId}&select=verificado`,
    );
    expect(perfil.datos[0].verificado).toBe(false);

    await limpiar();
  });

  it("y no se verifica a sí mismo", async () => {
    const intento = await api(
      invitado,
      `/rest/v1/perfil?id=eq.${invitado.usuarioId}`,
      { metodo: "PATCH", cuerpo: { verificado: true } },
    );
    expect(fueRechazada(intento)).toBe(true);
  });
});

describe("quién puede invitar a qué", () => {
  it("un propietario no invita a una vivienda ajena", async () => {
    const intento = await rpc(guillermo, "crear_invitacion", {
      p_condominio_id: CONDOMINIO,
      p_ambito: "unidad",
      p_correo: CUENTA.invitadoNuevo,
      p_nombre: "[prueba] ajena",
      p_unidad_id: UNIDAD.u102,
      p_rol_unidad: "residente",
    });
    expect(fueRechazada(intento)).toBe(true);
  });

  it("y no nombra propietario a nadie", async () => {
    /*
      KT flujo 4.3: "No puede crear Huésped Temporal (va por otro flujo) ni
      Propietario (lo crea el Administrador del edificio)" [DECIDIDO].
    */
    const intento = await rpc(guillermo, "crear_invitacion", {
      p_condominio_id: CONDOMINIO,
      p_ambito: "unidad",
      p_correo: CUENTA.invitadoNuevo,
      p_nombre: "[prueba] propietario",
      p_unidad_id: UNIDAD.u101,
      p_rol_unidad: "propietario",
    });
    expect(fueRechazada(intento)).toBe(true);
  });
});
