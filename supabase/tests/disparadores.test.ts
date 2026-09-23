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
 * Un disparador escucha toda la vida de la fila, no media.
 *
 * Estas pruebas salieron de enumerar los doce disparadores del esquema y
 * contrastar qué eventos escucha cada uno con lo que la aplicación —o
 * cualquiera con la API— puede escribir. Es el mismo método que cerró la lista
 * de casillas decorativas.
 *
 * El defecto tiene una forma reconocible: el disparador cubre el camino que
 * hace la interfaz y deja abierto el otro. Ya había aparecido uno por
 * casualidad —`correspondencia_notificar` escuchaba solo `UPDATE` mientras la
 * app insertaba la fila ya en portería— y la pregunta era si había más.
 *
 * Había tres. La primera es un agujero de permisos.
 */

const PREFIJO = "[prueba disparadores]";

beforeAll(async () => {
  const marcela = await entrar(CUENTA.admin);
  await api(marcela, `/rest/v1/reserva_zona?fecha=eq.2026-12-30`, {
    metodo: "DELETE",
  });
});

/** Crea una visita de la 101 y devuelve su id. */
async function visitaDePrueba(porteria: Sesion) {
  const visita = await insertar(porteria, "visita?select=id", {
    condominio_id: CONDOMINIO,
    unidad_id: UNIDAD.u101,
    tipo: "amigos",
    fecha_desde: new Date().toISOString().slice(0, 10),
    estado: "programada",
    registrada_por: porteria.usuarioId,
  });
  expect(visita.estado).toBe(201);
  return visita.datos[0].id as string;
}

describe("aprobar una reserva", () => {
  it("no se puede insertar ya aprobada para saltarse la comprobación", async () => {
    const guillermo = await entrar(CUENTA.propietario);

    const conTramite = await leer(
      guillermo,
      "zona_comun?select=id&requiere_aprobacion=is.true&limit=1",
    );

    /**
     * La comprobación existía desde 20260922204000, pero escuchaba solo
     * `UPDATE`: cerraba la puerta y dejaba la ventana abierta. Un residente
     * insertaba la fila ya `aprobada`, con `resuelta_por` a su nombre, y
     * entraba.
     */
    const insertada = await insertar(guillermo, "reserva_zona", {
      zona_id: conTramite.datos[0].id,
      unidad_id: UNIDAD.u101,
      solicitada_por: guillermo.usuarioId,
      fecha: "2026-12-30",
      hora_inicio: "10:00",
      hora_fin: "11:00",
      estado: "aprobada",
      resuelta_por: guillermo.usuarioId,
      resuelta_en: new Date().toISOString(),
    });
    expect(fueRechazada(insertada)).toBe(true);
  });

  it("pero la aprobación automática de una zona sin trámite sigue entrando", async () => {
    const guillermo = await entrar(CUENTA.propietario);
    const marcela = await entrar(CUENTA.admin);

    /**
     * Control positivo, y no es decorativo: los dos disparadores `before` de
     * esta tabla corren en orden alfabético, así que `proteger` ve lo que
     * mandó quien llama —`pendiente`— y `sin_tramite` aprueba después. Si el
     * orden se invirtiera, la comprobación bloquearía su propia aprobación
     * automática y nadie podría reservar la lavandería.
     */
    const sinTramite = await leer(
      guillermo,
      "zona_comun?select=id&requiere_aprobacion=is.false&limit=1",
    );

    const reserva = await insertar(guillermo, "reserva_zona?select=id,estado", {
      zona_id: sinTramite.datos[0].id,
      unidad_id: UNIDAD.u101,
      solicitada_por: guillermo.usuarioId,
      fecha: "2026-12-30",
      hora_inicio: "12:00",
      hora_fin: "13:00",
    });
    expect(reserva.datos[0].estado).toBe("aprobada");

    await api(marcela, `/rest/v1/reserva_zona?id=eq.${reserva.datos[0].id}`, {
      metodo: "DELETE",
    });
  });
});

