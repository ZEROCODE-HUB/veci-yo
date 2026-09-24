import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  api,
  CONDOMINIO,
  CUENTA,
  UNIDAD,
  entrar,
  fueRechazada,
  insertar,
  leer,
  rpc,
  MARCA_PRUEBA,
  type Sesion,
} from "./apoyo";

/**
 * El reporte TRA/SIRE.
 *
 * El timeline de seis pasos que el KT da por decidido —"🔗 preregistro enviado
 * → 📄 documentación completa → 📝 T&C aceptados → 🛡️ verificación pasada →
 * 🟢 TRA/SIRE entrada → 🔴 TRA/SIRE salida"— estaba **muerto**:
 * `mapearInvitado()` no devolvía `timeline`, así que el componente pintaba los
 * seis pasos en pendiente para todo el mundo, siempre. Y los dos últimos no
 * tenían dónde vivir.
 *
 * Lo que se sujeta aquí son las dos reglas del KT que no pueden quedar en la
 * pantalla, porque un reporte es un dato declarado ante una autoridad:
 *
 *   · "Solo cuando Seguridad confirma el ingreso físico se habilita el botón
 *     (nunca antes, nunca automático)".
 *   · "RNT vencido o inexistente bloquea la posibilidad de TRA".
 */

let guillermo: Sesion;
let sofia: Sesion;
let marcela: Sesion;
let porteria: Sesion;

let visitaId = "";
/** Con el ingreso confirmado: sirve para medir las demás condiciones. */
let invitadoId = "";
/** Sin confirmar: es el que mide "nunca antes del ingreso". */
let invitadoSinLlegar = "";
let rntId = "";

beforeAll(async () => {
  [guillermo, sofia, marcela, porteria] = await Promise.all([
    entrar(CUENTA.propietario),
    entrar(CUENTA.vecino),
    entrar(CUENTA.admin),
    entrar(CUENTA.guardia),
  ]);

  const visita = await insertar(guillermo, "visita?select=id", {
    condominio_id: CONDOMINIO,
    unidad_id: UNIDAD.u101,
    registrada_por: guillermo.usuarioId,
    tipo: "huesped_temporal",
    estado: "programada",
  });
  expect(visita.estado).toBe(201);
  visitaId = visita.datos[0].id;

  const invitado = await insertar(guillermo, "invitado?select=id", {
    visita_id: visitaId,
    orden: 1,
    nombre: `${MARCA_PRUEBA} huésped TRA`,
    terminos_aceptados: true,
  });
  expect(invitado.estado).toBe(201);
  invitadoId = invitado.datos[0].id;

  const sinLlegar = await insertar(guillermo, "invitado?select=id", {
    visita_id: visitaId,
    orden: 2,
    nombre: `${MARCA_PRUEBA} no ha llegado`,
    terminos_aceptados: true,
  });
  expect(sinLlegar.estado).toBe(201);
  invitadoSinLlegar = sinLlegar.datos[0].id;

  /*
    El ingreso se confirma aquí para el primero: el disparador comprueba varias
    condiciones y, si no se aísla, todos los casos fallan por la primera que
    encuentre y ninguno mide lo que dice medir.
  */
  const confirmado = await api(porteria, `/rest/v1/invitado?id=eq.${invitadoId}`, {
    metodo: "PATCH",
    cuerpo: { llego: true, ingreso_en: new Date().toISOString() },
  });
  expect(confirmado.estado).toBe(200);
});

afterAll(async () => {
  await api(marcela, `/rest/v1/reporte_tra?invitado_id=eq.${invitadoId}`, {
    metodo: "DELETE",
  });
  if (visitaId) {
    await api(marcela, `/rest/v1/visita?id=eq.${visitaId}`, { metodo: "DELETE" });
  }
  if (rntId) {
    await api(marcela, `/rest/v1/registro_turismo?id=eq.${rntId}`, {
      metodo: "DELETE",
    });
  }
});

describe("sin RNT no hay reporte", () => {
  it("la vivienda sin registro de turismo no puede reportar", async () => {
    /*
      KT, flujo 4.2: "RNT vencido o inexistente → bloquea la posibilidad de
      TRA (sin RNT no se puede referenciar el reporte)".
    */
    const intento = await insertar(guillermo, "reporte_tra", {
      invitado_id: invitadoId,
      movimiento: "entrada",
      rnt: "",
    });
    expect(fueRechazada(intento)).toBe(true);
    expect(String(intento.mensaje)).toContain("RNT");
  });

  it("y con el RNT vencido, tampoco", async () => {
    const vencido = await insertar(guillermo, "registro_turismo?select=id", {
      unidad_id: UNIDAD.u101,
      numero: "RNT-VENCIDO",
      emitido_en: "2020-01-01",
      vence_en: "2021-01-01",
      cargado_por: guillermo.usuarioId,
    });
    expect(vencido.estado).toBe(201);
    rntId = vencido.datos[0].id;

    const intento = await insertar(guillermo, "reporte_tra", {
      invitado_id: invitadoId,
      movimiento: "entrada",
      rnt: "",
    });
    expect(fueRechazada(intento)).toBe(true);
    expect(String(intento.mensaje)).toContain("vencido");

    await api(marcela, `/rest/v1/registro_turismo?id=eq.${rntId}`, {
      metodo: "PATCH",
      cuerpo: { emitido_en: "2026-01-01", vence_en: "2030-01-01" },
    });
  });
});

