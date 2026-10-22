import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CLAVE_SERVICIO, CONDOMINIO, CUENTA, URL, actualizar, entrar, leer, rpc, type Respuesta, type Sesion } from "./apoyo";

/**
 * Los avisos llegan al celular (22/10/2026).
 *
 * Cada fila nueva de `notificacion` deja su envío en `envio_push`, y lo que
 * importa comprobar es **la decisión**, no OneSignal: si la persona lo apagó
 * para ese motivo o la plataforma lo tiene apagado, queda «apagado» y no se
 * llama a la función; si no, sale. Y que cada quien vea y confirme solo los
 * suyos.
 *
 * Lo que pase después en OneSignal (sin clave, sin celular registrado,
 * enviado) lo escribe la función y no se comprueba aquí: depende de una
 * credencial y de un celular de verdad. Eso lo prueba el tester (Tests del
 * GSheet).
 */

async function conServicio<T = any>(ruta: string, metodo = "GET", cuerpo?: unknown): Promise<Respuesta<T>> {
  const r = await fetch(`${URL}${ruta}`, {
    method: metodo,
    headers: {
      apikey: CLAVE_SERVICIO,
      Authorization: `Bearer ${CLAVE_SERVICIO}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  const texto = await r.text();
  let datos: any = null;
  try {
    datos = texto ? JSON.parse(texto) : null;
  } catch {
    datos = texto;
  }
  return { estado: r.status, datos, mensaje: datos?.message };
}

const MOTIVO = "reconocimiento_recibido";
const TITULO = "[prueba] push";

let sofia: Sesion;
let guillermo: Sesion;
const originalesParametro = new Map<string, string>();
let preferenciaOriginal: any[] = [];
let preferenciaSosOriginal: any[] = [];

async function poner(clave: string, valor: string) {
  if (!originalesParametro.has(clave)) {
    const r = await conServicio(`/rest/v1/configuracion_plataforma?clave=eq.${clave}&select=valor`);
    expect(r.datos, `el parámetro ${clave} existe`).toHaveLength(1);
    originalesParametro.set(clave, r.datos[0].valor);
  }
  const r = await conServicio(`/rest/v1/configuracion_plataforma?clave=eq.${clave}`, "PATCH", { valor });
  expect(r.estado, r.mensaje).toBe(200);
}

/** Un aviso de la campana para Sofía, como lo crearía cualquier disparador. */
async function avisarASofia(tipo = MOTIVO): Promise<string> {
  const r = await conServicio("/rest/v1/notificacion", "POST", {
    usuario_id: sofia.usuarioId,
    condominio_id: CONDOMINIO,
    tipo,
    titulo: TITULO,
    mensaje: "Prueba automática del push",
  });
  expect(r.estado, r.mensaje).toBe(201);
  return r.datos[0].id;
}

async function envioDe(notificacionId: string) {
  const r = await conServicio(`/rest/v1/envio_push?notificacion_id=eq.${notificacionId}&select=*`);
  expect(r.estado, r.mensaje).toBe(200);
  return r.datos[0];
}

async function limpiar() {
  await conServicio(`/rest/v1/notificacion?usuario_id=eq.${sofia.usuarioId}&tipo=eq.aviso_de_prueba`, "DELETE");
  await conServicio(`/rest/v1/notificacion?titulo=eq.${encodeURIComponent(TITULO)}`, "DELETE");
}

beforeAll(async () => {
  sofia = await entrar(CUENTA.vecino);
  guillermo = await entrar(CUENTA.propietario);
  await limpiar();
  preferenciaOriginal = (
    await conServicio(`/rest/v1/preferencia_aviso?usuario_id=eq.${sofia.usuarioId}&motivo=eq.${MOTIVO}&select=*`)
  ).datos;
  preferenciaSosOriginal = (
    await conServicio(`/rest/v1/preferencia_aviso?usuario_id=eq.${sofia.usuarioId}&motivo=eq.sos_activado&select=*`)
  ).datos;
  await poner("push_activo", "true");
  await poner("aviso_prueba_espera_segundos", "0");
  await poner("avisos_por_motivo", "false");
});

afterAll(async () => {
  await limpiar();
  // La fila cruda, con escritura directa: no por guardar_aviso, que es lo que se prueba.
  for (const [motivo, original] of [
    [MOTIVO, preferenciaOriginal],
    ["sos_activado", preferenciaSosOriginal],
  ] as const) {
    await conServicio(`/rest/v1/preferencia_aviso?usuario_id=eq.${sofia.usuarioId}&motivo=eq.${motivo}`, "DELETE");
    if (original.length) {
      const { id: _id, created_at: _c, updated_at: _u, ...fila } = original[0];
      const r = await conServicio("/rest/v1/preferencia_aviso", "POST", fila);
      expect(r.estado, r.mensaje).toBe(201);
    }
  }
  for (const [clave, valor] of originalesParametro) {
    await conServicio(`/rest/v1/configuracion_plataforma?clave=eq.${clave}`, "PATCH", { valor });
  }
});

describe("el aviso de prueba", () => {
  it("cada quien se manda uno, y queda su envío al celular", async () => {
    const r = await rpc<string>(sofia, "enviar_aviso_de_prueba");
    expect(r.estado, r.mensaje).toBe(200);
    const envio = await envioDe(r.datos);
    expect(envio.usuario_id).toBe(sofia.usuarioId);
    // Sale siempre: el de prueba no mira la preferencia.
    expect(envio.estado).not.toBe("apagado");
  });

  it("no se puede mandar otro enseguida (aviso_prueba_espera_segundos)", async () => {
    await poner("aviso_prueba_espera_segundos", "600");
    const r = await rpc(sofia, "enviar_aviso_de_prueba");
    expect(r.estado).toBeGreaterThanOrEqual(400);
    expect(r.mensaje).toMatch(/Espera unos segundos/);
    await poner("aviso_prueba_espera_segundos", "0");
  });

  it("no sale en la lista de preferencias: no es algo que se apague", async () => {
    const r = await rpc<any[]>(sofia, "avisos_de_cada_uno");
    expect(r.estado, r.mensaje).toBe(200);
    expect(r.datos.map((a) => a.motivo)).not.toContain("aviso_de_prueba");
    // Y sí trae el canal nuevo.
    expect(r.datos.find((a) => a.motivo === MOTIVO)).toHaveProperty("por_push");
  });
});

describe("cada quien ve y confirma solo los suyos", () => {
  let id: string;

  beforeAll(async () => {
    id = await avisarASofia();
  });

  it("Sofía ve su envío; Guillermo, pidiéndolo por su id, no", async () => {
    const suyo = await leer<any[]>(sofia, `envio_push?notificacion_id=eq.${id}&select=id`);
    expect(suyo.datos).toHaveLength(1);
    const ajeno = await leer<any[]>(guillermo, `envio_push?notificacion_id=eq.${id}&select=id`);
    expect(ajeno.estado).toBe(200);
    expect(ajeno.datos).toHaveLength(0);
  });

  it("Guillermo no puede marcar como recibido el aviso de Sofía", async () => {
    const r = await rpc<boolean>(guillermo, "confirmar_aviso_recibido", { p_notificacion_id: id });
    expect(r.estado, r.mensaje).toBe(200);
    expect(r.datos).toBe(false);
    expect((await envioDe(id)).recibido_en).toBeNull();
  });

  it("Sofía sí, y la segunda vez no cambia la hora de llegada", async () => {
    const r = await rpc<boolean>(sofia, "confirmar_aviso_recibido", { p_notificacion_id: id });
    expect(r.datos).toBe(true);
    const primera = (await envioDe(id)).recibido_en;
    expect(primera).not.toBeNull();
    await rpc(sofia, "confirmar_aviso_recibido", { p_notificacion_id: id });
    expect((await envioDe(id)).recibido_en).toBe(primera);
  });

  it("nadie escribe en envio_push por la API", async () => {
    // Sin política de escritura, un PATCH responde 200 con cero filas: lo que
    // cuenta es que la fila no cambie.
    await actualizar(sofia, `envio_push?notificacion_id=eq.${id}`, { estado: "enviado", onesignal_id: "falso" });
    expect((await envioDe(id)).onesignal_id).not.toBe("falso");
  });
});

describe("la preferencia aviso por aviso, cuando la plataforma la enciende", () => {
  beforeAll(() => poner("avisos_por_motivo", "true"));
  afterAll(() => poner("avisos_por_motivo", "false"));

  it("encendida, el aviso sale", async () => {
    const g = await rpc(sofia, "guardar_aviso", {
      p_motivo: MOTIVO, p_por_app: true, p_por_correo: false, p_por_whatsapp: false, p_por_push: true,
    });
    expect(g.estado, g.mensaje).toBe(200);
    expect((await envioDe(await avisarASofia())).estado).not.toBe("apagado");
  });

  it("apagada, queda «apagado» y no se manda", async () => {
    const g = await rpc(sofia, "guardar_aviso", {
      p_motivo: MOTIVO, p_por_app: true, p_por_correo: false, p_por_whatsapp: false, p_por_push: false,
    });
    expect(g.estado, g.mensaje).toBe(200);
    const envio = await envioDe(await avisarASofia());
    expect(envio.estado).toBe("apagado");
    expect(envio.detalle).toMatch(/apagó/);
  });

  it("guardar sin decir nada del celular no lo vuelve a encender", async () => {
    const g = await rpc(sofia, "guardar_aviso", {
      p_motivo: MOTIVO, p_por_app: true, p_por_correo: false, p_por_whatsapp: false,
    });
    expect(g.estado, g.mensaje).toBe(200);
    const lista = await rpc<any[]>(sofia, "avisos_de_cada_uno");
    expect(lista.datos.find((a) => a.motivo === MOTIVO).por_push).toBe(false);
  });

  it("la alarma de S.O.S. no se puede apagar, y sale", async () => {
    const r = await conServicio("/rest/v1/preferencia_aviso", "POST", {
      usuario_id: sofia.usuarioId, motivo: "sos_activado", por_app: true, por_correo: false, por_whatsapp: false, por_push: false,
    });
    expect(r.mensaje).toMatch(/preferencia_aviso_no_el_sos/);
    expect((await envioDe(await avisarASofia("sos_activado"))).estado).not.toBe("apagado");
  });
});

describe("el interruptor general de cada persona (perfil.avisos_push), 22/10/2026", () => {
  afterAll(async () => {
    await conServicio(`/rest/v1/perfil?id=eq.${sofia.usuarioId}`, "PATCH", { avisos_push: true });
  });

  it("apagado por ella, ningún aviso le sale al celular", async () => {
    const r = await actualizar(sofia, `perfil?id=eq.${sofia.usuarioId}`, { avisos_push: false });
    expect(r.estado, r.mensaje).toBeLessThan(300);
    const envio = await envioDe(await avisarASofia());
    expect(envio.estado).toBe("apagado");
    expect(envio.detalle).toMatch(/apagó las notificaciones push/);
  });

  it("encendido otra vez, sale", async () => {
    await actualizar(sofia, `perfil?id=eq.${sofia.usuarioId}`, { avisos_push: true });
    expect((await envioDe(await avisarASofia())).estado).not.toBe("apagado");
  });

  it("con la lista aviso por aviso oculta, una preferencia vieja apagada no apaga nada", async () => {
    await poner("avisos_por_motivo", "false");
    await rpc(sofia, "guardar_aviso", {
      p_motivo: MOTIVO, p_por_app: true, p_por_correo: false, p_por_whatsapp: false, p_por_push: false,
    });
    expect((await envioDe(await avisarASofia())).estado).not.toBe("apagado");
  });
});

describe("el interruptor de la plataforma (push_activo)", () => {
  it("apagado, ningún aviso sale al celular, aunque la persona lo quiera", async () => {
    await rpc(sofia, "guardar_aviso", {
      p_motivo: MOTIVO, p_por_app: true, p_por_correo: false, p_por_whatsapp: false, p_por_push: true,
    });
    await poner("push_activo", "false");
    const envio = await envioDe(await avisarASofia());
    expect(envio.estado).toBe("apagado");
    expect(envio.detalle).toMatch(/push_activo/);
    await poner("push_activo", "true");
    // Control: encendido otra vez, sale.
    expect((await envioDe(await avisarASofia())).estado).not.toBe("apagado");
  });
});

describe("el aviso de que la app se actualizó (avisar_app_actualizada)", () => {
  const NUMERO = 9999;
  const borrar = () =>
    conServicio(`/rest/v1/notificacion?tipo=eq.app_actualizada&titulo=like.*${NUMERO}*`, "DELETE");

  beforeAll(borrar);
  afterAll(borrar);

  it("una persona con sesión no puede mandarlo", async () => {
    const r = await rpc(sofia, "avisar_app_actualizada", { p_numero: NUMERO, p_novedad: "nada" });
    expect(r.estado).toBeGreaterThanOrEqual(400);
    expect(r.mensaje).toMatch(/permission denied/i);
  });

  it("la clave de servicio avisa una vez a cada persona, con el número", async () => {
    const r = await conServicio("/rest/v1/rpc/avisar_app_actualizada", "POST", { p_numero: NUMERO, p_novedad: "Algo nuevo." });
    expect(r.estado, r.mensaje).toBe(200);
    expect(r.datos).toBeGreaterThanOrEqual(2);
    // Marcela administra el edificio y es dueña de la 301: dos membresías, un aviso.
    const marcela = await entrar(CUENTA.admin);
    const deMarcela = await conServicio(
      `/rest/v1/notificacion?usuario_id=eq.${marcela.usuarioId}&tipo=eq.app_actualizada&titulo=like.*${NUMERO}*&select=titulo,mensaje`,
    );
    expect(deMarcela.datos).toHaveLength(1);
    expect(deMarcela.datos[0].titulo).toBe(`Veciyo se actualizó (actualización ${NUMERO})`);
    expect(deMarcela.datos[0].mensaje).toMatch(/^Algo nuevo\./);
  });

  it("con avisar_actualizaciones apagado no avisa a nadie", async () => {
    await borrar();
    await poner("avisar_actualizaciones", "false");
    const r = await conServicio("/rest/v1/rpc/avisar_app_actualizada", "POST", { p_numero: NUMERO });
    expect(r.datos).toBe(0);
    await poner("avisar_actualizaciones", "true");
  });
});
