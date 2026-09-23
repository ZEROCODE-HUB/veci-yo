import { beforeAll, describe, expect, it } from "vitest";
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
  type Sesion,
} from "./apoyo";

/**
 * Chat, renta corta y adjuntos.
 *
 * Los tres comparten una idea: el dato sale o no sale de la base según quién
 * pregunta. Filtrarlo en la pantalla no serviría, porque cualquiera puede
 * mirar la respuesta de la API.
 */

let guillermo: Sesion;
let sofia: Sesion;
let marcela: Sesion;
let porteria: Sesion;
let hilo101: string;

beforeAll(async () => {
  [guillermo, sofia, marcela, porteria] = await Promise.all([
    entrar(CUENTA.propietario),
    entrar(CUENTA.vecino),
    entrar(CUENTA.admin),
    entrar(CUENTA.guardia),
  ]);

  const existente = await leer(
    guillermo,
    `conversacion?select=id&tipo=eq.area&area=eq.seguridad&unidad_id=eq.${UNIDAD.u101}`,
  );

  if (existente.datos.length) {
    hilo101 = existente.datos[0].id;
  } else {
    const creada = await insertar(guillermo, "conversacion?select=id", {
      condominio_id: CONDOMINIO,
      tipo: "area",
      area: "seguridad",
      unidad_id: UNIDAD.u101,
      creada_por: guillermo.usuarioId,
    });
    hilo101 = creada.datos[0].id;
  }
});

describe("Chat con la portería", () => {
  it("lo leen la vivienda y la portería, no el resto del edificio", async () => {
    const deLaVivienda = await leer(
      guillermo,
      `mensaje?select=id&conversacion_id=eq.${hilo101}`,
    );
    expect(deLaVivienda.estado).toBe(200);

    const deLaPorteria = await leer(
      porteria,
      `mensaje?select=id&conversacion_id=eq.${hilo101}`,
    );
    expect(deLaPorteria.estado).toBe(200);

    // Sofía vive en la 102: el hilo de la 101 no es suyo.
    const deUnaVecina = await leer(
      sofia,
      `mensaje?select=id&conversacion_id=eq.${hilo101}`,
    );
    expect(deUnaVecina.datos).toHaveLength(0);
  });

  it("una vecina no puede escribir en el hilo de otra vivienda", async () => {
    const intento = await insertar(sofia, "mensaje", {
      conversacion_id: hilo101,
      autor_id: sofia.usuarioId,
      autor_nombre: "Sofia Martinez",
      texto: "No deberia entrar",
    });
    expect(fueRechazada(intento)).toBe(true);
  });

  it("nadie firma un mensaje con el id de otro", async () => {
    const intento = await insertar(guillermo, "mensaje", {
      conversacion_id: hilo101,
      autor_id: porteria.usuarioId,
      autor_nombre: "Roberto Hornado",
      texto: "Suplantacion",
    });
    expect(fueRechazada(intento)).toBe(true);
  });

  it("un residente no crea grupos del edificio; la administración sí", async () => {
    const porUnResidente = await insertar(guillermo, "conversacion", {
      condominio_id: CONDOMINIO,
      tipo: "grupo",
      ambito: "residentes",
      nombre: "Grupo no autorizado",
      creada_por: guillermo.usuarioId,
    });
    expect(fueRechazada(porUnResidente)).toBe(true);
  });

  it("el grupo de residentes no lo ve la portería, que no vive aquí", async () => {
    const deLaPorteria = await leer(
      porteria,
      "conversacion?select=id&tipo=eq.grupo&ambito=eq.residentes",
    );
    expect(deLaPorteria.datos).toHaveLength(0);

    const deUnResidente = await leer(
      guillermo,
      "conversacion?select=id&tipo=eq.grupo&ambito=eq.residentes",
    );
    expect(deUnResidente.datos.length).toBeGreaterThan(0);
  });
});

describe("Renta corta", () => {
  it("oculta el número y el teléfono de quien lo pidió, salvo a los suyos", async () => {
    // Guillermo es un vecino cualquiera respecto de la 102.
    const comoVecino = await rpc(guillermo, "unidades_renta_corta", {
      p_condominio_id: CONDOMINIO,
      p_como_personal: false,
    });
    const ocultas = comoVecino.datos.filter((f: any) => f.codigo === null);
    expect(ocultas.length).toBeGreaterThan(0);
    for (const fila of ocultas) {
      expect(fila.anfitrion_tel).toBeNull();
    }

    // Sofía es la dueña de esa vivienda: ve lo suyo con el rol que sea.
    const comoDuena = await rpc(sofia, "unidades_renta_corta", {
      p_condominio_id: CONDOMINIO,
      p_como_personal: false,
    });
    const suya = comoDuena.datos.find((f: any) => f.codigo === "102");
    expect(suya).toBeDefined();
    expect(suya.anfitrion_tel).not.toBeNull();
  });

  it("el ámbito lo declara la consulta: pedir menos devuelve menos", async () => {
    // Marcela administra el condominio. Entrando como propietaria no debe ver
    // el contacto de sus vecinos (R-24).
    const comoPropietaria = await rpc(marcela, "unidades_renta_corta", {
      p_condominio_id: CONDOMINIO,
      p_como_personal: false,
    });
    const comoAdministradora = await rpc(marcela, "unidades_renta_corta", {
      p_condominio_id: CONDOMINIO,
      p_como_personal: true,
    });

    const ocultasComoPropietaria = comoPropietaria.datos.filter(
      (f: any) => f.codigo === null,
    ).length;
    const ocultasComoAdmin = comoAdministradora.datos.filter(
      (f: any) => f.codigo === null,
    ).length;

    expect(ocultasComoPropietaria).toBeGreaterThan(0);
    expect(ocultasComoAdmin).toBe(0);
  });

  it("pedir el ámbito de personal sin serlo no concede nada", async () => {
    const mintiendo = await rpc(guillermo, "unidades_renta_corta", {
      p_condominio_id: CONDOMINIO,
      p_como_personal: true,
    });
    // Sigue sin ver la unidad que pidió ocultarse.
    expect(mintiendo.datos.some((f: any) => f.codigo === null)).toBe(true);
  });
});

