import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  CONDOMINIO,
  CUENTA,
  MARCA_PRUEBA,
  UNIDAD,
  api,
  entrar,
  fueRechazada,
  insertar,
  leer,
  type Sesion,
} from "./apoyo";

/**
 * Las cinco tablas que ninguna prueba tocaba.
 *
 * De las 59 del esquema, `comite_propietarios`, `deposito`, `tipologia`,
 * `visita_evento` y `zona_fecha_especial` no las nombraba ningún archivo.
 * Cuatro están vacías y la quinta tiene una fila, así que no había nada que
 * filtrar **todavía**: sus políticas estaban escritas y nunca ejercidas.
 *
 * La más delicada es `visita_evento`, que guarda la cronología de una visita
 * --quién entró, cuándo-- y delega en `puede_ver_visita`. Hoy está vacía; es lo
 * primero que se llenará cuando la portería use la aplicación de verdad.
 *
 * Cada caso se trae lo que necesita y se lo lleva. Y cada negativo va con su
 * control positivo al lado: «el vecino no lo ve» no prueba nada si resulta que
 * no lo ve nadie.
 */
let marcela: Sesion;
let guillermo: Sesion;
let sofia: Sesion;
let guardia: Sesion;

const creados: Array<{ tabla: string; id: string }> = [];

const apuntar = (tabla: string, respuesta: { datos?: Array<{ id: string }> }) => {
  const id = respuesta.datos?.[0]?.id;
  if (id) creados.push({ tabla, id });
  return id;
};

beforeAll(async () => {
  [marcela, guillermo, sofia, guardia] = await Promise.all([
    entrar(CUENTA.admin),
    entrar(CUENTA.propietario),
    entrar(CUENTA.vecino),
    entrar(CUENTA.guardia),
  ]);
});

afterAll(async () => {
  for (const { tabla, id } of creados.reverse()) {
    await api(marcela, `/rest/v1/${tabla}?id=eq.${id}`, { metodo: "DELETE" });
  }

  // Una limpieza que no comprueba si limpió no es una limpieza.
  for (const { tabla, id } of creados) {
    const quedan = await leer(marcela, `${tabla}?select=id&id=eq.${id}`);
    expect(quedan.datos ?? [], `${tabla} tenía que quedar limpia`).toHaveLength(
      0,
    );
  }
});

describe("los depósitos del edificio", () => {
  let deposito = "";

  it("los da de alta la administración", async () => {
    const alta = await insertar(marcela, "deposito?select=id", {
      condominio_id: CONDOMINIO,
      codigo: `${MARCA_PRUEBA} D-99`,
    });

    expect(alta.estado).toBe(201);
    deposito = apuntar("deposito", alta) ?? "";
  });

  it("y un vecino los ve pero no los toca", async () => {
    /*
      Leer sí: un depósito es parte del edificio y aparece en el directorio de
      propiedades. Escribir no: la arquitectura la define la administración.
    */
    const suyos = await leer(guillermo, `deposito?select=id&id=eq.${deposito}`);
    expect(suyos.datos ?? []).toHaveLength(1);

    const intento = await api(guillermo, `/rest/v1/deposito?id=eq.${deposito}`, {
      metodo: "PATCH",
      cuerpo: { codigo: `${MARCA_PRUEBA} robado` },
    });
    expect(fueRechazada(intento) || (intento.datos ?? []).length === 0).toBe(
      true,
    );

    const sigue = await leer(marcela, `deposito?select=codigo&id=eq.${deposito}`);
    expect(sigue.datos[0].codigo).toBe(`${MARCA_PRUEBA} D-99`);
  });
});

describe("el comité de propietarios", () => {
  let miembro = "";

  it("lo nombra la administración", async () => {
    const alta = await insertar(marcela, "comite_propietarios?select=id", {
      condominio_id: CONDOMINIO,
      usuario_id: guillermo.usuarioId,
    });

    expect(alta.estado).toBe(201);
    miembro = apuntar("comite_propietarios", alta) ?? "";
  });

  it("y un vecino no se nombra a sí mismo", async () => {
    // El caso que importa: pertenecer al comité da voz en el edificio, así que
    // no puede ser algo que uno se conceda.
    const intento = await insertar(sofia, "comite_propietarios", {
      condominio_id: CONDOMINIO,
      usuario_id: sofia.usuarioId,
    });

    expect(fueRechazada(intento)).toBe(true);
  });

  it("pero sí ve quién está en él", async () => {
    // El control positivo. Un comité secreto no sería un comité.
    const visto = await leer(
      sofia,
      `comite_propietarios?select=id&id=eq.${miembro}`,
    );

    expect(visto.datos ?? []).toHaveLength(1);
  });
});

