import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  api,
  CONDOMINIO,
  CUENTA,
  entrar,
  fueRechazada,
  hoyEnElCondominio,
  insertar,
  leer,
  rpc,
  UNIDAD,
  type Sesion,
} from "./apoyo";

/**
 * El botón de S.O.S.
 *
 * Hasta ahora la pantalla anunciaba "TODOS LOS GUARDIAS SERÁN NOTIFICADOS" y
 * los dos botones hacían `navigation.goBack()`. No se notificaba a nadie y no
 * quedaba rastro de que alguien hubiera pedido auxilio.
 *
 * Lo que se comprueba aquí es justo eso: que al activarla **alguien recibe la
 * notificación**, y que la alarma no se puede borrar ni atribuir a otro.
 *
 * Las pruebas de turno no miran la hora real: el guardia de prueba trabaja
 * miércoles y viernes, así que una prueba que dependiera del reloj pasaría o
 * fallaría según el día. En su lugar crean un `turno_override` que cubre este
 * momento, y lo borran al terminar.
 */

let propietario: Sesion;
let guardia: Sesion;
let admin: Sesion;
let vecino: Sesion;

/** Las alarmas creadas aquí; se limpian al final con el propio guardia. */
const creadas: string[] = [];

/** La membresía del guardia, para colgarle el override del día. */
let membresiaGuardia: string;
let overrideId: string | null = null;

async function activar(
  sesion: Sesion,
  extra: Record<string, unknown> = {},
): Promise<{ estado: number; datos: any }> {
  const respuesta = await insertar(sesion, "alarma_sos", {
    condominio_id: CONDOMINIO,
    usuario_id: sesion.usuarioId,
    ...extra,
  });
  if (respuesta.estado === 201 && respuesta.datos?.[0]?.id) {
    creadas.push(respuesta.datos[0].id);
  }
  return respuesta;
}

beforeAll(async () => {
  [propietario, guardia, admin, vecino] = await Promise.all([
    entrar(CUENTA.propietario),
    entrar(CUENTA.guardia),
    entrar(CUENTA.admin),
    entrar(CUENTA.vecino),
  ]);

  const membresias = await leer(
    admin,
    `membresia_condominio?rol=eq.guardia&condominio_id=eq.${CONDOMINIO}&select=id`,
  );
  membresiaGuardia = membresias.datos?.[0]?.id;
});

afterAll(async () => {
  // Una alarma no se borra desde la app —es la política— así que la limpieza
  // se hace cerrándolas. Quedan en el historial, que es lo que corresponde.
  for (const id of creadas) {
    await api(guardia, `/rest/v1/alarma_sos?id=eq.${id}`, {
      metodo: "PATCH",
      cuerpo: {
        cerrada_en: new Date().toISOString(),
        cerrada_por: guardia.usuarioId,
        cierre: "sin_respuesta",
      },
    });
  }
  if (overrideId) {
    await api(admin, `/rest/v1/turno_override?id=eq.${overrideId}`, {
      metodo: "DELETE",
    });
  }
});

describe("quién puede activarla", () => {
  it("un residente del condominio la activa desde su vivienda", async () => {
    const respuesta = await activar(propietario, { unidad_id: UNIDAD.u101 });
    expect(respuesta.estado).toBe(201);
  });

  /*
    Esta prueba estaba escrita con `insertar`, que pide `return=representation`.
    Asi pasaba aunque la politica de alta estuviera abierta de par en par: el
    403 no lo daba el alta sino la **lectura** de vuelta, que no deja a nadie
    ver una alarma ajena. Al relajar la politica de insert a proposito seguia
    verde. Pide `return=minimal` y comprueba con la porteria —que si ve todo—
    que la fila no llego a existir.
  */
  it("nadie la activa en nombre de otro", async () => {
    const antes = await leer(
      guardia,
      `alarma_sos?usuario_id=eq.${vecino.usuarioId}&select=id`,
    );

    const respuesta = await api(propietario, "/rest/v1/alarma_sos", {
      metodo: "POST",
      prefer: "return=minimal",
      cuerpo: {
        condominio_id: CONDOMINIO,
        usuario_id: vecino.usuarioId,
      },
    });
    expect(fueRechazada(respuesta)).toBe(true);

    const despues = await leer(
      guardia,
      `alarma_sos?usuario_id=eq.${vecino.usuarioId}&select=id`,
    );
    expect(despues.datos.length).toBe(antes.datos.length);
  });

  it("nadie la activa desde una vivienda que no es suya", async () => {
    // Control positivo: la 101 sí es suya y acaba de funcionar arriba.
    const respuesta = await insertar(propietario, "alarma_sos", {
      condominio_id: CONDOMINIO,
      usuario_id: propietario.usuarioId,
      unidad_id: UNIDAD.u102,
    });
    expect(fueRechazada(respuesta)).toBe(true);
  });
});

