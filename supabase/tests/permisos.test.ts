import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  api,
  CONDOMINIO,
  CUENTA,
  entrar,
  fechaEnDias,
  fueRechazada,
  insertar,
  leer,
  rpc,
  UNIDAD,
  type Sesion,
} from "./apoyo";

/**
 * Las casillas de `permiso_vivienda`.
 *
 * Eran ocho banderas que la pantalla de Permisos escribía y la base no miraba
 * (R-77). Ahora la base las impone, así que cada una necesita una prueba que
 * **la invierta** y compruebe que el comportamiento cambia: es la regla de
 * `AGENTS.md` que salió de que este defecto apareciera seis veces.
 *
 * Todas dejan los permisos como estaban: un `afterEach` los vacía, que es el
 * estado real de la base —nadie ha decidido ninguna todavía—.
 */

let admin: Sesion;
let propietario: Sesion;
let guardia: Sesion;

/** Las visitas creadas aquí, para poder borrarlas al final. */
const visitas: string[] = [];

async function fijarCondominio(campos: Record<string, unknown>) {
  const fila = await leer(
    admin,
    `permiso_vivienda?condominio_id=eq.${CONDOMINIO}&unidad_id=is.null&select=id`,
  );
  const respuesta = await api(
    admin,
    `/rest/v1/permiso_vivienda?id=eq.${fila.datos[0].id}`,
    { metodo: "PATCH", cuerpo: campos },
  );
  expect(respuesta.estado).toBe(200);
}

/** La excepción de una vivienda concreta, que manda sobre la del edificio. */
async function fijarUnidad(unidadId: string, campos: Record<string, unknown>) {
  const fila = await leer(
    admin,
    `permiso_vivienda?unidad_id=eq.${unidadId}&select=id`,
  );
  if (fila.datos.length > 0) {
    await api(admin, `/rest/v1/permiso_vivienda?id=eq.${fila.datos[0].id}`, {
      metodo: "PATCH",
      cuerpo: campos,
    });
    return;
  }
  await insertar(admin, "permiso_vivienda", {
    condominio_id: CONDOMINIO,
    unidad_id: unidadId,
    ...campos,
  });
}

/** Deja el panel como está de verdad: sin ninguna decisión tomada. */
const NADA_DECIDIDO = {
  huespedes_temporales: null,
  corta_permite_visitas: null,
  corta_permite_ninos: null,
  corta_permite_cocheras: null,
  corta_permite_mascotas: null,
  larga_permite_visitas: null,
  larga_permite_ninos: null,
  larga_permite_cocheras: null,
  larga_permite_mascotas: null,
};

async function crearVisita(unidadId: string) {
  const respuesta = await insertar(propietario, "visita", {
    condominio_id: CONDOMINIO,
    unidad_id: unidadId,
    tipo: "amigos",
    registrada_por: propietario.usuarioId,
    /*
      Relativas a hoy. Estaban escritas a fuego --«2026-12-01»-- y el guarda
      `npm run fechas` las marco al entrar en los 60 dias: una fecha fija deja
      de ser futuro y entonces la visita que esta prueba crea choca con la regla
      de «no en el pasado», en un caso que no va de fechas.
    */
    fecha_desde: fechaEnDias(10),
    fecha_hasta: fechaEnDias(10),
  });
  if (respuesta.estado === 201) visitas.push(respuesta.datos[0].id);
  return respuesta;
}

beforeAll(async () => {
  [admin, propietario, guardia] = await Promise.all([
    entrar(CUENTA.admin),
    entrar(CUENTA.propietario),
    entrar(CUENTA.guardia),
  ]);
});

afterEach(async () => {
  await fijarCondominio(NADA_DECIDIDO);
  const excepcion = await leer(
    admin,
    `permiso_vivienda?unidad_id=eq.${UNIDAD.u101}&select=id`,
  );
  for (const fila of excepcion.datos) {
    await api(admin, `/rest/v1/permiso_vivienda?id=eq.${fila.id}`, {
      metodo: "DELETE",
    });
  }
});

afterAll(async () => {
  for (const id of visitas) {
    await api(admin, `/rest/v1/visita?id=eq.${id}`, { metodo: "DELETE" });
  }
});

