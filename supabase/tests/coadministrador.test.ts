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
  rpc,
  UNIDAD,
  type Sesion,
} from "./apoyo";

/**
 * Los permisos del coadministrador.
 *
 * La pantalla ofrece ocho interruptores con su descripción y los guarda en
 * `membresia_condominio.permisos`, un `jsonb`. **No los miraba nadie**: se
 * enumeraron las 104 políticas y las 73 funciones y salía cero.
 *
 * Y lo de detrás era peor que un interruptor decorativo, porque
 * `es_admin_condominio` incluye al coadministrador y esa función sostiene
 * **31 políticas**: dar de alta a alguien como coadministrador con un solo
 * permiso marcado le concedía la administración completa del edificio.
 *
 * Era la séptima vez que aparece la misma forma —la decisión vive en la
 * pantalla y no en el dato— pero esta vivía en un `jsonb`, así que la
 * enumeración de columnas booleanas no podía verla.
 */

let marcela: Sesion;
let coadmin: Sesion;

/** La membresía de coadministrador que crean estas pruebas. */
let membresiaId = "";

/**
 * El paquete que crean estas pruebas, y por qué lo crean.
 *
 * Los casos de correspondencia leían **lo que hubiera** en la base, y hoy no
 * hay ninguna: cero filas. Así que el lado positivo --«con el permiso sí la
 * ve»-- fallaba, y el negativo --«sin el permiso no ve nada»-- pasaba por la
 * razón equivocada: sin datos se cumple igual con la política abierta de par
 * en par.
 *
 * Es exactamente lo que dice AGENTS.md sobre los casos negativos: hay que
 * pedir X explícitamente y tener al lado un control positivo. Ahora la prueba
 * se trae su propio paquete y no depende de que nadie lo haya dejado ahí.
 */
let paqueteId = "";

async function permisos(valores: Record<string, boolean>) {
  const respuesta = await api(
    marcela,
    `/rest/v1/membresia_condominio?id=eq.${membresiaId}`,
    { metodo: "PATCH", cuerpo: { permisos: valores } },
  );
  expect(respuesta.estado).toBe(200);
}

beforeAll(async () => {
  [marcela, coadmin] = await Promise.all([
    entrar(CUENTA.admin),
    entrar(CUENTA.propietarioNuevo),
  ]);

  await api(
    marcela,
    `/rest/v1/membresia_condominio?usuario_id=eq.${coadmin.usuarioId}`,
    { metodo: "DELETE" },
  );

  const alta = await insertar(marcela, "membresia_condominio?select=id", {
    condominio_id: CONDOMINIO,
    usuario_id: coadmin.usuarioId,
    rol: "coadministrador",
    permisos: {},
  });
  expect(alta.estado).toBe(201);
  membresiaId = alta.datos[0].id;

  const paquete = await insertar(marcela, "correspondencia?select=id", {
    condominio_id: CONDOMINIO,
    unidad_id: UNIDAD.u101,
    // `en_porteria`, que es uno de los tres del enum --`no_recibido`,
    // `en_porteria`, `entregado`--: «pendiente» no existe y la base devolvia
    // un 400 que la prueba se comia sin decir cual era el campo malo.
    estado: "en_porteria",
    categoria: "paqueteria",
    entrega_en_puerta: false,
    empresa: `${MARCA_PRUEBA} DHL`,
  });
  expect(paquete.estado).toBe(201);
  paqueteId = paquete.datos[0].id;
});

afterAll(async () => {
  if (paqueteId) {
    await api(marcela, `/rest/v1/correspondencia?id=eq.${paqueteId}`, {
      metodo: "DELETE",
    });
  }
  await api(
    marcela,
    `/rest/v1/porteria?nombre=like.${encodeURIComponent(MARCA_PRUEBA + "%")}`,
    { metodo: "DELETE" },
  );
  await api(marcela, `/rest/v1/membresia_condominio?id=eq.${membresiaId}`, {
    metodo: "DELETE",
  });
});

