import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  api,
  CUENTA,
  UNIDAD,
  entrar,
  fueRechazada,
  leer,
  rpc,
  type Sesion,
} from "./apoyo";

/**
 * Quién vive en la vivienda.
 *
 * La pantalla de Configuración del propietario mostraba **tres personas
 * inventadas** escritas a mano en `propietario-store.ts` —"Alberto Manual",
 * con la errata, y dos más con cédulas ficticias—. Sobre ese mismo store
 * operaban el anfitrión primario, el administrador primario y la declaración
 * de residencia del propietario: todo en memoria, todo perdido al recargar.
 *
 * Y no era cosmético: `membresia_unidad.es_residente` sostiene
 * `es_residente_en_condominio`, que sostiene `audiencia_alcanza`. Decide quién
 * ve los anuncios dirigidos "a residentes" y quién entra en el grupo de chat
 * de residentes. La declaración del propietario nunca llegaba al dato.
 */

let marcela: Sesion;
let guillermo: Sesion;
let sofia: Sesion;
let laura: Sesion;

/** Las membresías de la 205: Guillermo (propietario) y Laura (inquilina líder). */
let membresiaGuillermo205 = "";
let membresiaLaura205 = "";
/** El estado original, para devolverlo al terminar. */
let originales: Array<{
  id: string;
  anfitrion: boolean;
  admin: boolean;
  residente: boolean;
  visibles: boolean;
  chat: boolean;
  whatsapp: boolean;
}> = [];

beforeAll(async () => {
  [marcela, guillermo, sofia, laura] = await Promise.all([
    entrar(CUENTA.admin),
    entrar(CUENTA.propietario),
    entrar(CUENTA.vecino),
    entrar(CUENTA.laura),
  ]);

  const dela205 = await leer(
    guillermo,
    `membresia_unidad?select=id,usuario_id,rol,es_anfitrion_primario,es_admin_primario,es_residente,datos_visibles,contactable_chat,contactable_whatsapp&unidad_id=eq.${UNIDAD.u205}&activo=is.true`,
  );

  originales = dela205.datos.map((m: any) => ({
    id: m.id,
    anfitrion: m.es_anfitrion_primario,
    admin: m.es_admin_primario,
    residente: m.es_residente,
    visibles: m.datos_visibles,
    chat: m.contactable_chat,
    whatsapp: m.contactable_whatsapp,
  }));

  membresiaGuillermo205 = dela205.datos.find(
    (m: any) => m.usuario_id === guillermo.usuarioId,
  )?.id;
  membresiaLaura205 = dela205.datos.find(
    (m: any) => m.usuario_id === laura.usuarioId,
  )?.id;

  expect(membresiaGuillermo205).toBeTruthy();
  expect(membresiaLaura205).toBeTruthy();
});

afterAll(async () => {
  // El índice único no admite dos primarios a la vez, así que primero se
  // apagan todos y después se restaura el que estuviera puesto.
  for (const fila of originales) {
    await api(marcela, `/rest/v1/membresia_unidad?id=eq.${fila.id}`, {
      metodo: "PATCH",
      cuerpo: { es_anfitrion_primario: false, es_admin_primario: false },
    });
  }
  for (const fila of originales) {
    await api(marcela, `/rest/v1/membresia_unidad?id=eq.${fila.id}`, {
      metodo: "PATCH",
      cuerpo: {
        es_anfitrion_primario: fila.anfitrion,
        es_admin_primario: fila.admin,
        es_residente: fila.residente,
        // También la visibilidad: mientras la política está relajada a
        // propósito, el caso del vecino entrometido **escribe de verdad**, y
        // Laura se quedó sin WhatsApp hasta la corrida siguiente.
        datos_visibles: fila.visibles,
        contactable_chat: fila.chat,
        contactable_whatsapp: fila.whatsapp,
      },
    });
  }
});

describe("quién vive aquí", () => {
  it("la lista sale de la base, no de un store", async () => {
    const dela205 = await leer(
      guillermo,
      `membresia_unidad?select=id,nombre,rol&unidad_id=eq.${UNIDAD.u205}&activo=is.true`,
    );
    expect(dela205.datos.length).toBeGreaterThan(0);

    // El control: las tres personas del store no existen en ninguna vivienda.
    const inventadas = await leer(
      marcela,
      `membresia_unidad?select=id&nombre=in.(${encodeURIComponent("Alberto Manual,Luis Torres")})`,
    );
    expect(inventadas.datos).toHaveLength(0);
  });

  it("un vecino no ve quién vive en la vivienda de al lado", async () => {
    const ajena = await leer(
      sofia,
      `membresia_unidad?select=id&unidad_id=eq.${UNIDAD.u205}`,
    );
    expect(ajena.datos).toHaveLength(0);
  });
});

