import { beforeAll, describe, expect, it } from "vitest";
import {
  CONDOMINIO,
  CUENTA,
  UNIDAD,
  api,
  entrar,
  fueRechazada,
  insertar,
  leer,
  type Sesion,
} from "./apoyo";

/**
 * Correspondencia.
 *
 * Es el flujo más frecuente del edificio —llega un paquete, la portería lo
 * registra, el residente lo recoge— y no tenía ninguna prueba. Al cubrirlo
 * aparecieron tres defectos, todos corregidos en 20260922202000:
 *
 *  1. Registrar un paquete **no avisaba a nadie**. El disparador escuchaba
 *     solo `UPDATE` y la aplicación inserta la fila ya en portería.
 *  2. No quedaba constancia de quién lo había recibido.
 *  3. Se avisaba a los huéspedes de la correspondencia del propietario, que
 *     no pueden ni abrir.
 *
 * Los tres casos de abajo son los que habrían avisado.
 */

const PREFIJO = "[prueba correspondencia]";

/** Registra un envío tal como lo hace la app: insertando ya en portería. */
async function registrar(
  porteria: Sesion,
  unidadId: string,
  empresa: string,
  campos: Record<string, unknown> = {},
) {
  const alta = await insertar(
    porteria,
    "correspondencia?select=id,estado,recibida_en,recibida_por",
    {
      condominio_id: CONDOMINIO,
      unidad_id: unidadId,
      empresa: `${PREFIJO} ${empresa}`,
      estado: "en_porteria",
      ...campos,
    },
  );
  expect(alta.estado).toBe(201);
  return alta.datos[0];
}

/** Quién recibió una notificación sobre un envío concreto. */
async function avisados(sesiones: Sesion[], envioId: string) {
  const recibidas: string[] = [];
  for (const sesion of sesiones) {
    const suyas = await leer(
      sesion,
      `notificacion?select=id&entidad_id=eq.${envioId}`,
    );
    if (suyas.datos.length > 0) recibidas.push(sesion.correo);
  }
  return recibidas;
}

beforeAll(async () => {
  const roberto = await entrar(CUENTA.guardia);
  await api(
    roberto,
    `/rest/v1/correspondencia?empresa=like.${encodeURIComponent(`${PREFIJO}%`)}`,
    { metodo: "DELETE" },
  );
});

describe("registrar un paquete", () => {
  it("deja constancia de quién lo recibió y cuándo", async () => {
    const roberto = await entrar(CUENTA.guardia);

    const envio = await registrar(roberto, UNIDAD.u101, "Servientrega");

    // La app no manda estos campos al insertar: los pone la base. Sin ellos,
    // un paquete registrado no decía quién lo había recibido —y la regla 2 de
    // AGENTS.md nombra la correspondencia explícitamente.
    expect(envio.recibida_por).toBe(roberto.usuarioId);
    expect(envio.recibida_en).toBeTruthy();
  });

  it("avisa al residente de la vivienda", async () => {
    const roberto = await entrar(CUENTA.guardia);
    const guillermo = await entrar(CUENTA.propietario);

    const envio = await registrar(roberto, UNIDAD.u101, "DHL");

    // Este es el caso que faltaba: el disparador escuchaba solo `UPDATE`, y
    // la app inserta la fila ya en portería, así que el aviso —el motivo por
    // el que existe este módulo— no llegaba nunca.
    const suyas = await leer(
      guillermo,
      `notificacion?select=titulo,mensaje&entidad_id=eq.${envio.id}`,
    );
    expect(suyas.datos).toHaveLength(1);
    expect(suyas.datos[0].mensaje).toContain("DHL");
  });

  it("no avisa al huésped de la correspondencia del propietario", async () => {
    const roberto = await entrar(CUENTA.guardia);
    const sofia = await entrar(CUENTA.vecino);
    const tomas = await entrar(CUENTA.huesped);

    // La 102 es de Sofía, y Tomás se aloja ahí.
    const envio = await registrar(roberto, UNIDAD.u102, "Coordinadora");

    const quienes = await avisados([sofia, tomas], envio.id);
    // Control positivo y negativo en la misma llamada: la dueña sí, el
    // huésped no. Sin el positivo, "nadie fue avisado" pasaría igual si el
    // disparador estuviera roto del todo.
    expect(quienes).toEqual([sofia.correo]);
  });

  it("avisa también al entregarlo", async () => {
    const roberto = await entrar(CUENTA.guardia);
    const guillermo = await entrar(CUENTA.propietario);

    const envio = await registrar(roberto, UNIDAD.u101, "Interrapidisimo");

    const entrega = await api(
      roberto,
      `/rest/v1/correspondencia?id=eq.${envio.id}`,
      {
        metodo: "PATCH",
        cuerpo: { estado: "entregado", entregada_a: "Guillermo" },
      },
    );
    expect(entrega.estado).toBeLessThan(300);

    const suyas = await leer(
      guillermo,
      `notificacion?select=tipo&entidad_id=eq.${envio.id}`,
    );
    const tipos = suyas.datos.map((n: any) => n.tipo).sort();
    expect(tipos).toEqual(["correspondencia_entregada", "correspondencia_recibida"]);
  });
});

