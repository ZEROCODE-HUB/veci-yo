import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  api,
  CUENTA,
  UNIDAD,
  entrar,
  fueRechazada,
  insertar,
  leer,
  type Sesion,
} from "./apoyo";

/**
 * El contrato de arrendamiento.
 *
 * Había dos pantallas de contrato y ninguna tabla: el formulario de crear rol
 * escribía en un store de Zustand, y el historial mostraba **dos contratos
 * inventados** escritos a mano en el propio archivo —"N° 16548", uno "Activa" y
 * otro "Finalizado"— iguales para cualquier vivienda de cualquier condominio.
 *
 * Lo que estas pruebas sujetan es quién lo ve. Un contrato dice cuánto paga
 * alguien de alquiler, y eso es de las dos partes: la administración del
 * condominio no entra. Es la misma línea que ya se traza con los comprobantes
 * de pago, que llevan datos bancarios.
 */

let guillermo: Sesion;
let laura: Sesion;
let sofia: Sesion;
let marcela: Sesion;
let inquilino: Sesion;
let contratoId = "";
let membresiaLaura = "";
/*
  Un residente **sin gestión** de la vivienda. Laura no sirve para eso: en la
  205 es `inquilino_lider`, y en este producto el inquilino líder gestiona la
  vivienda en nombre del propietario, así que sí puede redactar el contrato.
  El alta la hace la administración y se retira al terminar.
*/
let membresiaInquilino = "";

beforeAll(async () => {
  [guillermo, laura, sofia, marcela] = await Promise.all([
    entrar(CUENTA.propietario),
    entrar(CUENTA.laura),
    entrar(CUENTA.vecino),
    entrar(CUENTA.admin),
  ]);

  const dela205 = await leer(
    guillermo,
    `membresia_unidad?select=id,usuario_id&unidad_id=eq.${UNIDAD.u205}&activo=is.true`,
  );
  membresiaLaura = dela205.datos.find(
    (m: any) => m.usuario_id === laura.usuarioId,
  )?.id;
  expect(membresiaLaura).toBeTruthy();

  inquilino = await entrar(CUENTA.invitadoNuevo);
  await api(
    marcela,
    `/rest/v1/membresia_unidad?usuario_id=eq.${inquilino.usuarioId}`,
    { metodo: "DELETE" },
  );
  const alta = await insertar(marcela, "membresia_unidad?select=id", {
    unidad_id: UNIDAD.u205,
    usuario_id: inquilino.usuarioId,
    nombre: "Inquilino de prueba",
    rol: "residente",
    es_residente: true,
  });
  expect(alta.estado).toBe(201);
  membresiaInquilino = alta.datos[0].id;
});

afterAll(async () => {
  if (membresiaInquilino) {
    await api(marcela, `/rest/v1/membresia_unidad?id=eq.${membresiaInquilino}`, {
      metodo: "DELETE",
    });
  }
  if (contratoId) {
    await api(marcela, `/rest/v1/contrato_arrendamiento?id=eq.${contratoId}`, {
      metodo: "DELETE",
    });
  }
});

describe("registrar un contrato", () => {
  it("lo registra el propietario de la vivienda", async () => {
    const alta = await insertar(
      guillermo,
      "contrato_arrendamiento?select=id,numero,estado,monto,moneda",
      {
        unidad_id: UNIDAD.u205,
        membresia_id: membresiaInquilino,
        fecha_inicio: "2027-02-01",
        fecha_fin: "2028-02-01",
        duracion_meses: 12,
        monto: 2500000,
        moneda: "COP",
        monitorea_pago: true,
        registrado_por: guillermo.usuarioId,
      },
    );
    expect(alta.estado).toBe(201);
    contratoId = alta.datos[0].id;

    // El número lo asigna la base: el cliente no lo sortea.
    expect(alta.datos[0].numero).toMatch(/^\d{5}$/);
    expect(alta.datos[0].estado).toBe("vigente");
  });

  it("la moneda la pone el condominio, no quien escribe", async () => {
    /*
      El condominio de prueba es colombiano. Pedirle la moneda a la pantalla
      solo abre la puerta a un contrato de Bogotá en soles porque el formulario
      mandó lo que tenía a mano.
    */
    const alta = await insertar(
      guillermo,
      "contrato_arrendamiento?select=id,moneda",
      {
        unidad_id: UNIDAD.u205,
        fecha_inicio: "2027-09-01",
        monto: 1200000,
        registrado_por: guillermo.usuarioId,
      },
    );
    expect(alta.estado).toBe(201);
    expect(alta.datos[0].moneda.trim()).toBe("COP");

    await api(marcela, `/rest/v1/contrato_arrendamiento?id=eq.${alta.datos[0].id}`, {
      metodo: "DELETE",
    });
  });

  /*
    No hay caso para "un importe sin moneda no entra" porque desde la API no se
    puede llegar a ese estado: el disparador rellena la moneda del condominio
    antes de que la restricción mire. La restricción sigue ahí como red —si un
    día un condominio se queda sin moneda, el contrato no entra en vez de
    guardar un número suelto—, pero probarla exigiría desactivar el disparador,
    y entonces la prueba mediría la mutación y no el sistema.
  */

  it("ni un contrato que termina antes de empezar", async () => {
    const intento = await insertar(guillermo, "contrato_arrendamiento", {
      unidad_id: UNIDAD.u205,
      fecha_inicio: "2027-06-01",
      fecha_fin: "2027-01-01",
      registrado_por: guillermo.usuarioId,
    });
    expect(fueRechazada(intento)).toBe(true);
  });

  it("y una vecina no registra contratos en una vivienda ajena", async () => {
    const intento = await insertar(sofia, "contrato_arrendamiento", {
      unidad_id: UNIDAD.u205,
      fecha_inicio: "2027-04-01",
      registrado_por: sofia.usuarioId,
    });
    expect(fueRechazada(intento)).toBe(true);
  });
});

