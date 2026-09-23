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
  rpc,
} from "./apoyo";

/**
 * Quién manda sobre qué.
 *
 * Estas pruebas salieron de barrer las políticas de **escritura** de las 55
 * tablas buscando una forma concreta: `for all` con un predicado que responde
 * "¿tenés algo que ver con esta fila?" en vez de "¿podés hacer **esto** con
 * esta fila?". Aparecieron dos, y las dos eran explotables con una sola
 * llamada a la API:
 *
 *  · `membresia_unidad_escritura` era `es_miembro_unidad(...)`: una inquilina
 *    se ascendió a propietaria y borró la membresía del propietario real.
 *  · `reserva_zona_escritura` era `puede_operar_unidad(...)`, y `estado` es
 *    una columna más: quien pedía la reserva se la aprobaba.
 *
 * El resto del archivo cubre el resto del panel de administración, que es el
 * rol con más capacidad de escritura del producto y no tenía ninguna prueba.
 */

beforeAll(async () => {
  // Las pruebas de más abajo crean torres y zonas; se limpian antes de empezar
  // para que la suite pueda correrse dos veces seguidas.
  const marcela = await entrar(CUENTA.admin);
  await api(marcela, `/rest/v1/torre?nombre=like.${encodeURIComponent("[prueba]%")}`, {
    metodo: "DELETE",
  });
  await api(
    marcela,
    `/rest/v1/zona_comun?nombre=like.${encodeURIComponent("[prueba]%")}`,
    { metodo: "DELETE" },
  );
});

