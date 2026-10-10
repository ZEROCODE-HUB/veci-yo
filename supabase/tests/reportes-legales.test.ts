import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  api,
  CONDOMINIO,
  CUENTA,
  entrar,
  fueRechazada,
  insertar,
  leer,
  MARCA_PRUEBA,
  UNIDAD,
  type Sesion,
  hoyEnElCondominio,
} from "./apoyo";

/**
 * Los reportes a la autoridad: TRA y SIRE.
 *
 * La Tarjeta de Registro de Alojamiento y el reporte de extranjeros a
 * migraciones. Es el dominio con más peso legal del producto y no tenía
 * ninguna prueba (R-39).
 *
 * Su política era `for all` con `puede_ver_visita(...)`, la misma forma que ya
 * produjo R-64 y R-65 — y `puede_ver_visita` incluye a **todo el personal del
 * condominio**. Así que un guardia emitía un reporte a migraciones a nombre de
 * quien quisiera, y cualquiera que viera la visita podía **borrarlo**: la
 * constancia de haber cumplido, hecha desaparecer por quien tendría motivo
 * para no haberla presentado.
 */

let guillermo: Sesion;
let sofia: Sesion;
let guardia: Sesion;
let marcela: Sesion;

/**
 * Una estancia de la 205, que es de Guillermo, con un invitado. **De hoy.**
 *
 * Era de la 102 y de enero de 2027. Desde el 09/10/2026 la porteria solo ve
 * lo de hoy, lo de mañana y a quien esta dentro, asi que el caso «la porteria
 * si lo ve: es quien confirma el ingreso» dejo de cumplirse con una fecha
 * lejana --y con razon--. Y en la 102 una estancia de hoy chocaria con las
 * reservas que el cliente crea a mano para probar; en la 205 no hay ninguna.
 */
let visitaId = "";
let invitadoId = "";
let reporteId = "";