describe("Adjuntos de PQRS", () => {
  it("no se puede colgar un archivo de una PQRS que no se ve", async () => {
    const deGuillermo = await leer(guillermo, "reclamo?select=id&limit=1");
    const reclamoId = deGuillermo.datos[0].id;

    const intento = await insertar(sofia, "adjunto_reclamo", {
      reclamo_id: reclamoId,
      ruta: `${reclamoId}/intruso.png`,
      nombre_original: "intruso.png",
      tipo_mime: "image/png",
      subido_por: sofia.usuarioId,
    });
    expect(fueRechazada(intento)).toBe(true);
  });
});

describe("Llamadas", () => {
  it("el historial es de quien llama: la administración no lo lee", async () => {
    const registro = await insertar(guillermo, "llamada?select=id", {
      condominio_id: CONDOMINIO,
      de_usuario: guillermo.usuarioId,
      a_nombre: "Seguridad",
      tipo: "saliente",
      duracion_segundos: 65,
    });
    expect(registro.estado).toBe(201);

    const deLaAdmin = await leer(
      marcela,
      `llamada?select=id&de_usuario=eq.${guillermo.usuarioId}`,
    );
    expect(deLaAdmin.datos).toHaveLength(0);
  });

  it("una llamada perdida no puede tener duración", async () => {
    const intento = await insertar(guillermo, "llamada", {
      condominio_id: CONDOMINIO,
      de_usuario: guillermo.usuarioId,
      a_nombre: "Seguridad",
      tipo: "perdida",
      duracion_segundos: 30,
    });
    expect(fueRechazada(intento)).toBe(true);
    expect(intento.mensaje).toContain("llamada_perdida_sin_duracion");
  });
});

