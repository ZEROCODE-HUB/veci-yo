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
  MARCA_PRUEBA,
  rpc,
  type Sesion,
} from "./apoyo";

/**
 * El precheckin del huésped temporal, flujo 4.2 del KT.
 *
 * Tres piezas tenían su tabla hecha y nadie que la escribiera: aceptar los
 * T&C con la excepción que el anfitrión puede marcar "asumiendo la
 * responsabilidad legal", la verificación de antecedentes, y la compra de un
 * paquete cuando se acaban las que trae la suscripción.
 *
 * El proveedor sigue sin cerrarse (R-68) y eso no puede bloquear el recorrido,
 * así que la verificación se puede ejecutar sin proveedor: la fila queda
 * marcada como `simulado` **en el dato**, no en una bandera de configuración
 * que alguien pueda olvidar.
 */

let sofia: Sesion;     // anfitriona de la 102
let tomas: Sesion;     // huésped alojado en la 102
let guillermo: Sesion; // el dueño de otra vivienda
let marcela: Sesion;

let visitaId = "";
let invitadoId = "";

beforeAll(async () => {
  [sofia, tomas, guillermo, marcela] = await Promise.all([
    entrar(CUENTA.vecino),
    entrar(CUENTA.huesped),
    entrar(CUENTA.propietario),
    entrar(CUENTA.admin),
  ]);

  // Se reutiliza la visita de prueba si ya existe: los reportes y las
  // verificaciones la retienen, igual que pasa con `reporte_legal`.
  const existente = await leer(
    sofia,
    `visita?select=id,invitados:invitado(id)&unidad_id=eq.${UNIDAD.u102}&profesion=eq.${encodeURIComponent(MARCA_PRUEBA)}&limit=1`,
  );

  if (existente.datos.length && existente.datos[0].invitados?.length) {
    visitaId = existente.datos[0].id;
    invitadoId = existente.datos[0].invitados[0].id;
    return;
  }

  const visita = await insertar(sofia, "visita?select=id", {
    condominio_id: CONDOMINIO,
    unidad_id: UNIDAD.u102,
    tipo: "huesped_temporal",
    registrada_por: sofia.usuarioId,
    profesion: MARCA_PRUEBA,
  });
  expect(visita.estado).toBe(201);
  visitaId = visita.datos[0].id;

  const invitado = await insertar(sofia, "invitado?select=id", {
    visita_id: visitaId,
    orden: 1,
    nombre: `${MARCA_PRUEBA} precheckin`,
  });
  expect(invitado.estado).toBe(201);
  invitadoId = invitado.datos[0].id;
});

afterAll(async () => {
  // La verificación se borra para que la siguiente corrida pueda repetirla;
  // la visita y el huésped se quedan y se reutilizan.
  await api(marcela, `/rest/v1/verificacion_antecedentes?invitado_id=eq.${invitadoId}`, {
    metodo: "DELETE",
  });
  await api(marcela, `/rest/v1/paquete_verificaciones?unidad_id=eq.${UNIDAD.u102}`, {
    metodo: "DELETE",
  });
  await api(marcela, `/rest/v1/invitado?id=eq.${invitadoId}`, {
    metodo: "PATCH",
    cuerpo: {
      terminos_aceptados: false,
      terminos_excepcion: false,
      terminos_aprobado_por: null,
    },
  });
});

describe("los términos y condiciones", () => {
  it("los acepta el propio huésped", async () => {
    const hecho = await rpc(tomas, "aceptar_terminos_huesped", {
      p_invitado_id: invitadoId,
    });
    expect(hecho.estado).toBe(204);

    const fila = await leer(
      sofia,
      `invitado?select=terminos_aceptados,terminos_excepcion,terminos_aprobado_por&id=eq.${invitadoId}`,
    );
    expect(fila.datos[0].terminos_aceptados).toBe(true);
    expect(fila.datos[0].terminos_excepcion).toBe(false);
    // Vacío: no hubo nadie que los aprobara en su nombre.
    expect(fila.datos[0].terminos_aprobado_por).toBeNull();
  });

  it("y el anfitrión puede marcar la excepción, asumiéndola", async () => {
    /*
      KT, flujo 4.2 paso 4: si el huésped no puede aceptarlos —analfabetismo,
      discapacidad, sin lista cerrada de causales— el anfitrión marca una
      excepción "asumiendo la responsabilidad legal". Por eso queda escrito
      quién la aprobó: sin eso, la excepción no tendría dueño.
    */
    const hecho = await rpc(sofia, "aceptar_terminos_huesped", {
      p_invitado_id: invitadoId,
      p_excepcion: true,
    });
    expect(hecho.estado).toBe(204);

    const fila = await leer(
      sofia,
      `invitado?select=terminos_excepcion,terminos_aprobado_por&id=eq.${invitadoId}`,
    );
    expect(fila.datos[0].terminos_excepcion).toBe(true);
    // Con dueño: es un uuid, el de quien la asumió.
    expect(fila.datos[0].terminos_aprobado_por).toBe(sofia.usuarioId);
  });

  it("pero un vecino cualquiera no acepta nada en nombre de nadie", async () => {
    const intento = await rpc(guillermo, "aceptar_terminos_huesped", {
      p_invitado_id: invitadoId,
    });
    expect(fueRechazada(intento)).toBe(true);
  });

  it("y el huésped no se concede la excepción a sí mismo", async () => {
    // La excepción es del anfitrión porque es quien responde por ella.
    const intento = await rpc(tomas, "aceptar_terminos_huesped", {
      p_invitado_id: invitadoId,
      p_excepcion: true,
    });
    expect(fueRechazada(intento)).toBe(true);
  });
});