describe("lo que nadie ha decidido no prohíbe nada", () => {
  it("con el panel vacío, la vivienda está autorizada y admite visitas", async () => {
    const reglas = await rpc(propietario, "reglas_de_estancia", {
      p_unidad_id: UNIDAD.u101,
    });
    expect(reglas.datos[0].permite_visitas).toBeNull();

    const autorizada = await rpc(propietario, "autorizacion_renta_corta", {
      p_unidad_id: UNIDAD.u101,
    });
    expect(autorizada.datos).toBe(true);

    const visita = await crearVisita(UNIDAD.u101);
    expect(visita.estado).toBe(201);
  });
});

describe("la autorización de renta corta", () => {
  it("si el edificio la prohíbe, no se puede activar una suscripción", async () => {
    await fijarCondominio({ huespedes_temporales: false });

    const autorizada = await rpc(propietario, "autorizacion_renta_corta", {
      p_unidad_id: UNIDAD.u101,
    });
    expect(autorizada.datos).toBe(false);

    const alta = await insertar(propietario, "suscripcion_renta_corta", {
      unidad_id: UNIDAD.u101,
      estado: "activa",
    });
    expect(fueRechazada(alta)).toBe(true);
  });

  it("la excepción de la vivienda manda sobre la regla del edificio", async () => {
    await fijarCondominio({ huespedes_temporales: false });
    await fijarUnidad(UNIDAD.u101, { huespedes_temporales: true });

    const autorizada = await rpc(propietario, "autorizacion_renta_corta", {
      p_unidad_id: UNIDAD.u101,
    });
    expect(autorizada.datos).toBe(true);

    const alta = await insertar(propietario, "suscripcion_renta_corta", {
      unidad_id: UNIDAD.u101,
      estado: "activa",
    });
    expect(alta.estado).toBe(201);
    await api(admin, `/rest/v1/suscripcion_renta_corta?id=eq.${alta.datos[0].id}`, {
      metodo: "DELETE",
    });
  });

  it("una excepción vacía hereda del edificio, no lo contradice", async () => {
    await fijarCondominio({ huespedes_temporales: false });
    // La 101 tiene fila propia, pero sin decir nada de esta bandera.
    await fijarUnidad(UNIDAD.u101, {
      huespedes_temporales: null,
      corta_permite_mascotas: true,
    });

    const autorizada = await rpc(propietario, "autorizacion_renta_corta", {
      p_unidad_id: UNIDAD.u101,
    });
    expect(autorizada.datos).toBe(false);

    // Y lo que sí dice, se respeta: la excepción no es todo o nada.
    const reglas = await rpc(propietario, "reglas_de_estancia", {
      p_unidad_id: UNIDAD.u101,
    });
    expect(reglas.datos[0].permite_mascotas).toBe(true);
  });

  it("cancelar una suscripción se puede aunque el edificio ya no la autorice", async () => {
    const alta = await insertar(propietario, "suscripcion_renta_corta", {
      unidad_id: UNIDAD.u101,
      estado: "activa",
    });
    expect(alta.estado).toBe(201);

    await fijarCondominio({ huespedes_temporales: false });

    const baja = await api(
      propietario,
      `/rest/v1/suscripcion_renta_corta?id=eq.${alta.datos[0].id}`,
      { metodo: "PATCH", cuerpo: { estado: "cancelada" } },
    );
    expect(baja.estado).toBe(200);

    await api(admin, `/rest/v1/suscripcion_renta_corta?id=eq.${alta.datos[0].id}`, {
      metodo: "DELETE",
    });
  });
});

describe("las visitas", () => {
  it("si la vivienda no las tiene autorizadas, no se registran", async () => {
    await fijarCondominio({ corta_permite_visitas: false });

    const visita = await crearVisita(UNIDAD.u101);
    expect(fueRechazada(visita)).toBe(true);
  });

  it("y si las tiene, sí", async () => {
    await fijarCondominio({ corta_permite_visitas: true });

    const visita = await crearVisita(UNIDAD.u101);
    expect(visita.estado).toBe(201);
  });
});

