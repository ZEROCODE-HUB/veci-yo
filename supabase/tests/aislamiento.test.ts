import { describe, expect, it } from "vitest";
import {
  api,
  CLAVE_SERVICIO,
  CONDOMINIO,
  CUENTA,
  UNIDAD,
  entrar,
  fueRechazada,
  insertar,
  leer,
  rpc,
  URL,
} from "./apoyo";

/**
 * Aislamiento entre viviendas.
 *
 * Es el requisito de seguridad central del producto: un vecino no ve los
 * asuntos de la casa de al lado. Todo se comprueba contra las políticas reales
 * tal como las aplica PostgREST, no contra una imitación.
 */

describe("PQRS", () => {
  /**
   * Los titulos llevan la marca `[prueba]`, y esa es toda la limpieza.
   *
   * Una PQRS no se puede borrar --no hay politica de DELETE-- y eso es
   * correcto: si la administracion pudiera borrarlas, podria borrar una queja
   * en su contra. De ahi salio la conclusion de que la suite no podia limpiar
   * detras de si y habria que purgar con SQL antes de produccion.
   *
   * Era falso. `limpieza-global` borra con la clave de servicio, que no pasa
   * por RLS: ya barria `reclamo` desde el primer dia. Lo que fallaba es que
   * estos titulos no llevaban la marca que el barrido busca, asi que pasaban
   * de largo. Sin ella se habian acumulado **252 filas** --126 de cada uno-- en
   * la base del cliente, creciendo dos por corrida.
   *
   * La garantia del dominio se queda como esta; lo que cambia es el nombre de
   * lo que la prueba crea.
   */

  it("la abre quien la firma, y nadie puede firmar por otro", async () => {
    const guillermo = await entrar(CUENTA.propietario);
    const marcela = await entrar(CUENTA.admin);

    const propia = await insertar(guillermo, "reclamo?select=numero", {
      condominio_id: CONDOMINIO,
      unidad_id: UNIDAD.u101,
      creado_por: guillermo.usuarioId,
      creado_por_nombre: "Guillermo Provenzano",
      titulo: "[prueba] Prueba de firma propia",
      descripcion: "Alta normal.",
      area: "condominio",
      tipo: "consulta",
    });
    expect(propia.estado).toBe(201);

    const ajena = await insertar(guillermo, "reclamo", {
      condominio_id: CONDOMINIO,
      unidad_id: UNIDAD.u101,
      creado_por: marcela.usuarioId,
      creado_por_nombre: "Marcela Sierra",
      titulo: "[prueba] Suplantación",
      descripcion: "Firmada con el id de otra persona.",
      area: "condominio",
      tipo: "consulta",
    });
    expect(fueRechazada(ajena)).toBe(true);
  });

  it("un vecino no ve las de otro; la administración sí", async () => {
    const guillermo = await entrar(CUENTA.propietario);
    const sofia = await entrar(CUENTA.vecino);
    const marcela = await entrar(CUENTA.admin);

    const deGuillermo = await leer(guillermo, "reclamo?select=id,creado_por");
    expect(deGuillermo.datos.length).toBeGreaterThan(0);
    // Todas las que ve son suyas.
    for (const fila of deGuillermo.datos) {
      expect(fila.creado_por).toBe(guillermo.usuarioId);
    }

    const deSofia = await leer(sofia, "reclamo?select=id&creado_por=neq." + sofia.usuarioId);
    expect(deSofia.datos).toHaveLength(0);

    const deLaAdmin = await leer(marcela, "reclamo?select=id");
    expect(deLaAdmin.datos.length).toBeGreaterThanOrEqual(deGuillermo.datos.length);
  });

  it("el modelo de dispositivo solo se acepta en el área de la aplicación", async () => {
    const guillermo = await entrar(CUENTA.propietario);
    const base = {
      condominio_id: CONDOMINIO,
      unidad_id: UNIDAD.u101,
      creado_por: guillermo.usuarioId,
      creado_por_nombre: "Guillermo Provenzano",
      titulo: "[prueba] Modelo fuera de sitio",
      descripcion: "Debe rechazarse.",
      modelo_dispositivo: "iPhone 15",
    };

    const enCondominio = await insertar(guillermo, "reclamo", {
      ...base,
      area: "condominio",
      tipo: "consulta",
    });
    expect(fueRechazada(enCondominio)).toBe(true);
    expect(enCondominio.mensaje).toContain("reclamo_modelo_solo_para_app");

    const enAplicacion = await insertar(guillermo, "reclamo?select=numero", {
      ...base,
      area: "aplicacion",
      tipo: "soporte",
    });
    expect(enAplicacion.estado).toBe(201);
  });

  it("resolver exige decir quién la resolvió y cuándo", async () => {
    const guillermo = await entrar(CUENTA.propietario);
    const marcela = await entrar(CUENTA.admin);

    /*
      La PQRS se la trae el caso. Antes tomaba `limit=1` --«la primera que
      haya»-- y eso la hacia depender de que la primera estuviera **pendiente**:
      sobre una ya resuelta, que trae su actor y su fecha, poner
      `estado: "resuelto"` no infringe nada y la comprobacion no dispara.

      Llevaba meses en verde por accidente, porque delante iban siempre las 252
      filas que dejaba esta misma suite. Al purgarlas quedo primero un dato de
      verdad --«Fuga en la cocina», resuelta-- y se puso roja. La prueba estaba
      mal desde el primer dia; lo que cambio fue lo que tenia delante.
    */
    const propia = await insertar(guillermo, "reclamo?select=id", {
      condominio_id: CONDOMINIO,
      unidad_id: UNIDAD.u101,
      creado_por: guillermo.usuarioId,
      creado_por_nombre: "Guillermo Provenzano",
      titulo: "[prueba] Resolver sin decir quién",
      descripcion: "Nace pendiente, que es lo que el caso necesita.",
      area: "condominio",
      tipo: "consulta",
    });
    expect(propia.estado).toBe(201);
    const id = propia.datos[0].id;

    const sinActor = await api(marcela, `/rest/v1/reclamo?id=eq.${id}`, {
      metodo: "PATCH",
      cuerpo: { estado: "resuelto" },
    });
    expect(fueRechazada(sinActor)).toBe(true);
    expect(sinActor.mensaje).toContain("reclamo_resuelto_con_actor");
  });
});