describe("designar al anfitrión primario", () => {
  it("el propietario designa a quien vive con él", async () => {
    const hecho = await rpc(guillermo, "designar_primario", {
      p_membresia_id: membresiaLaura205,
      p_cual: "anfitrion",
    });
    expect(hecho.estado).toBe(204);

    const dela205 = await leer(
      guillermo,
      `membresia_unidad?select=id,es_anfitrion_primario&unidad_id=eq.${UNIDAD.u205}&activo=is.true`,
    );
    const conBandera = dela205.datos.filter(
      (m: any) => m.es_anfitrion_primario,
    );
    // Uno, y solo uno: el índice único lo impone y la función apaga al anterior.
    expect(conBandera).toHaveLength(1);
    expect(conBandera[0].id).toBe(membresiaLaura205);
  });

  it("y puede devolvérselo a sí mismo", async () => {
    /*
      `proteger_membresia_unidad` impide que nadie se cambie a sí mismo
      `es_anfitrion_primario`, que es la regla correcta en general. Pero el
      propietario designándose anfitrión de su propia vivienda es legítimo y la
      pantalla lo ofrece: por eso la autorización se comprueba en la función.
    */
    const hecho = await rpc(guillermo, "designar_primario", {
      p_membresia_id: membresiaGuillermo205,
      p_cual: "anfitrion",
    });
    expect(hecho.estado).toBe(204);

    const suya = await leer(
      guillermo,
      `membresia_unidad?select=es_anfitrion_primario&id=eq.${membresiaGuillermo205}`,
    );
    expect(suya.datos[0].es_anfitrion_primario).toBe(true);
  });

  it("una vecina no designa nada en una vivienda que no es suya", async () => {
    const intento = await rpc(sofia, "designar_primario", {
      p_membresia_id: membresiaLaura205,
      p_cual: "anfitrion",
    });
    expect(fueRechazada(intento)).toBe(true);

    // Control positivo al lado: sigue siendo Guillermo.
    const suya = await leer(
      guillermo,
      `membresia_unidad?select=es_anfitrion_primario&id=eq.${membresiaGuillermo205}`,
    );
    expect(suya.datos[0].es_anfitrion_primario).toBe(true);
  });

  it("y nadie se autoproclama por la puerta de atrás", async () => {
    // Sin la función: un `update` directo sobre la propia membresía.
    const intento = await api(
      laura,
      `/rest/v1/membresia_unidad?id=eq.${membresiaLaura205}`,
      { metodo: "PATCH", cuerpo: { es_anfitrion_primario: true } },
    );
    expect(fueRechazada(intento)).toBe(true);
  });
});

describe("declararse residente", () => {
  it("el propietario dice si vive en su vivienda, y eso cambia el dato", async () => {
    const fuera = await rpc(guillermo, "declararse_residente", {
      p_unidad_id: UNIDAD.u205,
      p_valor: false,
    });
    expect(fuera.estado).toBe(204);

    const tras = await leer(
      guillermo,
      `membresia_unidad?select=es_residente&id=eq.${membresiaGuillermo205}`,
    );
    expect(tras.datos[0].es_residente).toBe(false);

    const dentro = await rpc(guillermo, "declararse_residente", {
      p_unidad_id: UNIDAD.u205,
      p_valor: true,
    });
    expect(dentro.estado).toBe(204);

    const vuelta = await leer(
      guillermo,
      `membresia_unidad?select=es_residente&id=eq.${membresiaGuillermo205}`,
    );
    expect(vuelta.datos[0].es_residente).toBe(true);
  });

  it("nadie declara dónde vive su vecino", async () => {
    const intento = await rpc(sofia, "declararse_residente", {
      p_unidad_id: UNIDAD.u205,
      p_valor: false,
    });
    expect(fueRechazada(intento)).toBe(true);

    const sigue = await leer(
      guillermo,
      `membresia_unidad?select=es_residente&id=eq.${membresiaGuillermo205}`,
    );
    expect(sigue.datos[0].es_residente).toBe(true);
  });
});

describe("lo que cada quien comparte", () => {
  it("uno cambia su propia visibilidad", async () => {
    const hecho = await api(
      laura,
      `/rest/v1/membresia_unidad?id=eq.${membresiaLaura205}`,
      { metodo: "PATCH", cuerpo: { datos_visibles: false } },
    );
    expect(hecho.estado).toBe(200);

    const tras = await leer(
      laura,
      `membresia_unidad?select=datos_visibles&id=eq.${membresiaLaura205}`,
    );
    expect(tras.datos[0].datos_visibles).toBe(false);

    await api(laura, `/rest/v1/membresia_unidad?id=eq.${membresiaLaura205}`, {
      metodo: "PATCH",
      cuerpo: { datos_visibles: true },
    });
  });

  it("pero no la de otro, aunque gestione la vivienda", async () => {
    /*
      Guillermo es el propietario de la 205 y puede dar de alta y de baja a
      Laura. Lo que no puede es decidir por ella qué comparte: es una
      afirmación **sobre** ella, la misma forma que `perfil.verificado`.
    */
    const intento = await api(
      guillermo,
      `/rest/v1/membresia_unidad?id=eq.${membresiaLaura205}`,
      { metodo: "PATCH", cuerpo: { contactable_whatsapp: false } },
    );
    expect(fueRechazada(intento)).toBe(true);

    const sigue = await leer(
      laura,
      `membresia_unidad?select=contactable_whatsapp&id=eq.${membresiaLaura205}`,
    );
    expect(sigue.datos[0].contactable_whatsapp).toBe(true);
  });
});