describe("gestionar seguridad", () => {
  it("con el permiso puesto, crea una portería", async () => {
    await permisos({ modificarSeguridad: true });

    const alta = await insertar(coadmin, "porteria?select=id", {
      condominio_id: CONDOMINIO,
      nombre: `${MARCA_PRUEBA} garita`,
      tipo: "entrada_principal",
    });
    expect(alta.estado).toBe(201);

    await api(marcela, `/rest/v1/porteria?id=eq.${alta.datos[0].id}`, {
      metodo: "DELETE",
    });
  });

  it("sin el permiso, no", async () => {
    await permisos({ modificarSeguridad: false });

    const intento = await api(coadmin, "/rest/v1/porteria", {
      metodo: "POST",
      prefer: "return=minimal",
      cuerpo: {
        condominio_id: CONDOMINIO,
        nombre: `${MARCA_PRUEBA} sin permiso`,
        tipo: "entrada_principal",
      },
    });
    expect(fueRechazada(intento)).toBe(true);

    const existe = await leer(
      marcela,
      `porteria?nombre=like.${encodeURIComponent(MARCA_PRUEBA + " sin permiso")}&select=id`,
    );
    expect(existe.datos).toHaveLength(0);
  });

  it("y tampoco toca los turnos de nadie", async () => {
    await permisos({ modificarSeguridad: false });

    const guardia = await leer(
      marcela,
      `membresia_condominio?rol=eq.guardia&condominio_id=eq.${CONDOMINIO}&select=id`,
    );
    const intento = await api(coadmin, "/rest/v1/turno_guardia", {
      metodo: "POST",
      prefer: "return=minimal",
      cuerpo: {
        membresia_id: guardia.datos[0].id,
        dia_semana: 0,
        hora_inicio: "01:00",
        hora_fin: "02:00",
      },
    });
    expect(fueRechazada(intento)).toBe(true);
  });
});

describe("gestionar residentes", () => {
  it("sin el permiso no invita a una vivienda", async () => {
    await permisos({ actualizarResidentes: false });

    const intento = await rpc(coadmin, "crear_invitacion", {
      p_condominio_id: CONDOMINIO,
      p_ambito: "unidad",
      p_correo: CUENTA.invitadoNuevo,
      p_nombre: `${MARCA_PRUEBA} sin permiso`,
      p_unidad_id: UNIDAD.u101,
      p_rol_unidad: "residente",
    });
    expect(fueRechazada(intento)).toBe(true);
  });

  it("con el permiso, sí", async () => {
    await permisos({ actualizarResidentes: true });

    const creada = await rpc(coadmin, "crear_invitacion", {
      p_condominio_id: CONDOMINIO,
      p_ambito: "unidad",
      p_correo: CUENTA.invitadoNuevo,
      p_nombre: `${MARCA_PRUEBA} con permiso`,
      p_unidad_id: UNIDAD.u101,
      p_rol_unidad: "residente",
    });
    expect(creada.estado).toBe(200);

    await api(
      marcela,
      `/rest/v1/invitacion?id=eq.${creada.datos[0].invitacion_id}`,
      { metodo: "PATCH", cuerpo: { estado: "revocada" } },
    );
  });
});