describe("Perfiles", () => {
  /**
   * «Datos visibles», que hasta el 30/09/2026 no significaba nada.
   *
   * Cada residente tiene un interruptor que dice si sus datos se ven, la
   * pantalla lo respeta --«👁️ Datos visibles» / «🔒 Datos ocultos»-- y la
   * politica dejaba leer **un solo perfil: el tuyo**. Asi que el interruptor no
   * podia cambiar nada: la tarjeta de Guillermo decia «Datos visibles» y
   * «CI: » vacio, con su cedula guardada.
   *
   * La regla nueva es la que la pantalla promete, y lo que hay que sujetar son
   * sus dos bordes: que se vea lo de quien comparte vivienda **y lo permite**, y
   * que **no** se vea lo de una vivienda ajena. Sin el segundo, «ampliar la
   * lectura» se convierte en abrir el padron del edificio.
   */
  it("quien comparte vivienda ve los datos de quien lo permite", async () => {
    // Laura es inquilina lider de la 205; Guillermo es su propietario.
    const laura = await entrar(CUENTA.laura);
    const guillermo = await entrar(CUENTA.propietario);

    const suyo = await leer(
      laura,
      `perfil?select=id,identificacion&id=eq.${guillermo.usuarioId}`,
    );
    expect(suyo.estado).toBe(200);
    expect(suyo.datos).toHaveLength(1);
    // Y con el dato dentro: ver la fila sin la cedula seria lo mismo que antes.
    expect(suyo.datos[0].identificacion).toBeTruthy();
  });

  it("pero con el interruptor apagado, no", async () => {
    const laura = await entrar(CUENTA.laura);
    const guillermo = await entrar(CUENTA.propietario);

    // Lo apaga el propio Guillermo: `membresia_unidad` deja escribir la suya.
    const membresia = await leer(
      guillermo,
      `membresia_unidad?select=id,datos_visibles&usuario_id=eq.${guillermo.usuarioId}&unidad_id=eq.${UNIDAD.u205}`,
    );
    expect(membresia.datos).toHaveLength(1);
    const fila = membresia.datos[0];

    const apagado = await api(
      guillermo,
      `/rest/v1/membresia_unidad?id=eq.${fila.id}`,
      { metodo: "PATCH", cuerpo: { datos_visibles: false } },
    );
    expect(apagado.estado).toBe(200);
    try {
      const oculto = await leer(
        laura,
        `perfil?select=id&id=eq.${guillermo.usuarioId}`,
      );
      expect(oculto.datos).toHaveLength(0);
    } finally {
      // Se devuelve como estaba, pase lo que pase: es un dato del cliente.
      await api(guillermo, `/rest/v1/membresia_unidad?id=eq.${fila.id}`, {
        metodo: "PATCH",
        cuerpo: { datos_visibles: fila.datos_visibles },
      });
    }
  });

  it("compartir edificio no es compartir casa", async () => {
    /*
      El borde que impide que esto se convierta en el padron del edificio.
      Sofia vive en la 102 y Laura en la 205: no comparten vivienda, asi que
      Laura no ve su perfil aunque Sofia tenga el interruptor encendido.
    */
    /*
      Guillermo vive en la 101 y la 205; Marcela en la 301. No comparten
      ninguna, asi que el no ve su perfil aunque ella tenga el interruptor
      encendido.

      Y no vale cualquier pareja: Laura parecia servir --es de la 205 y Sofia
      de la 102-- pero Laura es **ademas** huesped de la 102, asi que si
      comparten vivienda y el caso pasaba por la razon contraria a la que se
      buscaba. Es el mismo cuidado que pide la regla 8 al elegir con quien se
      prueba.
    */
    const guillermo = await entrar(CUENTA.propietario);
    const marcela = await entrar(CUENTA.admin);

    const ajeno = await leer(
      guillermo,
      `perfil?select=id&id=eq.${marcela.usuarioId}`,
    );
    expect(ajeno.datos).toHaveLength(0);
  });

  it("la porteria si ve a quien tiene delante", async () => {
    // El guardia compara el documento con la persona en la puerta.
    const guardia = await entrar(CUENTA.guardia);
    const sofia = await entrar(CUENTA.vecino);

    const ficha = await leer(
      guardia,
      `perfil?select=id,identificacion&id=eq.${sofia.usuarioId}`,
    );
    expect(ficha.datos).toHaveLength(1);
    expect(ficha.datos[0].identificacion).toBeTruthy();
  });
});