describe("quién ve un contrato", () => {
  it("las dos partes, cada una por su lado", async () => {
    const delPropietario = await leer(
      guillermo,
      `contrato_arrendamiento?select=id,monto&id=eq.${contratoId}`,
    );
    expect(delPropietario.datos).toHaveLength(1);
    expect(Number(delPropietario.datos[0].monto)).toBe(2500000);

    // Y quien tiene alquilado: es su contrato, lo lee.
    const deLaInquilina = await leer(
      inquilino,
      `contrato_arrendamiento?select=id&id=eq.${contratoId}`,
    );
    expect(deLaInquilina.datos).toHaveLength(1);
  });

  it("una vecina no, aunque viva en el mismo edificio", async () => {
    const ajeno = await leer(
      sofia,
      `contrato_arrendamiento?select=id&id=eq.${contratoId}`,
    );
    expect(ajeno.datos).toHaveLength(0);
  });

  it("y la administración del condominio tampoco", async () => {
    /*
      El caso que decide el diseño. Marcela administra el edificio entero y ve
      casi todo, pero cuánto le paga Laura a Guillermo de alquiler no es asunto
      del condominio. Misma línea que los comprobantes de pago con datos
      bancarios.
    */
    const deLaAdmin = await leer(
      marcela,
      `contrato_arrendamiento?select=id&id=eq.${contratoId}`,
    );
    expect(deLaAdmin.datos).toHaveLength(0);
  });

  it("el inquilino lo lee pero no lo redacta", async () => {
    /*
      Sin política de UPDATE que la alcance, PostgREST no devuelve un 403:
      devuelve 200 con cero filas, porque para RLS no hay ninguna fila que
      actualizar. Lo que importa no es el código, es que el importe siga siendo
      el que era.
    */
    await api(inquilino, `/rest/v1/contrato_arrendamiento?id=eq.${contratoId}`, {
      metodo: "PATCH",
      cuerpo: { monto: 1 },
    });

    const sigue = await leer(
      guillermo,
      `contrato_arrendamiento?select=monto&id=eq.${contratoId}`,
    );
    expect(Number(sigue.datos[0].monto)).toBe(2500000);
  });
});

describe("cerrar un contrato", () => {
  it("se finaliza, no se borra: es un historial", async () => {
    const cerrado = await api(
      guillermo,
      `/rest/v1/contrato_arrendamiento?id=eq.${contratoId}`,
      { metodo: "PATCH", cuerpo: { estado: "finalizado" } },
    );
    expect(cerrado.estado).toBe(200);

    const sigue = await leer(
      guillermo,
      `contrato_arrendamiento?select=id,estado&id=eq.${contratoId}`,
    );
    expect(sigue.datos).toHaveLength(1);
    expect(sigue.datos[0].estado).toBe("finalizado");

    // Y quien lo tuvo lo sigue viendo: es su historial también.
    const deLaInquilina = await leer(
      inquilino,
      `contrato_arrendamiento?select=id&id=eq.${contratoId}`,
    );
    expect(deLaInquilina.datos).toHaveLength(1);
  });
});