describe("a quién avisa", () => {
  it("con un guardia de turno, el aviso le llega a él", async () => {
    // La fecha, en la zona del condominio: en UTC sería la de mañana durante
    // las últimas cinco horas del día en Bogotá, y el turno se guardaría para
    // un día que `guardias_de_turno()` no está mirando.
    const hoy = await hoyEnElCondominio(admin);

    /*
      Se retira antes el de la corrida anterior. `turno_override` tiene
      `UNIQUE (membresia_id, fecha)`, asi que un override que sobrevivio a una
      corrida interrumpida hace chocar a la siguiente con un 409, y el fallo
      parece del codigo cuando es basura de ayer. Paso: este caso llevaba dias
      en rojo por eso.
    */
    await api(
      admin,
      `/rest/v1/turno_override?membresia_id=eq.${membresiaGuardia}&fecha=eq.${hoy}`,
      { metodo: "DELETE" },
    );

    const override = await insertar(admin, "turno_override", {
      membresia_id: membresiaGuardia,
      fecha: hoy,
      hora_inicio: "00:00:00",
      hora_fin: "23:59:59",
      motivo: "[prueba] turno que cubre la corrida",
    });
    expect(override.estado).toBe(201);
    overrideId = override.datos[0].id;

    const deTurno = await rpc(admin, "guardias_de_turno", {
      p_condominio_id: CONDOMINIO,
    });
    expect(deTurno.datos.map((g: any) => g.usuario_id)).toContain(
      guardia.usuarioId,
    );

    const alarma = await activar(propietario, { unidad_id: UNIDAD.u101 });
    expect(alarma.estado).toBe(201);
    const id = alarma.datos[0].id;

    const avisos = await leer(
      guardia,
      `notificacion?tipo=eq.sos_activado&entidad_id=eq.${id}&select=usuario_id,mensaje`,
    );
    expect(avisos.datos.length).toBe(1);
    expect(avisos.datos[0].usuario_id).toBe(guardia.usuarioId);
    // El texto de la pantalla promete nombre y departamento.
    expect(avisos.datos[0].mensaje).toContain("Guillermo");
    expect(avisos.datos[0].mensaje).toContain("101");

    // Y la alarma guarda a cuánta gente llegó: un cero sería el defecto viejo.
    const guardada = await leer(
      guardia,
      `alarma_sos?id=eq.${id}&select=avisados`,
    );
    expect(guardada.datos[0].avisados).toBeGreaterThan(0);
  });

  it("sin guardia de turno, el aviso va a la administración", async () => {
    // El override sin horas significa "hoy no trabaja": es el control que
    // invierte el caso anterior sin depender del reloj.
    await api(admin, `/rest/v1/turno_override?id=eq.${overrideId}`, {
      metodo: "PATCH",
      cuerpo: { hora_inicio: null, hora_fin: null },
    });

    const deTurno = await rpc(admin, "guardias_de_turno", {
      p_condominio_id: CONDOMINIO,
    });
    expect(deTurno.datos.length).toBe(0);

    const alarma = await activar(propietario);
    const id = alarma.datos[0].id;

    const avisos = await leer(
      admin,
      `notificacion?tipo=eq.sos_activado&entidad_id=eq.${id}&select=usuario_id`,
    );
    expect(avisos.datos.length).toBeGreaterThan(0);
    expect(avisos.datos.map((n: any) => n.usuario_id)).toContain(
      admin.usuarioId,
    );
  });
});

describe("quién la ve y quién la cierra", () => {
  it("un vecino no ve la alarma de otro", async () => {
    const alarma = await activar(propietario, { unidad_id: UNIDAD.u101 });
    const id = alarma.datos[0].id;

    const ajena = await leer(vecino, `alarma_sos?id=eq.${id}&select=id`);
    expect(ajena.datos.length).toBe(0);

    // Control positivo: la portería sí la ve, así que el cero de arriba es de
    // la política y no de que la fila no exista.
    const propia = await leer(guardia, `alarma_sos?id=eq.${id}&select=id`);
    expect(propia.datos.length).toBe(1);
  });

  it("no se puede cerrar en nombre de otro", async () => {
    const alarma = await activar(propietario, { unidad_id: UNIDAD.u101 });
    const id = alarma.datos[0].id;

    const respuesta = await api(guardia, `/rest/v1/alarma_sos?id=eq.${id}`, {
      metodo: "PATCH",
      cuerpo: {
        cerrada_en: new Date().toISOString(),
        cerrada_por: propietario.usuarioId,
        cierre: "atendida",
      },
    });
    expect(fueRechazada(respuesta)).toBe(true);
  });

  it("una alarma cerrada no se reabre", async () => {
    const alarma = await activar(propietario, { unidad_id: UNIDAD.u101 });
    const id = alarma.datos[0].id;

    const cierre = await api(guardia, `/rest/v1/alarma_sos?id=eq.${id}`, {
      metodo: "PATCH",
      cuerpo: {
        cerrada_en: new Date().toISOString(),
        cerrada_por: guardia.usuarioId,
        cierre: "atendida",
      },
    });
    expect(cierre.estado).toBe(200);

    const reapertura = await api(guardia, `/rest/v1/alarma_sos?id=eq.${id}`, {
      metodo: "PATCH",
      cuerpo: { cerrada_en: null, cerrada_por: null, cierre: null },
    });
    // La política no ve filas sin cerrar aquí, así que el PATCH no alcanza a
    // ninguna: 200 con cero filas, no un error.
    expect(reapertura.datos).toEqual([]);
  });

  it("nadie la borra, ni quien la activó", async () => {
    const alarma = await activar(propietario, { unidad_id: UNIDAD.u101 });
    const id = alarma.datos[0].id;

    await api(propietario, `/rest/v1/alarma_sos?id=eq.${id}`, {
      metodo: "DELETE",
    });

    const sigue = await leer(guardia, `alarma_sos?id=eq.${id}&select=id`);
    expect(sigue.datos.length).toBe(1);
  });
});

describe("el turno cruza medianoche", () => {
  it("las 23:00 caen dentro de un turno de 22:00 a 06:00", async () => {
    const dentro = await rpc(admin, "hora_dentro_de", {
      p_hora: "23:00:00",
      p_inicio: "22:00:00",
      p_fin: "06:00:00",
    });
    expect(dentro.datos).toBe(true);
  });

  it("las 12:00 no", async () => {
    const fuera = await rpc(admin, "hora_dentro_de", {
      p_hora: "12:00:00",
      p_inicio: "22:00:00",
      p_fin: "06:00:00",
    });
    expect(fuera.datos).toBe(false);
  });
});