describe("quién ve la correspondencia", () => {
  it("un vecino no ve la de otra vivienda, aunque la pida", async () => {
    const roberto = await entrar(CUENTA.guardia);
    const guillermo = await entrar(CUENTA.propietario);
    const sofia = await entrar(CUENTA.vecino);

    const deSofia = await registrar(roberto, UNIDAD.u102, "Envia");

    // Guillermo pide ese envío concreto, por su id.
    const intento = await leer(
      guillermo,
      `correspondencia?select=id&id=eq.${deSofia.id}`,
    );
    expect(intento.datos).toHaveLength(0);

    // Control positivo: Sofía sí lo ve, así que existe.
    const suyo = await leer(
      sofia,
      `correspondencia?select=id&id=eq.${deSofia.id}`,
    );
    expect(suyo.datos).toHaveLength(1);

    // Y todo lo que Guillermo ve es de sus viviendas.
    const todas = await leer(guillermo, "correspondencia?select=unidad_id");
    for (const fila of todas.datos) {
      expect([UNIDAD.u101, UNIDAD.u205]).toContain(fila.unidad_id);
    }
  });

  it("la portería la ve y la registra para cualquier vivienda", async () => {
    const roberto = await entrar(CUENTA.guardia);

    const envio = await registrar(roberto, UNIDAD.u301, "Fedex");
    const vista = await leer(
      roberto,
      `correspondencia?select=id&id=eq.${envio.id}`,
    );
    expect(vista.datos).toHaveLength(1);
  });

  it("un vecino no registra correspondencia en vivienda ajena", async () => {
    const guillermo = await entrar(CUENTA.propietario);

    const intento = await insertar(guillermo, "correspondencia", {
      condominio_id: CONDOMINIO,
      unidad_id: UNIDAD.u102,
      empresa: `${PREFIJO} suplantada`,
      estado: "en_porteria",
    });
    expect(intento.estado).toBe(403);
  });

  it("una incidencia se ve solo desde la vivienda del envío", async () => {
    const roberto = await entrar(CUENTA.guardia);
    const sofia = await entrar(CUENTA.vecino);
    const guillermo = await entrar(CUENTA.propietario);

    const envio = await registrar(roberto, UNIDAD.u102, "con incidencia", {
      condicion: "mal_estado",
    });

    const incidencia = await insertar(sofia, "incidencia_correspondencia?select=id", {
      correspondencia_id: envio.id,
      descripcion: "Llegó con la caja abierta",
      reportada_por: sofia.usuarioId,
    });
    expect(incidencia.estado).toBe(201);

    // El vecino de al lado no la ve, aunque la pida por el id del envío.
    const ajena = await leer(
      guillermo,
      `incidencia_correspondencia?select=id&correspondencia_id=eq.${envio.id}`,
    );
    expect(ajena.datos).toHaveLength(0);

    // Control positivo: la portería, que responde por el envío, sí.
    const dePorteria = await leer(
      roberto,
      `incidencia_correspondencia?select=id&correspondencia_id=eq.${envio.id}`,
    );
    expect(dePorteria.datos).toHaveLength(1);
  });
});

describe("la entrega en puerta la autoriza la administración", () => {
  /**
   * Del documento de traspaso, flujo 4.5: "el permiso de entrega directa vive
   * a nivel unidad (`PermisoVivienda`), configurado por el Administrador, **no
   * por el propio Residente**". `permiso_vivienda.entrega_directa` era una de
   * las columnas que nadie miraba, así que la portería podía marcar cualquier
   * paquete como "entregar en puerta".
   *
   * A diferencia del aforo o el mínimo de noches —que el KT dice advertir—
   * este no es un límite que el propietario module: es un permiso que concede
   * la administración. Por eso aquí sí se impone.
   */

  it("la portería no puede marcarla si la vivienda no la tiene", async () => {
    const roberto = await entrar(CUENTA.guardia);
    const marcela = await entrar(CUENTA.admin);

    await api(marcela, "/rest/v1/permiso_vivienda?unidad_id=is.null", {
      metodo: "PATCH",
      cuerpo: { entrega_directa: false },
    });

    const vedada = await insertar(roberto, "correspondencia", {
      condominio_id: CONDOMINIO,
      unidad_id: UNIDAD.u101,
      empresa: `${PREFIJO} en puerta`,
      estado: "en_porteria",
      entrega_en_puerta: true,
    });
    expect(fueRechazada(vedada)).toBe(true);

    // Control positivo: autorizada por la administración, entra.
    await api(marcela, "/rest/v1/permiso_vivienda?unidad_id=is.null", {
      metodo: "PATCH",
      cuerpo: { entrega_directa: true },
    });

    const permitida = await insertar(
      roberto,
      "correspondencia?select=entrega_en_puerta",
      {
        condominio_id: CONDOMINIO,
        unidad_id: UNIDAD.u101,
        empresa: `${PREFIJO} en puerta`,
        estado: "en_porteria",
        entrega_en_puerta: true,
      },
    );
    expect(permitida.datos[0].entrega_en_puerta).toBe(true);

    // Y la excepción de una vivienda gana sobre el valor del edificio: la 102
    // la tiene en `false` aunque el condominio diga que sí.
    const conExcepcion = await insertar(roberto, "correspondencia", {
      condominio_id: CONDOMINIO,
      unidad_id: UNIDAD.u102,
      empresa: `${PREFIJO} en puerta`,
      estado: "en_porteria",
      entrega_en_puerta: true,
    });
    expect(fueRechazada(conExcepcion)).toBe(true);

    await api(marcela, "/rest/v1/permiso_vivienda?unidad_id=is.null", {
      metodo: "PATCH",
      cuerpo: { entrega_directa: false },
    });
  });
});