describe("nunca antes del ingreso", () => {
  it("no se reporta la entrada de quien no ha llegado", async () => {
    /*
      El caso que más importa: un reporte de entrada sin ingreso confirmado es
      un dato falso enviado a una autoridad. El KT dice "nunca antes, nunca
      automático", y por eso tampoco hay disparador que lo cree solo.
    */
    const intento = await insertar(guillermo, "reporte_tra", {
      invitado_id: invitadoSinLlegar,
      movimiento: "entrada",
      rnt: "",
    });
    expect(fueRechazada(intento)).toBe(true);
    expect(String(intento.mensaje)).toContain("ingreso");
  });

  it("y sí cuando la portería lo confirma", async () => {
    const reporte = await insertar(guillermo, "reporte_tra?select=id,rnt", {
      invitado_id: invitadoId,
      movimiento: "entrada",
      rnt: "",
    });
    expect(reporte.estado).toBe(201);
    // El RNT lo pone la base desde el registro del alojamiento: quien reporta
    // no lo teclea, y así no puede referenciar uno que no es.
    expect(reporte.datos[0].rnt).toBe("RNT-VENCIDO");
  });

  it("el mismo movimiento no se reporta dos veces", async () => {
    // Serían dos declaraciones distintas ante la autoridad por el mismo hecho.
    const repetido = await insertar(guillermo, "reporte_tra", {
      invitado_id: invitadoId,
      movimiento: "entrada",
      rnt: "",
    });
    expect(repetido.estado).toBe(409);
  });

  it("y la salida necesita que la salida esté registrada", async () => {
    const intento = await insertar(guillermo, "reporte_tra", {
      invitado_id: invitadoId,
      movimiento: "salida",
      rnt: "",
    });
    expect(fueRechazada(intento)).toBe(true);
    expect(String(intento.mensaje)).toContain("salida");
  });
});

describe("quién lo ve", () => {
  it("el anfitrión, porque responde por el cumplimiento legal", async () => {
    const suyos = await leer(
      guillermo,
      `reporte_tra?select=id,movimiento&invitado_id=eq.${invitadoId}`,
    );
    expect(suyos.datos).toHaveLength(1);
    expect(suyos.datos[0].movimiento).toBe("entrada");
  });

  it("una vecina no", async () => {
    const ajeno = await leer(
      sofia,
      `reporte_tra?select=id&invitado_id=eq.${invitadoId}`,
    );
    expect(ajeno.datos).toHaveLength(0);
  });

  it("y el huésped tampoco, que nunca ve las palabras TRA ni SIRE", async () => {
    /*
      KT: "el huésped nunca ve las palabras TRA/SIRE/verificación en su UI".
      Esconderlo en la pantalla y dejar la fila accesible por la API sería
      cumplirlo solo de cara a la galería.
    */
    const tomas = await entrar(CUENTA.huesped);
    const delHuesped = await leer(
      tomas,
      `reporte_tra?select=id&invitado_id=eq.${invitadoId}`,
    );
    expect(delHuesped.datos).toHaveLength(0);
  });
});

/**
 * De dónde sale el RNT.
 *
 * Defecto introducido con el propio reporte: `puede_reportar_tra()` buscaba el
 * RNT en `registro_turismo` y **nadie escribe ahí**. La pantalla de
 * cumplimiento legal guarda el número en `suscripcion_renta_corta.rnt`, un
 * texto suelto. O sea: el propietario cargaba su RNT y el reporte le decía que
 * la vivienda no tenía. No se vio porque la prueba creaba la fila a mano.
 */
describe("el RNT que el propietario carga", () => {
  it("llega a `registro_turismo` al guardarlo en la suscripción", async () => {
    const sofia = await entrar(CUENTA.vecino);

    const guardado = await rpc(sofia, "guardar_alojamiento", {
      p_unidad_id: UNIDAD.u102,
      p_rnt: "RNT-DESDE-PANTALLA",
    });
    expect(guardado.estado === 200 || guardado.estado === 204).toBe(true);

    const registro = await leer(
      sofia,
      `registro_turismo?select=numero&unidad_id=eq.${UNIDAD.u102}`,
    );
    expect(registro.datos.length).toBeGreaterThan(0);
    expect(registro.datos[0].numero).toBe("RNT-DESDE-PANTALLA");
  });
});