describe("las fechas especiales de una zona", () => {
  let fecha = "";
  let zona = "";

  it("las pone la administración sobre su zona", async () => {
    const zonas = await leer<Array<{ id: string }>>(
      marcela,
      "zona_comun?select=id&limit=1",
    );
    zona = zonas.datos[0].id;

    const alta = await insertar(marcela, "zona_fecha_especial?select=id", {
      zona_id: zona,
      fecha: "2027-12-25",
      tipo: "cerrada",
    });

    expect(alta.estado).toBe(201);
    fecha = apuntar("zona_fecha_especial", alta) ?? "";
  });

  it("y un vecino las ve --para saber que ese día está cerrada-- sin poder ponerlas", async () => {
    const vistas = await leer(
      guillermo,
      `zona_fecha_especial?select=id&id=eq.${fecha}`,
    );
    expect(vistas.datos ?? []).toHaveLength(1);

    const intento = await insertar(guillermo, "zona_fecha_especial", {
      zona_id: zona,
      fecha: "2027-12-26",
      tipo: "cerrada",
    });
    expect(fueRechazada(intento)).toBe(true);
  });
});

describe("la cronología de una visita", () => {
  /*
    `visita_evento` es la más delicada de las cinco: guarda los pasos de una
    visita --preregistro enviado, documentación completa, verificación
    aprobada, reporte de entrada y de salida-- y su política delega entera en
    `puede_ver_visita`.

    Si esa función fallara, se filtraría el historial de quién entró y salió de
    una vivienda ajena. Hoy la tabla está vacía, así que no hay nada que
    filtrar; esto existe para que el día que se llene ya esté comprobado.
  */
  let visita = "";
  let invitado = "";
  let evento = "";

  it("se apunta sobre un invitado de una visita", async () => {
    const altaVisita = await insertar(guardia, "visita?select=id", {
      condominio_id: CONDOMINIO,
      unidad_id: UNIDAD.u101,
      tipo: "amigos",
      estado: "programada",
      fecha_desde: "2027-11-02",
      registrada_por: guardia.usuarioId,
    });
    expect(altaVisita.estado).toBe(201);
    visita = apuntar("visita", altaVisita) ?? "";

    const altaInvitado = await insertar(guardia, "invitado?select=id", {
      visita_id: visita,
      orden: 0,
      nombre: `${MARCA_PRUEBA} Cronología`,
    });
    expect(altaInvitado.estado).toBe(201);
    invitado = apuntar("invitado", altaInvitado) ?? "";

    const alta = await insertar(guardia, "visita_evento?select=id", {
      invitado_id: invitado,
      paso: "reporte_entrada",
      actor_id: guardia.usuarioId,
    });
    expect(alta.estado).toBe(201);
    evento = apuntar("visita_evento", alta) ?? "";
  });

  it("la ve quien puede ver la visita", async () => {
    // Guillermo es el propietario de la 101, que es a donde va la visita.
    const suya = await leer(
      guillermo,
      `visita_evento?select=id&id=eq.${evento}`,
    );

    expect(suya.datos ?? []).toHaveLength(1);
  });

  it("y no la ve quien no", async () => {
    /*
      El caso que importa, y el que no se podía comprobar antes: Sofía vive en
      la 102 y esta visita es de la 101. La cronología de quién entró en casa
      de otro no es asunto suyo.
    */
    const ajena = await leer(sofia, `visita_evento?select=id&id=eq.${evento}`);

    expect(ajena.datos ?? []).toHaveLength(0);
  });

  it("ni la puede borrar para tapar un rastro", async () => {
    // Es constancia de quién entró a un edificio: el borrado no es de nadie
    // que no pueda ver la visita, y ni siquiera de quien sí.
    const intento = await api(sofia, `/rest/v1/visita_evento?id=eq.${evento}`, {
      metodo: "DELETE",
    });

    expect(fueRechazada(intento) || (intento.datos ?? []).length === 0).toBe(
      true,
    );

    const sigue = await leer(
      guillermo,
      `visita_evento?select=id&id=eq.${evento}`,
    );
    expect(sigue.datos ?? []).toHaveLength(1);
  });
});