describe("avisar cuando la fila nace resuelta", () => {
  it("una visita registrada ya dentro avisa a la vivienda", async () => {
    const roberto = await entrar(CUENTA.guardia);
    const guillermo = await entrar(CUENTA.propietario);

    /**
     * `invitado_notificar_ingreso` escuchaba solo `UPDATE`, que cubre el caso
     * normal: la portería marca la llegada de alguien anunciado. Pero cuando
     * llega alguien sin anunciar, la fila **nace** con `ingreso_en` puesto, y
     * es justo el caso en que más querés enterarte.
     */
    const visitaId = await visitaDePrueba(roberto);

    const alta = await insertar(roberto, "invitado?select=id", {
      visita_id: visitaId,
      nombre: `${PREFIJO} Llega sin avisar`,
      ingreso_en: new Date().toISOString(),
    });
    expect(alta.estado).toBe(201);

    const avisos = await leer(
      guillermo,
      `notificacion?select=tipo&entidad_id=eq.${visitaId}`,
    );
    expect(avisos.datos.map((n: any) => n.tipo)).toContain("visita_ingreso");

    await api(roberto, `/rest/v1/visita?id=eq.${visitaId}`, { metodo: "DELETE" });
  });

  it("la llegada anunciada sigue avisando, que es el camino normal", async () => {
    const roberto = await entrar(CUENTA.guardia);
    const guillermo = await entrar(CUENTA.propietario);

    // Control positivo: sin esto, "avisa al insertar" pasaría igual con el
    // disparador escuchando solo INSERT, que sería el defecto simétrico.
    const visitaId = await visitaDePrueba(roberto);

    const alta = await insertar(roberto, "invitado?select=id", {
      visita_id: visitaId,
      nombre: `${PREFIJO} Anunciado`,
    });

    const antes = await leer(
      guillermo,
      `notificacion?select=id&entidad_id=eq.${visitaId}`,
    );
    expect(antes.datos).toHaveLength(0);

    await api(roberto, `/rest/v1/invitado?id=eq.${alta.datos[0].id}`, {
      metodo: "PATCH",
      cuerpo: { ingreso_en: new Date().toISOString() },
    });

    const despues = await leer(
      guillermo,
      `notificacion?select=tipo&entidad_id=eq.${visitaId}`,
    );
    expect(despues.datos.map((n: any) => n.tipo)).toContain("visita_ingreso");

    await api(roberto, `/rest/v1/visita?id=eq.${visitaId}`, { metodo: "DELETE" });
  });

  it("una reserva aprobada al nacer avisa al resto de la vivienda", async () => {
    const guillermo = await entrar(CUENTA.propietario);
    const marcela = await entrar(CUENTA.admin);
    const laura = await entrar(CUENTA.laura);

    /**
     * Desde que una zona sin trámite aprueba al crear, ese aviso no llegaba
     * nunca: `reserva_zona_notificar` escuchaba solo `UPDATE`. A quien la pidió
     * no se le avisa —acaba de hacerla y la está viendo—; al resto de la
     * vivienda, sí.
     */
    const sinTramite = await leer(
      guillermo,
      "zona_comun?select=id&requiere_aprobacion=is.false&limit=1",
    );

    const reserva = await insertar(guillermo, "reserva_zona?select=id", {
      zona_id: sinTramite.datos[0].id,
      unidad_id: UNIDAD.u205,
      solicitada_por: guillermo.usuarioId,
      fecha: "2026-12-30",
      hora_inicio: "14:00",
      hora_fin: "15:00",
    });
    const reservaId = reserva.datos[0].id;

    // Laura vive en la 205 y no la pidió: se entera.
    const deLaura = await leer(
      laura,
      `notificacion?select=tipo&entidad_id=eq.${reservaId}`,
    );
    expect(deLaura.datos.map((n: any) => n.tipo)).toContain("reserva_aprobada");

    // Guillermo la pidió: no se le avisa de lo que acaba de hacer.
    const deGuillermo = await leer(
      guillermo,
      `notificacion?select=id&entidad_id=eq.${reservaId}`,
    );
    expect(deGuillermo.datos).toHaveLength(0);

    await api(marcela, `/rest/v1/reserva_zona?id=eq.${reservaId}`, {
      metodo: "DELETE",
    });
  });
});