describe("lo que el permiso no alcanza", () => {
  it("sin ningún permiso, sigue viendo el edificio", async () => {
    /*
      El control positivo: un coadministrador sin permisos **no** queda fuera
      del panel. Lo que se sujeta es lo que escribe, no lo que ve; si esta
      prueba se pusiera roja, el cambio habría dejado a alguien sin su propia
      pantalla.
    */
    await permisos({
      modificarSeguridad: false,
      actualizarResidentes: false,
      contestarChat: false,
      modificarCuadroHonor: false,
    });

    const torres = await leer(coadmin, "torre?select=id");
    expect(torres.datos.length).toBeGreaterThan(0);

    const porterias = await leer(coadmin, "porteria?select=id");
    expect(porterias.datos.length).toBeGreaterThan(0);
  });

  it("una clave ausente no quita nada", async () => {
    /*
      Las membresías que ya existen tienen `permisos = {}`. Si eso valiera
      "prohibido", la migración habría dejado a los coadministradores de un
      edificio real sin su panel de un día para otro.
    */
    await permisos({});

    const alta = await insertar(coadmin, "porteria?select=id", {
      condominio_id: CONDOMINIO,
      nombre: `${MARCA_PRUEBA} clave ausente`,
      tipo: "entrada_principal",
    });
    expect(alta.estado).toBe(201);

    await api(marcela, `/rest/v1/porteria?id=eq.${alta.datos[0].id}`, {
      metodo: "DELETE",
    });
  });

  it("la administración no se ve afectada por ningún permiso", async () => {
    // Marcela es administradora: `puede_coadmin` le dice que sí a todo.
    const puede = await rpc(marcela, "puede_coadmin", {
      p_condominio_id: CONDOMINIO,
      p_clave: "modificarSeguridad",
    });
    expect(puede.datos).toBe(true);
  });
});

/**
 * Los cuatro permisos de solo lectura (R-113).
 *
 * La pantalla no deja dudas de lo que significan —"Acceso de solo lectura a
 * TODAS las visitas", "Ver TODA la paquetería del edificio"—, y ninguno de los
 * cuatro estaba implementado: un coadministrador con los cuatro apagados veía
 * el edificio entero igual que el administrador.
 *
 * Cada caso pide la vista de edificio **explícitamente** y la compara consigo
 * misma con el permiso puesto. Comprobar solo "veo lo mío" pasaría también con
 * la política abierta de par en par.
 */
describe("lo que ve un coadministrador", () => {
  it("sin `visualizarVisitas` no ve las visitas del edificio", async () => {
    await permisos({ visualizarVisitas: false });
    const sin = await leer(coadmin, "visita?select=id");
    expect(sin.datos).toHaveLength(0);

    await permisos({ visualizarVisitas: true });
    const con = await leer(coadmin, "visita?select=id");
    expect(con.datos.length).toBeGreaterThan(0);
  });

  it("sin `visualizarCorrespondencia` no ve la paquetería del edificio", async () => {
    await permisos({ visualizarCorrespondencia: false });
    const sin = await leer(coadmin, "correspondencia?select=id");
    expect(sin.datos).toHaveLength(0);

    await permisos({ visualizarCorrespondencia: true });
    const con = await leer(coadmin, "correspondencia?select=id");
    expect(con.datos.length).toBeGreaterThan(0);
  });

  it("sin `visualizarZonasComunes` no ve las reservas del edificio", async () => {
    await permisos({ visualizarZonasComunes: false });
    const sin = await leer(coadmin, "reserva_zona?select=id");
    expect(sin.datos).toHaveLength(0);

    await permisos({ visualizarZonasComunes: true });
    const con = await leer(coadmin, "reserva_zona?select=id");
    expect(con.datos.length).toBeGreaterThan(0);
  });

  it("sin `visualizarEncuestas` no ve los anuncios ni las encuestas", async () => {
    await permisos({ visualizarEncuestas: false });
    const sin = await leer(coadmin, "publicacion?select=id");
    expect(sin.datos).toHaveLength(0);

    await permisos({ visualizarEncuestas: true });
    const con = await leer(coadmin, "publicacion?select=id");
    expect(con.datos.length).toBeGreaterThan(0);
  });

  it("sin `visualizarEncuestas` tampoco ve las opciones ni el recuento", async () => {
    /*
      Recortar `publicacion_lectura` no bastaba: el enunciado de una encuesta
      está también en `opcion_voto`, cuya política pregunta por
      `puede_ver_publicacion`, y esa función decía `es_personal_condominio`.
      El coadministrador no veía la publicación pero sí sus opciones —"¿Aprobar
      la cuota extraordinaria?"— y, por `resultados_publicacion`, el recuento.
    */
    await permisos({ visualizarEncuestas: false });
    const sin = await leer(coadmin, "opcion_voto?select=id");
    expect(sin.datos).toHaveLength(0);

    await permisos({ visualizarEncuestas: true });
    const con = await leer(coadmin, "opcion_voto?select=id");
    expect(con.datos.length).toBeGreaterThan(0);
  });

  it("la portería sigue viendo las visitas y la paquetería del edificio", async () => {
    /*
      El otro lado del recorte: `visita_lectura` y `correspondencia_lectura`
      dejaban pasar a `es_personal_condominio`, que incluye a la
      administración y a la portería a la vez. Al separarlas, la garita tenía
      que quedarse dentro —es quien registra el paquete y anota la visita—.
    */
    const guardia = await entrar(CUENTA.guardia);

    const visitas = await leer(guardia, "visita?select=id");
    expect(visitas.datos.length).toBeGreaterThan(0);

    const paquetes = await leer(guardia, "correspondencia?select=id");
    expect(paquetes.datos.length).toBeGreaterThan(0);
  });
});

