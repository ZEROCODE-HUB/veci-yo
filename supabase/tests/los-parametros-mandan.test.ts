import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CLAVE_SERVICIO, CONDOMINIO, CUENTA, MARCA_PRUEBA, UNIDAD, URL, entrar, insertar, rpc, type Respuesta, type Sesion } from "./apoyo";

/**
 * Los parámetros mandan (18/10/2026).
 *
 * Que un valor viva en configuracion_plataforma no sirve de nada si el código
 * sigue usando su propio número. Cada caso de aquí **cambia el parámetro**,
 * hace lo que la app haría y comprueba que el resultado siguió al parámetro y
 * no al valor viejo. Al terminar, cada parámetro vuelve a su valor.
 *
 * Se elige siempre un valor distinto del de fábrica: con el mismo, el caso
 * pasaría igual con el número escrito a mano.
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

const originales = new Map<string, string>();

/** Cambia un parámetro y recuerda su valor para devolverlo al final. */
async function poner(clave: string, valor: string) {
  if (!originales.has(clave)) {
    const r = await conServicio(`/rest/v1/configuracion_plataforma?clave=eq.${clave}&select=valor`);
    expect(r.datos, `el parámetro ${clave} existe`).toHaveLength(1);
    originales.set(clave, r.datos[0].valor);
  }
  const r = await conServicio(`/rest/v1/configuracion_plataforma?clave=eq.${clave}`, "PATCH", { valor });
  expect(r.estado, r.mensaje).toBe(200);
}

const DIA = 24 * 60 * 60 * 1000;
const CORREO_INVITADO = "prueba.parametros@veciyo.test";

let marcela: Sesion;
const servicio = { token: CLAVE_SERVICIO, usuarioId: "", correo: "servicio" } as Sesion;
const NADIE = "00000000-0000-0000-0000-0000000000ff";
let diaDeCuotaOriginal: number | null = null;

beforeAll(async () => {
  marcela = await entrar(CUENTA.admin);
  const c = await conServicio(`/rest/v1/condominio?id=eq.${CONDOMINIO}&select=cuota_dia_vencimiento`);
  diaDeCuotaOriginal = c.datos[0].cuota_dia_vencimiento;
  await conServicio(`/rest/v1/invitacion?correo=eq.${encodeURIComponent(CORREO_INVITADO)}`, "DELETE");
});

afterAll(async () => {
  await conServicio(`/rest/v1/condominio?id=eq.${CONDOMINIO}`, "PATCH", { cuota_dia_vencimiento: diaDeCuotaOriginal });
  await conServicio(`/rest/v1/reclamo?titulo=like.*parametros*`, "DELETE");
  for (const [clave, valor] of originales) {
    await conServicio(`/rest/v1/configuracion_plataforma?clave=eq.${clave}`, "PATCH", { valor });
  }
  await conServicio(`/rest/v1/invitacion?correo=eq.${encodeURIComponent(CORREO_INVITADO)}`, "DELETE");
  // Comprobar que todo volvió: una limpieza que no comprueba no es una limpieza.
  for (const [clave, valor] of originales) {
    const r = await conServicio(`/rest/v1/configuracion_plataforma?clave=eq.${clave}&select=valor`);
    expect(r.datos[0].valor, `${clave} volvió a su valor`).toBe(valor);
  }
});

describe("invitaciones", () => {
  it("una invitación vence a los días que diga el parámetro", async () => {
    await poner("invitacion_dias_validez", "9");
    const creada = await rpc(marcela, "crear_invitacion", {
      p_condominio_id: CONDOMINIO,
      p_ambito: "unidad",
      p_correo: CORREO_INVITADO,
      p_nombre: `${MARCA_PRUEBA} Parámetros`,
      p_unidad_id: UNIDAD.u301,
      p_rol_unidad: "residente",
    });
    expect(creada.estado, creada.mensaje).toBe(200);
    const fila = await conServicio(`/rest/v1/invitacion?correo=eq.${encodeURIComponent(CORREO_INVITADO)}&select=expira_en`);
    const dias = (new Date(fila.datos[0].expira_en).getTime() - Date.now()) / DIA;
    expect(dias).toBeGreaterThan(8.9);
    expect(dias).toBeLessThan(9.1);
  });
});

describe("cuotas", () => {
  it("el mes por adelantado que se puede crear lo dice el parámetro", async () => {
    await poner("cuotas_meses_adelanto", "0");
    const hoy = new Date();
    const siguiente = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() + 2, 1)).toISOString().slice(0, 10);
    const r = await rpc(marcela, "crear_cuota_del_mes", { p_condominio_id: CONDOMINIO, p_periodo: siguiente });
    expect(r.estado).toBeGreaterThanOrEqual(400);
    expect(r.mensaje).toMatch(/hasta 0 más adelante/);
  });

  it("el último día de vencimiento lo dice el parámetro", async () => {
    await poner("cuota_dia_vencimiento_maximo", "28");
    const rechazado = await conServicio(`/rest/v1/condominio?id=eq.${CONDOMINIO}`, "PATCH", { cuota_dia_vencimiento: 29 });
    expect(rechazado.estado).toBeGreaterThanOrEqual(400);
    expect(rechazado.mensaje).toMatch(/del 1 al 28/);
    await poner("cuota_dia_vencimiento_maximo", "30");
    const aceptado = await conServicio(`/rest/v1/condominio?id=eq.${CONDOMINIO}`, "PATCH", { cuota_dia_vencimiento: 29 });
    expect(aceptado.estado, aceptado.mensaje).toBe(200);
  });
});

describe("preregistro", () => {
  it("lo más lejos que se programa un recordatorio lo dice el parámetro", async () => {
    await poner("preregistro_recordatorio_dias_maximo", "60");
    expect((await rpc(servicio, "dias_de_recordatorio_sensatos", { p_dias: [61] })).datos).toBe(false);
    await poner("preregistro_recordatorio_dias_maximo", "90");
    expect((await rpc(servicio, "dias_de_recordatorio_sensatos", { p_dias: [61] })).datos).toBe(true);
  });

  it("una estancia sin noches se trata como diga el parámetro", async () => {
    await poner("estancia_sin_noches_es_corta", "false");
    expect((await rpc(servicio, "es_estancia_corta", { p_unidad_id: UNIDAD.u102, p_noches: null })).datos).toBe(false);
  });
});

describe("avisos", () => {
  it("por dónde avisa a quien nunca tocó sus preferencias lo dice el parámetro", async () => {
    await poner("avisos_correo_por_defecto", "true");
    const r = await rpc(servicio, "quiere_aviso", { p_usuario_id: NADIE, p_motivo: "visita_ingreso", p_canal: "correo" });
    expect(r.estado, r.mensaje).toBe(200);
    expect(r.datos).toBe(true);
  });

  it("los dígitos del número de una PQRS los dice el parámetro", async () => {
    await poner("numero_digitos_pqrs", "7");
    const guillermo = await entrar(CUENTA.propietario);
    const r = await insertar(guillermo, "reclamo?select=numero", {
      condominio_id: CONDOMINIO,
      unidad_id: UNIDAD.u101,
      creado_por: guillermo.usuarioId,
      creado_por_nombre: "Guillermo Provenzano",
      titulo: `${MARCA_PRUEBA} parametros`,
      descripcion: "Comprueba los dígitos del número.",
      area: "condominio",
      tipo: "consulta",
    });
    expect(r.estado, r.mensaje).toBe(201);
    expect(r.datos[0].numero).toHaveLength(7);
  });
});