describe("la verificación de antecedentes", () => {
  /*
    Las verificaciones incluidas se descuentan de un **período pagado**: sin él
    no se sabe de qué abono salen, y la restricción de la tabla lo exige. Así
    que primero hay que tener el período, igual que en la vida real: te
    suscribes, se abre el período, y entonces tenés verificaciones.
  */
  beforeAll(async () => {
    const suscripcion = await leer(
      sofia,
      `suscripcion_renta_corta?select=id,verificaciones_base&unidad_id=eq.${UNIDAD.u102}`,
    );
    expect(suscripcion.datos).toHaveLength(1);

    const periodos = await leer(
      sofia,
      `periodo_suscripcion?select=id&suscripcion_id=eq.${suscripcion.datos[0].id}`,
    );
    if (periodos.datos.length === 0) {
      const abierto = await insertar(sofia, "periodo_suscripcion?select=id", {
        suscripcion_id: suscripcion.datos[0].id,
        desde: new Date().toISOString().slice(0, 10),
        hasta: "2030-01-01",
        verificaciones_base: suscripcion.datos[0].verificaciones_base ?? 20,
      });
      expect(abierto.estado).toBe(201);
    }
  });

  it("la pide el anfitrión y descuenta del saldo", async () => {
    const antes = await rpc(sofia, "consumo_verificaciones", {
      p_unidad_id: UNIDAD.u102,
    });
    const usadasAntes = antes.datos[0].suscritas_usadas;

    const hecha = await rpc(sofia, "verificar_antecedentes", {
      p_invitado_id: invitadoId,
    });
    expect(hecha.estado).toBe(200);

    const despues = await rpc(sofia, "consumo_verificaciones", {
      p_unidad_id: UNIDAD.u102,
    });
    expect(despues.datos[0].suscritas_usadas).toBe(usadasAntes + 1);
  });

  it("y queda marcada como simulada mientras no haya proveedor", async () => {
    /*
      Lo que importa: que una verificación hecha sin proveedor **nunca** se
      pueda confundir con una real. No es una bandera de configuración que
      alguien pueda olvidar, es el dato de la fila.
    */
    const fila = await leer(
      sofia,
      `verificacion_antecedentes?select=proveedor,resultado,origen&invitado_id=eq.${invitadoId}`,
    );
    expect(fila.datos).toHaveLength(1);
    expect(fila.datos[0].proveedor).toBe("simulado");
    expect(fila.datos[0].origen).toBe("paquete_base");
  });

  it("no se repite sobre el mismo huésped", async () => {
    const otra = await rpc(sofia, "verificar_antecedentes", {
      p_invitado_id: invitadoId,
    });
    expect(fueRechazada(otra) || otra.estado === 409).toBe(true);
  });

  it("el huésped no la pide, y tampoco la ve", async () => {
    // KT: "sin intervención del Anfitrión ni visibilidad para el huésped", y
    // "el huésped nunca ve las palabras TRA/SIRE/verificación en su UI".
    const intento = await rpc(tomas, "verificar_antecedentes", {
      p_invitado_id: invitadoId,
    });
    expect(fueRechazada(intento)).toBe(true);

    const leida = await leer(
      tomas,
      `verificacion_antecedentes?select=id&invitado_id=eq.${invitadoId}`,
    );
    expect(leida.datos).toHaveLength(0);
  });
});

describe("comprar un paquete cuando se acaban", () => {
  it("el anfitrión lo compra y el saldo sube", async () => {
    const antes = await rpc(sofia, "consumo_verificaciones", {
      p_unidad_id: UNIDAD.u102,
    });
    const suplementariasAntes = antes.datos[0].suplementarias;

    const compra = await rpc(sofia, "comprar_paquete_verificaciones", {
      p_unidad_id: UNIDAD.u102,
      p_cantidad: 5,
    });
    expect(compra.estado).toBe(200);

    const despues = await rpc(sofia, "consumo_verificaciones", {
      p_unidad_id: UNIDAD.u102,
    });
    expect(despues.datos[0].suplementarias).toBe(suplementariasAntes + 5);
  });

  it("y queda registrado lo que costó, con su moneda", async () => {
    const paquete = await leer(
      sofia,
      `paquete_verificaciones?select=cantidad,monto,moneda&unidad_id=eq.${UNIDAD.u102}`,
    );
    expect(paquete.datos.length).toBeGreaterThan(0);
    expect(paquete.datos[0].cantidad).toBe(5);
    expect(Number(paquete.datos[0].monto)).toBeGreaterThan(0);
    expect(String(paquete.datos[0].moneda).trim()).toBeTruthy();
  });

  it("pero no lo compra el dueño de otra vivienda", async () => {
    const intento = await rpc(guillermo, "comprar_paquete_verificaciones", {
      p_unidad_id: UNIDAD.u102,
      p_cantidad: 5,
    });
    expect(fueRechazada(intento)).toBe(true);
  });
});