describe("los menores y las cocheras", () => {
  it("un menor no entra donde no están autorizados", async () => {
    await fijarCondominio({ corta_permite_ninos: false });

    const visita = await crearVisita(UNIDAD.u101);
    expect(visita.estado).toBe(201);

    const menor = await insertar(propietario, "invitado", {
      visita_id: visita.datos[0].id,
      nombre: "[prueba] menor",
      es_menor: true,
    });
    expect(fueRechazada(menor)).toBe(true);

    // Control positivo: el mismo invitado sin marcar como menor sí entra, así
    // que el rechazo es de la casilla y no de la política.
    const adulto = await insertar(propietario, "invitado", {
      visita_id: visita.datos[0].id,
      nombre: "[prueba] adulto",
      es_menor: false,
    });
    expect(adulto.estado).toBe(201);
  });

  it("un vehículo de visita no entra donde no hay cocheras autorizadas", async () => {
    await fijarCondominio({ corta_permite_cocheras: false });

    const visita = await crearVisita(UNIDAD.u101);
    const vehiculo = await insertar(propietario, "vehiculo_visita", {
      visita_id: visita.datos[0].id,
      placa: "[prueba]",
      tipo: "auto",
    });
    expect(fueRechazada(vehiculo)).toBe(true);
  });

  it("con las cocheras autorizadas, el mismo vehículo entra", async () => {
    await fijarCondominio({ corta_permite_cocheras: true });

    const visita = await crearVisita(UNIDAD.u101);
    const vehiculo = await insertar(propietario, "vehiculo_visita", {
      visita_id: visita.datos[0].id,
      placa: "[prueba]",
      tipo: "auto",
    });
    expect(vehiculo.estado).toBe(201);
  });
});

describe("los límites numéricos advierten, no bloquean", () => {
  /*
    Es una decisión del KT, flujo 4.1 paso 5: "El sistema debe mostrar como
    advertencia (no bloqueo duro) las reglas mínimas que ya impone el
    edificio". Ya se implementó una vez al revés y hubo que deshacerlo (R-84),
    así que queda fijado aquí.
  */
  it("una estancia máxima de 3 no impide una suscripción", async () => {
    await fijarCondominio({ corta_estancia_maxima: 3 });

    const alta = await insertar(propietario, "suscripcion_renta_corta", {
      unidad_id: UNIDAD.u101,
      estado: "activa",
    });
    expect(alta.estado).toBe(201);

    await api(admin, `/rest/v1/suscripcion_renta_corta?id=eq.${alta.datos[0].id}`, {
      metodo: "DELETE",
    });
  });

  it("la pantalla recibe lo que tiene que advertir", async () => {
    const limites = await rpc(propietario, "limites_del_condominio", {
      p_unidad_id: UNIDAD.u101,
    });
    expect(limites.datos.length).toBe(1);
    expect(limites.datos[0]).toHaveProperty("permite_renta_corta");
    expect(limites.datos[0]).toHaveProperty("estancia_minima_noches");
    expect(limites.datos[0]).toHaveProperty("capacidad_maxima");
  });
});

describe("quién decide", () => {
  it("un propietario no cambia los permisos de su edificio", async () => {
    const fila = await leer(
      propietario,
      `permiso_vivienda?condominio_id=eq.${CONDOMINIO}&unidad_id=is.null&select=id`,
    );
    // Los ve —le afectan— pero no los escribe.
    expect(fila.datos.length).toBe(1);

    // Con `return=minimal` un PATCH que no alcanza ninguna fila responde 204
    // sin cuerpo, no un error. Lo que hay que mirar es el valor, no el codigo.
    await api(
      propietario,
      `/rest/v1/permiso_vivienda?id=eq.${fila.datos[0].id}`,
      {
        metodo: "PATCH",
        prefer: "return=minimal",
        cuerpo: { huespedes_temporales: true },
      },
    );

    const despues = await leer(
      admin,
      `permiso_vivienda?id=eq.${fila.datos[0].id}&select=huespedes_temporales`,
    );
    expect(despues.datos[0].huespedes_temporales).toBeNull();
  });

  it("la portería tampoco", async () => {
    const fila = await leer(
      guardia,
      `permiso_vivienda?condominio_id=eq.${CONDOMINIO}&unidad_id=is.null&select=id`,
    );
    expect(fila.datos.length).toBe(1);

    await api(guardia, `/rest/v1/permiso_vivienda?id=eq.${fila.datos[0].id}`, {
      metodo: "PATCH",
      prefer: "return=minimal",
      cuerpo: { corta_permite_visitas: false },
    });

    const despues = await leer(
      admin,
      `permiso_vivienda?id=eq.${fila.datos[0].id}&select=corta_permite_visitas`,
    );
    expect(despues.datos[0].corta_permite_visitas).toBeNull();
  });
});