describe("Notificaciones", () => {
  it("la bandeja es privada: nadie lee ni marca la ajena", async () => {
    const marcela = await entrar(CUENTA.admin);
    const guillermo = await entrar(CUENTA.propietario);

    // Control positivo: Marcela tiene bandeja, así que el caso distingue entre
    // "la política funciona" y "no hay nada que ver".
    const suyas = await leer(marcela, "notificacion?select=id,usuario_id");
    expect(suyas.datos.length).toBeGreaterThan(0);
    for (const fila of suyas.datos) {
      expect(fila.usuario_id).toBe(marcela.usuarioId);
    }

    // El control que de verdad prueba la política: alguien que no es Marcela
    // pide explícitamente las de Marcela. Comprobar solo que ella ve las suyas
    // pasaba igual con la política abierta de par en par, porque es la única
    // con notificaciones.
    const ajenas = await leer(
      guillermo,
      `notificacion?select=id&usuario_id=eq.${marcela.usuarioId}`,
    );
    expect(ajenas.datos).toHaveLength(0);

    // Y tampoco puede marcarlas.
    const intento = await api(
      guillermo,
      `/rest/v1/notificacion?usuario_id=eq.${marcela.usuarioId}`,
      { metodo: "PATCH", cuerpo: { leida_en: null } },
    );
    expect(intento.datos).toHaveLength(0);
  });
});

/**
 * Mueve al pasado los reconocimientos que esa persona ya dio este mes.
 *
 * No los borra --en este proyecto no se borra nada-- sino que los fecha en
 * 2020, que para la regla «uno al mes» es lo mismo y deja el dato donde estaba.
 *
 * Hace falta porque desde el 03/10/2026 el limite es uno al mes **por persona**,
 * y los datos sembrados ya traen varios: sin esto, cualquier caso que intente
 * dar uno choca con esa regla y no llega a comprobar la suya.
 */