describe("Vehiculos de residentes", () => {
  it("los registra quien vive en la unidad y los lee la porteria", async () => {
    const placa = `TST${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const alta = await insertar(guillermo, "vehiculo_residente?select=id,placa", {
      unidad_id: UNIDAD.u101,
      placa,
      tipo: "auto",
      registrado_por: guillermo.usuarioId,
    });
    expect(alta.estado).toBe(201);

    // La porteria necesita distinguir la placa de un residente de la de una
    // visita, asi que las lee.
    const vistoPorPorteria = await leer(
      porteria,
      `vehiculo_residente?select=id&placa=eq.${placa}`,
    );
    expect(vistoPorPorteria.datos).toHaveLength(1);

    // Pero no las cambia.
    const intentoPorteria = await insertar(porteria, "vehiculo_residente", {
      unidad_id: UNIDAD.u101,
      placa: `${placa}X`,
      tipo: "auto",
    });
    expect(fueRechazada(intentoPorteria)).toBe(true);
  });

  it("una vecina no registra vehiculos en la vivienda de otro", async () => {
    const intento = await insertar(sofia, "vehiculo_residente", {
      unidad_id: UNIDAD.u101,
      placa: `AJN${Date.now().toString().slice(-4)}`,
      tipo: "auto",
    });
    expect(fueRechazada(intento)).toBe(true);
  });

  it("la placa se compara sin espacios ni guiones", async () => {
    const sufijo = Math.random().toString(36).slice(2, 8).toUpperCase();

    const primera = await insertar(guillermo, "vehiculo_residente?select=id", {
      unidad_id: UNIDAD.u101,
      placa: `NRM${sufijo}`,
      tipo: "auto",
    });
    expect(primera.estado).toBe(201);

    // La misma placa escrita de otra forma es la misma placa: si no, dos
    // viviendas podrian declarar el mismo coche sin que la base lo notara.
    const conGuion = await insertar(guillermo, "vehiculo_residente", {
      unidad_id: UNIDAD.u205,
      placa: `nrm-${sufijo}`,
      tipo: "auto",
    });
    expect(conGuion.estado).toBe(409);

    await api(guillermo, `/rest/v1/vehiculo_residente?id=eq.${primera.datos[0].id}`, {
      metodo: "DELETE",
    });
  });

  it("la porteria encuentra una placa este donde este", async () => {
    const sufijo = Math.random().toString(36).slice(2, 8).toUpperCase();
    const placa = `BSQ${sufijo}`;

    const alta = await insertar(guillermo, "vehiculo_residente?select=id", {
      unidad_id: UNIDAD.u101,
      placa,
      tipo: "auto",
    });

    // Se busca con otro formato a proposito.
    const encontrado = await rpc(porteria, "buscar_placa", {
      p_condominio_id: CONDOMINIO,
      p_placa: `bsq-${sufijo}`,
    });
    expect(encontrado.datos.length).toBeGreaterThan(0);
    expect(encontrado.datos[0].procedencia).toBe("residente");

    // Un vecino cualquiera no puede saber que coche tiene cada vivienda.
    const porUnVecino = await rpc(sofia, "buscar_placa", {
      p_condominio_id: CONDOMINIO,
      p_placa: `bsq-${sufijo}`,
    });
    expect(porUnVecino.datos).toHaveLength(0);

    await api(guillermo, `/rest/v1/vehiculo_residente?id=eq.${alta.datos[0].id}`, {
      metodo: "DELETE",
    });
  });

  it("una placa no puede estar en dos viviendas", async () => {
    /*
      La placa salía de `Date.now().toString().slice(-4)`, que se repite cada
      diez segundos, y el vehículo no se borraba nunca: **ciento noventa y tres
      matrículas de prueba** acumuladas en la base, y de vez en cuando la
      primera inserción chocaba con la de una corrida anterior. Pasaba en
      solitario y fallaba en la suite, que es la forma más incómoda de fallar.
    */
    const placa = `DUP${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const creados: string[] = [];

    const primera = await insertar(guillermo, "vehiculo_residente?select=id", {
      unidad_id: UNIDAD.u101,
      placa,
      tipo: "auto",
    });
    expect(primera.estado).toBe(201);
    creados.push(primera.datos[0].id);

    const repetida = await insertar(guillermo, "vehiculo_residente", {
      unidad_id: UNIDAD.u205,
      placa,
      tipo: "camioneta",
    });
    expect(repetida.estado).toBe(409);

    for (const id of creados) {
      await api(guillermo, `/rest/v1/vehiculo_residente?id=eq.${id}`, {
        metodo: "DELETE",
      });
    }
  });
});

describe("el chat con la portería es con la portería", () => {
  /*
    D-13, decidido: la administración **no** lee los chats de un residente con
    la portería. El prototipo lo dice en la propia pantalla del chat —"el
    mensaje será visible para todo el personal de seguridad de turno"— y habla
    de seguridad, no de administración.

    La condición era `es_personal_condominio`, que incluye a administrador y
    coadministrador: Marcela leía todos los hilos de todas las viviendas con la
    garita.
  */
  it("la portería lo ve", async () => {
    const guardia = await entrar(CUENTA.guardia);

    const hilos = await leer(
      guardia,
      "conversacion?select=id,area&tipo=eq.area&area=eq.seguridad",
    );
    expect(hilos.datos.length).toBeGreaterThan(0);
  });

  it("la vivienda lo ve, que es de quien es", async () => {
    const guillermo = await entrar(CUENTA.propietario);

    const hilos = await leer(
      guillermo,
      `conversacion?select=id&tipo=eq.area&area=eq.seguridad&unidad_id=eq.${UNIDAD.u101}`,
    );
    expect(hilos.datos.length).toBeGreaterThan(0);
  });

  it("**la administración no**", async () => {
    const marcela = await entrar(CUENTA.admin);

    // La 101 no es suya: Marcela vive en la 301.
    const ajeno = await leer(
      marcela,
      `conversacion?select=id&tipo=eq.area&area=eq.seguridad&unidad_id=eq.${UNIDAD.u101}`,
    );
    expect(ajeno.datos).toHaveLength(0);
  });

  it("pero sí su propio hilo de administración", async () => {
    /*
      Control positivo: lo que se cierra es el hilo con la garita, no el chat.

      El hilo se reutiliza si ya existe. La primera versión lo creaba y lo
      borraba al terminar, pero `conversacion` **no tiene política de DELETE**
      —un hilo de chat no se borra, y eso está bien—, así que aquel borrado era
      un no-op silencioso: la prueba pasaba una vez y devolvía 409 a partir de
      la segunda.
    */
    const marcela = await entrar(CUENTA.admin);
    const filtro =
      `conversacion?select=id&tipo=eq.area&area=eq.administracion` +
      `&unidad_id=eq.${UNIDAD.u301}`;

    const existente = await leer(marcela, filtro);
    if (existente.datos.length === 0) {
      const abierto = await insertar(marcela, "conversacion?select=id", {
        condominio_id: CONDOMINIO,
        tipo: "area",
        area: "administracion",
        unidad_id: UNIDAD.u301,
        creada_por: marcela.usuarioId,
      });
      expect(abierto.estado).toBe(201);
    }

    const propios = await leer(marcela, filtro);
    expect(propios.datos).toHaveLength(1);
  });
});
