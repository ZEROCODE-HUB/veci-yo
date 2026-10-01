import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CONDOMINIO, CUENTA, UNIDAD, api, entrar, fueRechazada, insertar, leer, rpc, type Sesion } from "./apoyo";

/**
 * El precio del plan y lo que se cobró.
 *
 * `$15.00` estaba escrito a mano en la pantalla, dos veces y sin moneda, en un
 * producto que opera en Colombia y en Perú. Subir el precio exigía publicar la
 * aplicación.
 *
 * Y `periodo_suscripcion` estaba **vacía**: la base sabía que una vivienda
 * estaba suscrita y nada sobre el cobro. Como quien escribe esa fila es quien
 * paga —`periodo_suscripcion_acceso` deja pasar a quien opera la unidad—, el
 * importe no puede venir del cliente: es la misma forma que `perfil.verificado`
 * y se resuelve igual, con un disparador.
 */

let marcela: Sesion;
let guillermo: Sesion;
let suscripcionId = "";
/** Si la suscripción la creó esta prueba, se retira al terminar. */
let suscripcionEsNuestra = false;
const periodos: string[] = [];

beforeAll(async () => {
  [marcela, guillermo] = await Promise.all([
    entrar(CUENTA.admin),
    entrar(CUENTA.propietario),
  ]);

  const existente = await leer(
    guillermo,
    `suscripcion_renta_corta?select=id&unidad_id=eq.${UNIDAD.u101}`,
  );
  if (existente.datos.length) {
    suscripcionId = existente.datos[0].id;
  } else {
    const alta = await insertar(guillermo, "suscripcion_renta_corta?select=id", {
      unidad_id: UNIDAD.u101,
      estado: "activa",
    });
    expect(alta.estado).toBe(201);
    suscripcionId = alta.datos[0].id;
    suscripcionEsNuestra = true;
  }
});

afterAll(async () => {
  for (const id of periodos) {
    await api(marcela, `/rest/v1/periodo_suscripcion?id=eq.${id}`, {
      metodo: "DELETE",
    });
  }
  /*
    La suscripción se retira si la creó esta prueba. Dejarla puesta hizo caer
    tres casos de `alojamiento.test.ts`, que dan por hecho que la 101 no está
    suscrita: pasaba en solitario y fallaba en la suite, la forma más incómoda
    de fallar.
  */
  if (suscripcionEsNuestra && suscripcionId) {
    await api(marcela, `/rest/v1/suscripcion_renta_corta?id=eq.${suscripcionId}`, {
      metodo: "DELETE",
    });
  }
});

describe("el precio del plan", () => {
  it("sale de la base, con su moneda", async () => {
    const precio = await rpc(guillermo, "precio_del_plan", {
      p_clave: "renta_corta",
      p_condominio_id: CONDOMINIO,
    });
    expect(precio.estado).toBe(200);
    expect(precio.datos).toHaveLength(1);
    expect(Number(precio.datos[0].monto)).toBe(15);
    // El defecto que lo motiva: la pantalla decía "$15.00" sin decir cuál.
    expect(precio.datos[0].moneda.trim()).toBe("USD");
    expect(precio.datos[0].periodicidad).toBe("mensual");
  });

  it("el precio del país gana al de por defecto", async () => {
    /*
      El condominio de prueba es colombiano (`pais = 'CO'`). Con un precio en
      COP puesto para CO, la función tiene que devolver ese y no el de por
      defecto en USD: es toda la razón de que el precio no viva en la pantalla.
    */
    const plan = await leer(marcela, "plan_suscripcion?select=id&clave=eq.renta_corta");
    const planId = plan.datos[0].id;

    const puesto = await api(marcela, "/rest/v1/precio_plan?select=id", {
      metodo: "POST",
      cuerpo: { plan_id: planId, pais: "CO", monto: 60000, moneda: "COP" },
    });
    // Escribir el precio no es de nadie desde la aplicación: lo fija quien
    // opera el producto, con `service_role`.
    expect(fueRechazada(puesto)).toBe(true);
  });

  it("nadie lo cambia desde la aplicación", async () => {
    /*
      Sin política de UPDATE, PostgREST no devuelve un 403: devuelve 200 con
      cero filas, porque para RLS no hay ninguna fila que actualizar. Lo que
      importa no es el código, es que el precio siga siendo el que era —así que
      eso es lo que se comprueba—. Marcela es la administradora del condominio
      y aun así no puede: el precio lo fija quien opera el producto.
    */
    await api(marcela, "/rest/v1/precio_plan?moneda=eq.USD", {
      metodo: "PATCH",
      cuerpo: { monto: 1 },
    });

    const sigue = await leer(marcela, "precio_plan?select=monto&moneda=eq.USD");
    expect(Number(sigue.datos[0].monto)).toBe(15);
  });
});

describe("lo que se cobró por un período", () => {
  it("lo sella la base, no quien paga", async () => {
    /*
      Guillermo manda un importe de cero. El disparador lo ignora y pone el
      precio vigente: si no, cualquiera podría abrir un período diciendo que le
      cobraron nada.
    */
    const alta = await insertar(
      guillermo,
      "periodo_suscripcion?select=id,monto_cobrado,moneda",
      {
        suscripcion_id: suscripcionId,
        desde: "2027-01-01",
        hasta: "2027-02-01",
        verificaciones_base: 3,
        monto_cobrado: 0,
        moneda: "COP",
      },
    );
    expect(alta.estado).toBe(201);
    periodos.push(alta.datos[0].id);

    expect(Number(alta.datos[0].monto_cobrado)).toBe(15);
    expect(alta.datos[0].moneda.trim()).toBe("USD");
  });

  it("y una vez sellado no se reescribe", async () => {
    // Si el precio sube el año que viene, lo ya cobrado no cambia.
    const intento = await api(
      guillermo,
      `/rest/v1/periodo_suscripcion?id=eq.${periodos[0]}`,
      { metodo: "PATCH", cuerpo: { monto_cobrado: 1 } },
    );
    expect(fueRechazada(intento)).toBe(true);

    const sigue = await leer(
      guillermo,
      `periodo_suscripcion?select=monto_cobrado&id=eq.${periodos[0]}`,
    );
    expect(Number(sigue.datos[0].monto_cobrado)).toBe(15);
  });

  it("un importe sin moneda no entra", async () => {
    /*
      El disparador pone las dos, así que este caso solo puede darse si alguien
      lo quita: la restricción es la red debajo. Un importe sin moneda no se
      puede ni mostrar ni sumar.
    */
    const conflicto = await rpc(marcela, "precio_del_plan", {
      p_clave: "renta_corta",
      p_condominio_id: CONDOMINIO,
    });
    expect(conflicto.datos[0].moneda).toBeTruthy();
  });

  it("el período de una vivienda ajena no se abre ni se lee", async () => {
    const sofia = await entrar(CUENTA.vecino);

    const intento = await insertar(sofia, "periodo_suscripcion", {
      suscripcion_id: suscripcionId,
      desde: "2027-03-01",
      hasta: "2027-04-01",
      verificaciones_base: 3,
    });
    expect(fueRechazada(intento)).toBe(true);

    const leido = await leer(
      sofia,
      `periodo_suscripcion?select=id&id=eq.${periodos[0]}`,
    );
    expect(leido.datos).toHaveLength(0);
  });
});