async function apartarLosDelMes(usuarioId: string) {
  /*
    El primer dia del mes **en UTC**, que es el huso con el que cuenta la base
    --`date_trunc('month', otorgado_en at time zone 'UTC')`--. Con medianoche
    local, en Colombia (UTC-5) el filtro empieza a las 05:00 del dia 1 y se
    deja fuera lo otorgado esa madrugada: el PATCH responde 204, no mueve nada,
    y la prueba choca contra la regla del mes sin motivo aparente.

    Es la hermana de «una prueba que mide con otro reloj se rompe sola una hora
    al dia», con el mes en lugar del dia.
  */
  const ahora = new Date();
  const inicio = new Date(
    Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), 1, 0, 0, 0, 0),
  );

  const cabeceras = {
    apikey: CLAVE_SERVICIO,
    Authorization: `Bearer ${CLAVE_SERVICIO}`,
    "Content-Type": "application/json",
  };

  const filtro =
    `?otorgado_por=eq.${usuarioId}` +
    `&condominio_id=eq.${CONDOMINIO}` +
    // Codificado: una fecha ISO termina en `+00:00` y en una cadena de
    // consulta el `+` significa espacio.
    `&otorgado_en=gte.${encodeURIComponent(inicio.toISOString())}`;

  const pendientes = await fetch(
    `${URL}/rest/v1/reconocimiento${filtro}&select=id`,
    { headers: cabeceras },
  );
  if (!pendientes.ok) {
    throw new Error(`No se pudieron leer los del mes: ${await pendientes.text()}`);
  }
  const filas = (await pendientes.json()) as { id: string }[];

  /*
    Cada una a un mes distinto, derivado de **su propio id**.

    `reconocimiento_unico_por_mes` sigue vigente --es unico por
    `(quien da, quien recibe, insignia, mes)`-- asi que amontonarlas todas en
    el mismo mes choca con el. Y usar la posicion en la lista tampoco sirve:
    la corrida anterior ya dejo una en «la primera posicion», y el segundo
    caso de este mismo archivo vuelve a empezar por cero.

    El id es lo unico estable que distingue una fila de otra, asi que de ahi
    sale el destino: la misma fila cae siempre en el mismo mes --volver a
    apartarla es inocuo-- y dos filas distintas casi nunca coinciden. Si
    coincidieran, el error de abajo lo dice en vez de pasar en silencio.
  */
  for (const fila of filas) {
    const semilla = parseInt(fila.id.replace(/-/g, "").slice(0, 8), 16);
    const destino = new Date(Date.UTC(1900 + (semilla % 100), semilla % 12, 15));
    const movido = await fetch(`${URL}/rest/v1/reconocimiento?id=eq.${fila.id}`, {
      method: "PATCH",
      headers: { ...cabeceras, Prefer: "return=minimal" },
      body: JSON.stringify({ otorgado_en: destino.toISOString() }),
    });

    // Una limpieza que no comprueba si limpio no es una limpieza: ya esta en
    // AGENTS.md y es exactamente lo que fallo al escribir esto.
    if (!movido.ok) {
      throw new Error(
        `No se pudo apartar el reconocimiento ${fila.id}: ${movido.status} ${await movido.text()}`,
      );
    }
  }
}

describe("Reconocimientos", () => {
  it("nadie se reconoce a sí mismo", async () => {
    /*
      El `check` que lo impide sigue ahí, pero desde el 03/10/2026 hay un
      disparador **antes** --uno al mes y solo a vecinos-- y si esta persona ya
      dio el suyo, lo que salta es ese otro. Entonces este caso pasaría en
      verde sin haber comprobado nada de lo que dice comprobar.

      Se le hace sitio: se aparta lo que ya dio este mes, para que el rechazo
      que llegue sea el que interesa.
    */
    const guillermo = await entrar(CUENTA.propietario);
    const insignias = await leer(guillermo, "insignia?select=id&limit=1");
    await apartarLosDelMes(guillermo.usuarioId);

    const propio = await insertar(guillermo, "reconocimiento", {
      insignia_id: insignias.datos[0].id,
      usuario_id: guillermo.usuarioId,
      condominio_id: CONDOMINIO,
      otorgado_por: guillermo.usuarioId,
    });
    expect(fueRechazada(propio)).toBe(true);
    expect(propio.mensaje).toContain("reconocimiento_no_autootorgado");
  });

  it("solo uno al mes, aunque sea otra insignia", async () => {
    /*
      Antes esto comprobaba «no se repite **la misma insignia** a la misma
      persona en el mes», que era la regla de entonces: un indice unico por
      `(quien da, quien recibe, insignia, mes)`. Con ocho insignias en el
      catalogo eso permitia ocho reconocimientos al mismo vecino el mismo mes.

      El cliente lo apreto el 02/10/2026 --«uno al mes»-- asi que la prueba
      cambia con la regla: ahora el segundo se rechaza **aunque sea otra
      insignia**, que es lo que de verdad hay que sujetar.
    */
    const guillermo = await entrar(CUENTA.propietario);
    const sofia = await entrar(CUENTA.vecino);
    const insignias = await leer(guillermo, "insignia?select=id,clave");
    await apartarLosDelMes(guillermo.usuarioId);

    const primero = await insertar(guillermo, "reconocimiento", {
      insignia_id: insignias.datos[0].id,
      usuario_id: sofia.usuarioId,
      condominio_id: CONDOMINIO,
      otorgado_por: guillermo.usuarioId,
      motivo: "Prueba de repeticion",
    });
    expect(primero.estado).toBeLessThan(300);

    // Otra insignia, y a la misma persona: antes pasaba, ahora no.
    const segundo = await insertar(guillermo, "reconocimiento", {
      insignia_id: insignias.datos[1].id,
      usuario_id: sofia.usuarioId,
      condominio_id: CONDOMINIO,
      otorgado_por: guillermo.usuarioId,
      motivo: "Prueba de repeticion",
    });

    expect(fueRechazada(segundo)).toBe(true);
    expect(segundo.mensaje).toContain("este mes");

    await apartarLosDelMes(guillermo.usuarioId);
  });
});