describe("quién pertenece a una vivienda", () => {
  it("un inquilino no se asciende a propietario", async () => {
    const laura = await entrar(CUENTA.laura);

    const suya = await leer(
      laura,
      `membresia_unidad?select=id,rol&unidad_id=eq.${UNIDAD.u205}&usuario_id=eq.${laura.usuarioId}`,
    );
    expect(suya.datos[0].rol).toBe("inquilino_lider");

    const ascenso = await api(
      laura,
      `/rest/v1/membresia_unidad?id=eq.${suya.datos[0].id}`,
      { metodo: "PATCH", cuerpo: { rol: "propietario" } },
    );
    expect(fueRechazada(ascenso)).toBe(true);

    // Y sigue siendo inquilina.
    const despues = await leer(
      laura,
      `membresia_unidad?select=rol&id=eq.${suya.datos[0].id}`,
    );
    expect(despues.datos[0].rol).toBe("inquilino_lider");
  });

  it("nadie borra la membresía del propietario de su vivienda", async () => {
    const laura = await entrar(CUENTA.laura);
    const guillermo = await entrar(CUENTA.propietario);

    const delDuenio = await leer(
      laura,
      `membresia_unidad?select=id&unidad_id=eq.${UNIDAD.u205}&usuario_id=eq.${guillermo.usuarioId}`,
    );
    expect(delDuenio.datos).toHaveLength(1);

    const borrado = await api(
      laura,
      `/rest/v1/membresia_unidad?id=eq.${delDuenio.datos[0].id}`,
      { metodo: "DELETE" },
    );
    expect(fueRechazada(borrado)).toBe(true);

    // Control positivo: la fila sigue ahí.
    const sigue = await leer(
      guillermo,
      `membresia_unidad?select=id&id=eq.${delDuenio.datos[0].id}`,
    );
    expect(sigue.datos).toHaveLength(1);
  });

  it("nadie se concede a sí mismo más permisos", async () => {
    const laura = await entrar(CUENTA.laura);

    const suya = await leer(
      laura,
      `membresia_unidad?select=id&unidad_id=eq.${UNIDAD.u205}&usuario_id=eq.${laura.usuarioId}`,
    );

    const intento = await api(
      laura,
      `/rest/v1/membresia_unidad?id=eq.${suya.datos[0].id}`,
      { metodo: "PATCH", cuerpo: { es_admin_primario: true, puede_acceder: true } },
    );
    expect(fueRechazada(intento)).toBe(true);
  });

  it("pero sí puede corregir su propio teléfono", async () => {
    const laura = await entrar(CUENTA.laura);

    const suya = await leer(
      laura,
      `membresia_unidad?select=id,telefono&unidad_id=eq.${UNIDAD.u205}&usuario_id=eq.${laura.usuarioId}`,
    );
    const original = suya.datos[0].telefono;

    // La protección tiene que ser del rol y los permisos, no de la fila
    // entera: el nombre y el teléfono que se muestran son suyos.
    const cambio = await api(
      laura,
      `/rest/v1/membresia_unidad?id=eq.${suya.datos[0].id}`,
      { metodo: "PATCH", cuerpo: { telefono: "+57 300 1112233" } },
    );
    expect(cambio.estado).toBeLessThan(300);

    await api(laura, `/rest/v1/membresia_unidad?id=eq.${suya.datos[0].id}`, {
      metodo: "PATCH",
      cuerpo: { telefono: original },
    });
  });

  it("quien gestiona la vivienda sí puede dar de baja a alguien", async () => {
    const sofia = await entrar(CUENTA.vecino);
    const marcela = await entrar(CUENTA.admin);
    const invitado = await entrar(CUENTA.invitadoNuevo);

    /**
     * El control positivo de todo lo anterior, y no es una formalidad: la
     * primera versión del disparador terminaba con `return new`, que en un
     * `before delete` equivale a devolver NULL y **cancela el borrado en
     * silencio** —sin error, sin fila afectada, sin pista—. Todas las pruebas
     * de "no puede borrar" seguían en verde; lo que se rompió fue poder
     * borrar.
     */
    await api(
      marcela,
      `/rest/v1/membresia_unidad?usuario_id=eq.${invitado.usuarioId}`,
      { metodo: "DELETE" },
    );

    const alta = await insertar(sofia, "membresia_unidad?select=id", {
      unidad_id: UNIDAD.u102,
      usuario_id: invitado.usuarioId,
      nombre: "De paso",
      rol: "huesped_temporal",
      vigente_hasta: "2030-12-31",
    });
    expect(alta.estado).toBe(201);

    await api(
      sofia,
      `/rest/v1/membresia_unidad?id=eq.${alta.datos[0].id}`,
      { metodo: "DELETE" },
    );

    const despues = await leer(
      sofia,
      `membresia_unidad?select=id&id=eq.${alta.datos[0].id}`,
    );
    expect(despues.datos).toHaveLength(0);
  });

  it("un vecino no se cuela en una vivienda ajena", async () => {
    const guillermo = await entrar(CUENTA.propietario);

    const intento = await insertar(guillermo, "membresia_unidad", {
      unidad_id: UNIDAD.u102,
      usuario_id: guillermo.usuarioId,
      nombre: "Guillermo Provenzano",
      rol: "residente",
    });
    expect(fueRechazada(intento)).toBe(true);
  });

  it("la invitación de un propietario sigue funcionando", async () => {
    const marcela = await entrar(CUENTA.admin);
    const nuevo = await entrar(CUENTA.propietarioNuevo);

    // `aceptar_invitacion` crea la membresía en nombre de quien acepta, y
    // puede ser la del propietario: es el caso que la protección de arriba
    // podría romper sin querer.
    await api(
      marcela,
      `/rest/v1/membresia_unidad?usuario_id=eq.${nuevo.usuarioId}`,
      { metodo: "DELETE" },
    );
    await api(
      marcela,
      `/rest/v1/invitacion?correo=eq.${encodeURIComponent(CUENTA.propietarioNuevo)}`,
      { metodo: "DELETE" },
    );

    const invitacion = await rpc(marcela, "crear_invitacion", {
      p_condominio_id: CONDOMINIO,
      p_ambito: "unidad",
      p_correo: CUENTA.propietarioNuevo,
      p_nombre: "Nuevo Propietario",
      p_unidad_id: UNIDAD.u301,
      p_rol_unidad: "propietario",
    });
    expect(invitacion.estado).toBe(200);

    const aceptada = await rpc(nuevo, "aceptar_invitacion", {
      p_token: invitacion.datos[0].token,
    });
    expect(aceptada.estado).toBe(200);

    const sesion = await entrar(CUENTA.propietarioNuevo);
    const membresia = await leer(sesion, "membresia_unidad?select=rol");
    expect(membresia.datos[0].rol).toBe("propietario");

    await api(
      marcela,
      `/rest/v1/membresia_unidad?usuario_id=eq.${nuevo.usuarioId}`,
      { metodo: "DELETE" },
    );
  });
});

describe("quién aprueba una reserva", () => {
  it("quien la pide no se la aprueba", async () => {
    const guillermo = await entrar(CUENTA.propietario);
    const marcela = await entrar(CUENTA.admin);

    const zona = await leer(
      guillermo,
      "zona_comun?select=id&requiere_aprobacion=is.true&limit=1",
    );
    expect(zona.datos).toHaveLength(1);

    const reserva = await insertar(guillermo, "reserva_zona?select=id,estado", {
      zona_id: zona.datos[0].id,
      unidad_id: UNIDAD.u101,
      solicitada_por: guillermo.usuarioId,
      fecha: "2026-12-20",
      hora_inicio: "10:00",
      hora_fin: "12:00",
    });
    expect(reserva.datos[0].estado).toBe("pendiente");
    const reservaId = reserva.datos[0].id;

    const autoAprobada = await api(
      guillermo,
      `/rest/v1/reserva_zona?id=eq.${reservaId}`,
      {
        metodo: "PATCH",
        cuerpo: {
          estado: "aprobada",
          resuelta_por: guillermo.usuarioId,
          resuelta_en: new Date().toISOString(),
        },
      },
    );
    expect(fueRechazada(autoAprobada)).toBe(true);

    // Cancelar lo suyo sí: decidir es otra cosa.
    const cancelada = await api(
      guillermo,
      `/rest/v1/reserva_zona?id=eq.${reservaId}`,
      { metodo: "PATCH", cuerpo: { estado: "cancelada" } },
    );
    expect(cancelada.estado).toBeLessThan(300);

    // Control positivo: la administración sí decide.
    const porLaAdmin = await api(
      marcela,
      `/rest/v1/reserva_zona?id=eq.${reservaId}`,
      {
        metodo: "PATCH",
        cuerpo: {
          estado: "aprobada",
          resuelta_por: marcela.usuarioId,
          resuelta_en: new Date().toISOString(),
        },
      },
    );
    expect(porLaAdmin.estado).toBeLessThan(300);

    await api(marcela, `/rest/v1/reserva_zona?id=eq.${reservaId}`, {
      metodo: "DELETE",
    });
  });
});