beforeAll(async () => {
  [sofia, guillermo, guardia, marcela] = await Promise.all([
    entrar(CUENTA.vecino),
    entrar(CUENTA.propietario),
    entrar(CUENTA.guardia),
    entrar(CUENTA.admin),
  ]);

  /*
    La visita y el huésped se **reutilizan** si ya existen.

    Crear unos nuevos en cada corrida dejaba basura que no se puede recoger:
    `reporte_legal.invitado_id` es `on delete restrict` —un reporte a la
    autoridad no desaparece porque alguien borre al huésped, y eso está bien—,
    así que el borrado de la visita fallaba en silencio y todo se quedaba.
    **Cuarenta visitas, cuarenta huéspedes y cuarenta reportes** acumulados, y
    la pantalla de huéspedes del anfitrión mostraba cuarenta reservas idénticas.

    La forma correcta no es debilitar la protección: es no crear una fila nueva
    cada vez.
  */
  const hoy = await hoyEnElCondominio(guillermo);
  const d = new Date(`${hoy}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  const mañana = d.toISOString().slice(0, 10);

  const existente = await leer(
    guillermo,
    `visita?select=id,invitados:invitado(id)&unidad_id=eq.${UNIDAD.u205}&anotaciones_ingreso=eq.${encodeURIComponent(MARCA_PRUEBA)}&limit=1`,
  );

  if (existente.datos.length && existente.datos[0].invitados?.length) {
    visitaId = existente.datos[0].id;
    invitadoId = existente.datos[0].invitados[0].id;
    return;
  }

  const visita = await insertar(guillermo, "visita?select=id", {
    condominio_id: CONDOMINIO,
    unidad_id: UNIDAD.u205,
    tipo: "huesped_temporal",
    registrada_por: guillermo.usuarioId,
    fecha_desde: hoy,
    fecha_hasta: mañana,
    anotaciones_ingreso: MARCA_PRUEBA,
  });
  visitaId = visita.datos[0].id;

  const invitado = await insertar(guillermo, "invitado?select=id", {
    visita_id: visitaId,
    nombre: `${MARCA_PRUEBA} Huésped extranjero`,
    tipo_documento: "pasaporte",
    documento_numero: "X1234567",
  });
  invitadoId = invitado.datos[0].id;
});

/*
  No hay `afterAll` que borre la visita a propósito: no se puede, porque su
  reporte la retiene, y se reutiliza en la corrida siguiente. Una sola visita
  de prueba en la base en vez de una por ejecución.
*/

describe("quién lo emite", () => {
  it("el anfitrión lo crea", async () => {
    // Si la corrida anterior ya lo emitió, se reutiliza: no se puede borrar.
    const existente = await leer(
      guillermo,
      `reporte_legal?select=id&invitado_id=eq.${invitadoId}&momento=eq.entrada&limit=1`,
    );
    if (existente.datos.length) {
      reporteId = existente.datos[0].id;
      return;
    }

    const alta = await insertar(guillermo, "reporte_legal?select=id", {
      invitado_id: invitadoId,
      tipo: "sire",
      momento: "entrada",
      rnt_referencia: `${MARCA_PRUEBA} RNT-0001`,
    });
    expect(alta.estado).toBe(201);
    reporteId = alta.datos[0].id;
  });

  it("la portería no", async () => {
    /*
      El guardia ve la visita —registra el ingreso— y por eso `puede_ver_visita`
      lo incluía. Pero el KT decide que el reporte se emite "por decisión del
      anfitrión", y un reporte a migraciones firmado por quien está en la
      garita no es lo que dice ese documento.
    */
    const intento = await api(guardia, "/rest/v1/reporte_legal", {
      metodo: "POST",
      prefer: "return=minimal",
      cuerpo: {
        invitado_id: invitadoId,
        tipo: "tra",
        momento: "entrada",
      },
    });
    expect(fueRechazada(intento)).toBe(true);
  });

  it("pero sí lo ve: es quien confirma el ingreso", async () => {
    // Control positivo del caso anterior: el rechazo es del alta, no de que la
    // portería no tenga nada que ver con esta visita.
    const visto = await leer(
      guardia,
      `reporte_legal?invitado_id=eq.${invitadoId}&select=id,tipo`,
    );
    expect(visto.datos.length).toBeGreaterThan(0);
  });

  it("un vecino de otra vivienda ni lo ve ni lo crea", async () => {
    const visto = await leer(
      sofia,
      `reporte_legal?invitado_id=eq.${invitadoId}&select=id`,
    );
    expect(visto.datos).toHaveLength(0);

    const intento = await api(sofia, "/rest/v1/reporte_legal", {
      metodo: "POST",
      prefer: "return=minimal",
      cuerpo: { invitado_id: invitadoId, tipo: "tra", momento: "salida" },
    });
    expect(fueRechazada(intento)).toBe(true);
  });
});

describe("quién dice haberlo enviado", () => {
  it("no se firma en nombre de otro", async () => {
    const intento = await api(
      guillermo,
      `/rest/v1/reporte_legal?id=eq.${reporteId}`,
      {
        metodo: "PATCH",
        cuerpo: {
          estado: "enviado",
          enviado_por: marcela.usuarioId,
          enviado_en: new Date().toISOString(),
        },
      },
    );
    expect(fueRechazada(intento)).toBe(true);
  });

  it("el de entrada espera a que el huésped haya llegado", async () => {
    /*
      Lo dice el comentario del propio esquema —"solo una vez confirmado el
      ingreso físico"— y no lo imponía nada. Un reporte de entrada de alguien
      que no ha llegado es un dato falso enviado a migraciones.

      El caso asegura su premisa: ahora que la visita se reutiliza entre
      corridas, la llegada puede venir marcada de antes —de otra prueba o de un
      recorrido a mano— y entonces este caso no mediría nada.
    */
    await api(guardia, `/rest/v1/invitado?id=eq.${invitadoId}`, {
      metodo: "PATCH",
      cuerpo: { llego: false, ingreso_en: null },
    });

    const intento = await api(
      guillermo,
      `/rest/v1/reporte_legal?id=eq.${reporteId}`,
      {
        metodo: "PATCH",
        cuerpo: {
          estado: "enviado",
          enviado_por: guillermo.usuarioId,
          enviado_en: new Date().toISOString(),
        },
      },
    );
    expect(fueRechazada(intento)).toBe(true);
  });

  it("y cuando llega, se envía", async () => {
    await api(guardia, `/rest/v1/invitado?id=eq.${invitadoId}`, {
      metodo: "PATCH",
      cuerpo: { llego: true, ingreso_en: new Date().toISOString() },
    });

    const envio = await api(
      guillermo,
      `/rest/v1/reporte_legal?id=eq.${reporteId}`,
      {
        metodo: "PATCH",
        cuerpo: {
          estado: "enviado",
          enviado_por: guillermo.usuarioId,
          enviado_en: new Date().toISOString(),
        },
      },
    );
    expect(envio.estado).toBe(200);

    const fila = await leer(
      guillermo,
      `reporte_legal?id=eq.${reporteId}&select=estado,enviado_por`,
    );
    expect(fila.datos[0].estado).toBe("enviado");
    expect(fila.datos[0].enviado_por).toBe(guillermo.usuarioId);
  });
});

describe("no se borra ni se deshace", () => {
  it("nadie borra un reporte, ni quien lo emitió", async () => {
    await api(guillermo, `/rest/v1/reporte_legal?id=eq.${reporteId}`, {
      metodo: "DELETE",
    });

    const sigue = await leer(
      guillermo,
      `reporte_legal?id=eq.${reporteId}&select=id`,
    );
    expect(sigue.datos).toHaveLength(1);
  });

  it("la portería tampoco", async () => {
    await api(guardia, `/rest/v1/reporte_legal?id=eq.${reporteId}`, {
      metodo: "DELETE",
    });

    const sigue = await leer(
      guardia,
      `reporte_legal?id=eq.${reporteId}&select=id`,
    );
    expect(sigue.datos).toHaveLength(1);
  });

  it("un reporte enviado no vuelve a pendiente", async () => {
    // Corregir un envío erróneo es marcarlo `fallido` con su detalle, que deja
    // rastro. Volver a `pendiente` lo borraría de la historia sin borrar nada.
    const intento = await api(
      guillermo,
      `/rest/v1/reporte_legal?id=eq.${reporteId}`,
      { metodo: "PATCH", cuerpo: { estado: "pendiente" } },
    );
    expect(fueRechazada(intento)).toBe(true);
  });

  it("pero sí se marca fallido", async () => {
    const intento = await api(
      guillermo,
      `/rest/v1/reporte_legal?id=eq.${reporteId}`,
      {
        metodo: "PATCH",
        cuerpo: { estado: "fallido", error_detalle: `${MARCA_PRUEBA} rechazado` },
      },
    );
    expect(intento.estado).toBe(200);
  });
});