describe("Cuadro de honor", () => {
  it("no publica morosidad: solo devuelve unidades al día", async () => {
    const guillermo = await entrar(CUENTA.propietario);
    const filas = await rpc(guillermo, "cuadro_honor", {
      p_condominio_id: CONDOMINIO,
    });

    expect(filas.estado).toBe(200);
    for (const fila of filas.datos) {
      expect(fila.periodos_al_dia).toBe(fila.periodos_totales);
    }
  });

  it("las insignias vienen una por una, y suman el total", async () => {
    /*
      La tarjeta enseñaba «🏅 3» --la suma-- y el diseño original las pintaba
      una por una. `insignias_detalle` es lo que se añadió para eso, y lo que
      hay que sujetar es que las dos cifras cuenten lo mismo: si el desglose se
      queda corto, la pantalla dice menos de lo que la persona recibió y nada
      lo delata, porque las dos salen de la misma llamada.

      No expone nada nuevo: `reconocimiento_lectura` ya deja a cualquier
      miembro del condominio leer sus reconocimientos.
    */
    const guillermo = await entrar(CUENTA.propietario);
    const filas = await rpc(guillermo, "cuadro_honor", {
      p_condominio_id: CONDOMINIO,
    });

    expect(filas.estado).toBe(200);
    expect(filas.datos.length).toBeGreaterThan(0);

    // Control positivo: si nadie tuviera ninguna, «suman igual» se cumple con
    // el desglose vacío y el caso no probaría nada.
    expect(
      filas.datos.some((fila: { insignias: number }) => fila.insignias > 0),
    ).toBe(true);

    for (const fila of filas.datos) {
      const detalle = fila.insignias_detalle as Array<{
        clave: string;
        etiqueta: string;
        icono: string;
        cantidad: number;
      }>;
      expect(Array.isArray(detalle)).toBe(true);
      const suma = detalle.reduce((total, i) => total + i.cantidad, 0);
      expect(suma).toBe(fila.insignias);
      // Cada entrada trae con qué pintarse, y ninguna viene a cero.
      for (const insignia of detalle) {
        expect(insignia.clave).toBeTruthy();
        expect(insignia.etiqueta).toBeTruthy();
        expect(insignia.icono).toBeTruthy();
        expect(insignia.cantidad).toBeGreaterThan(0);
      }
    }
  });

  it("el resumen de cuotas no dice qué unidad pagó", async () => {
    const guillermo = await entrar(CUENTA.propietario);
    const filas = await rpc(guillermo, "resumen_cuotas", {
      p_condominio_id: CONDOMINIO,
    });

    expect(filas.estado).toBe(200);
    expect(filas.datos.length).toBeGreaterThan(0);
    for (const fila of filas.datos) {
      // Agregados y nada más: ni unidad, ni nombre, ni pago individual.
      /*
        `tiene_cuota` entra el 03/10/2026: el mes en curso sale siempre, y sin
        esa bandera un «0%» de un mes al que nadie le puso cuota se leeria como
        «no ha pagado nadie». No es un dato de nadie en particular, asi que la
        promesa de esta prueba --agregados y nada mas-- sigue en pie.
      */
      expect(Object.keys(fila).sort()).toEqual(
        [
          "al_dia",
          "atrasados",
          "esperado",
          "moneda",
          "periodo",
          "recibido",
          "tiene_cuota",
        ],
      );
    }
  });
});