/**
 * El permiso recorta lo que el coadministrador ve **como administración**,
 * nunca lo suyo.
 *
 * Guillermo es propietario de la 101 y la 205. Si además se le nombra
 * coadministrador con los cuatro permisos de lectura apagados, tiene que
 * seguir viendo sus propias visitas, sus paquetes y sus reservas: un permiso
 * que le quitara eso sería un error, no una restricción.
 */
describe("el permiso no le quita lo suyo", () => {
  let guillermo: Sesion;
  let membresiaGuillermo = "";

  beforeAll(async () => {
    guillermo = await entrar(CUENTA.propietario);

    await api(
      marcela,
      `/rest/v1/membresia_condominio?usuario_id=eq.${guillermo.usuarioId}`,
      { metodo: "DELETE" },
    );

    const alta = await insertar(marcela, "membresia_condominio?select=id", {
      condominio_id: CONDOMINIO,
      usuario_id: guillermo.usuarioId,
      rol: "coadministrador",
      permisos: {
        visualizarVisitas: false,
        visualizarCorrespondencia: false,
        visualizarZonasComunes: false,
        visualizarEncuestas: false,
      },
    });
    expect(alta.estado).toBe(201);
    membresiaGuillermo = alta.datos[0].id;
  });

  afterAll(async () => {
    await api(
      marcela,
      `/rest/v1/membresia_condominio?id=eq.${membresiaGuillermo}`,
      { metodo: "DELETE" },
    );
  });

  it("sigue viendo las visitas de sus viviendas", async () => {
    const suyas = await leer(
      guillermo,
      `visita?unidad_id=eq.${UNIDAD.u205}&select=id`,
    );
    expect(suyas.datos.length).toBeGreaterThan(0);
  });

  it("sigue viendo su propia correspondencia", async () => {
    const suya = await leer(
      guillermo,
      `correspondencia?unidad_id=in.(${UNIDAD.u101},${UNIDAD.u205})&select=id`,
    );
    expect(suya.datos.length).toBeGreaterThan(0);
  });

  it("sigue viendo sus reservas y los anuncios dirigidos a él", async () => {
    const reservas = await leer(
      guillermo,
      `reserva_zona?unidad_id=in.(${UNIDAD.u101},${UNIDAD.u205})&select=id`,
    );
    expect(reservas.datos.length).toBeGreaterThan(0);

    const anuncios = await leer(guillermo, "publicacion?select=id");
    expect(anuncios.datos.length).toBeGreaterThan(0);
  });

  it("pero no ve las visitas de las viviendas ajenas", async () => {
    // El control negativo al lado del positivo: lo suyo sí, lo del vecino no.
    const ajenas = await leer(
      guillermo,
      `visita?unidad_id=eq.${UNIDAD.u102}&select=id`,
    );
    expect(ajenas.datos).toHaveLength(0);
  });
});