describe("la arquitectura del edificio es de la administración", () => {
  it("un vecino no crea torres, unidades ni zonas comunes", async () => {
    const guillermo = await entrar(CUENTA.propietario);

    const torre = await insertar(guillermo, "torre", {
      condominio_id: CONDOMINIO,
      numero: 99,
      nombre: "[prueba] Torre de un vecino",
    });
    expect(fueRechazada(torre)).toBe(true);

    const zona = await insertar(guillermo, "zona_comun", {
      condominio_id: CONDOMINIO,
      nombre: "[prueba] Zona de un vecino",
      tipo: "piscina",
    });
    expect(fueRechazada(zona)).toBe(true);

    const cuota = await insertar(guillermo, "cuota_administracion", {
      condominio_id: CONDOMINIO,
      periodo: "2026-12-01",
      monto: 1,
      moneda: "COP",
    });
    expect(fueRechazada(cuota)).toBe(true);
  });

  it("la administración sí, y la portería no", async () => {
    const marcela = await entrar(CUENTA.admin);
    const roberto = await entrar(CUENTA.guardia);

    const torre = await insertar(marcela, "torre?select=id", {
      condominio_id: CONDOMINIO,
      numero: 99,
      nombre: "[prueba] Torre nueva",
    });
    expect(torre.estado).toBe(201);

    // La portería vigila; no rehace el edificio.
    const deLaPorteria = await insertar(roberto, "torre", {
      condominio_id: CONDOMINIO,
      numero: 98,
      nombre: "[prueba] Torre de la porteria",
    });
    expect(fueRechazada(deLaPorteria)).toBe(true);

    await api(marcela, `/rest/v1/torre?id=eq.${torre.datos[0].id}`, {
      metodo: "DELETE",
    });
  });

  it("un vecino no se nombra a sí mismo personal del condominio", async () => {
    const guillermo = await entrar(CUENTA.propietario);

    const intento = await insertar(guillermo, "membresia_condominio", {
      condominio_id: CONDOMINIO,
      usuario_id: guillermo.usuarioId,
      rol: "administrador",
    });
    expect(fueRechazada(intento)).toBe(true);
  });

  it("un vecino no resuelve ni reabre una PQRS", async () => {
    const guillermo = await entrar(CUENTA.propietario);

    const suya = await leer(guillermo, "reclamo?select=id,estado&limit=1");
    expect(suya.datos.length).toBeGreaterThan(0);
    const { id, estado } = suya.datos[0];

    /**
     * Gestionar una PQRS —cambiarle el estado, la categoría— es de la
     * administración, aunque la haya abierto uno.
     *
     * Ojo con la forma de comprobarlo: `reclamo_gestion` filtra en el `using`,
     * así que el PATCH **no da error**. PostgREST responde 200 con una lista
     * vacía porque no alcanzó a ninguna fila. Lo que hay que mirar es que el
     * estado no haya cambiado, no el código de respuesta.
     */
    await api(guillermo, `/rest/v1/reclamo?id=eq.${id}`, {
      metodo: "PATCH",
      cuerpo: { estado: "resuelto" },
    });

    const despues = await leer(guillermo, `reclamo?select=estado&id=eq.${id}`);
    expect(despues.datos[0].estado).toBe(estado);
  });

  it("la administración sí la resuelve", async () => {
    const marcela = await entrar(CUENTA.admin);

    // Control positivo del caso anterior: si nadie pudiera resolver una PQRS,
    // aquel pasaría igual con la política abierta de par en par.
    const alguna = await leer(marcela, "reclamo?select=id,estado&limit=1");
    const { id, estado } = alguna.datos[0];

    const gestion = await api(marcela, `/rest/v1/reclamo?id=eq.${id}`, {
      metodo: "PATCH",
      cuerpo: { estado: "en_curso" },
    });
    expect(gestion.estado).toBeLessThan(300);

    const despues = await leer(marcela, `reclamo?select=estado&id=eq.${id}`);
    expect(despues.datos[0].estado).toBe("en_curso");

    await api(marcela, `/rest/v1/reclamo?id=eq.${id}`, {
      metodo: "PATCH",
      cuerpo: { estado },
    });
  });
});
