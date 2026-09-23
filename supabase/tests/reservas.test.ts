import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  api,
  CUENTA,
  UNIDAD,
  entrar,
  leer,
  MARCA_PRUEBA,
  rpc,
  type Sesion,
} from "./apoyo";

/**
 * Quién reservó, y con qué nombre.
 *
 * La gestión de reservas del administrador mostraba, bajo la etiqueta
 * **"Residente"**, el nombre de la ZONA: `nombre: fila.zona?.nombre`. Todas
 * las reservas de la piscina decían "Piscina". Es el mismo campo que ya había
 * provocado R-46.
 *
 * Y con el nombre real llega R-78: `perfil.usa_alias_zonas` existía para que
 * quien no quiere figurar aparezca con su alias, y no se aplicaba en ningún
 * sitio.
 */

let marcela: Sesion;
let guillermo: Sesion;
let sofia: Sesion;

/** Una reserva propia, para no depender de las sembradas. */
let reservaId = "";
let zonaLibre = "";
let aliasOriginal: { alias: string | null; usa: boolean } | null = null;

beforeAll(async () => {
  [marcela, guillermo, sofia] = await Promise.all([
    entrar(CUENTA.admin),
    entrar(CUENTA.propietario),
    entrar(CUENTA.vecino),
  ]);

  const perfil = await leer(
    guillermo,
    `perfil?id=eq.${guillermo.usuarioId}&select=alias,usa_alias_zonas`,
  );
  aliasOriginal = {
    alias: perfil.datos[0]?.alias ?? null,
    usa: perfil.datos[0]?.usa_alias_zonas ?? false,
  };

  const zonas = await leer(
    guillermo,
    "zona_comun?select=id,requiere_aprobacion&activa=is.true&permite_estancia_larga=is.true",
  );
  zonaLibre = zonas.datos.find((z: any) => !z.requiere_aprobacion)?.id;

  const alta = await api(guillermo, "/rest/v1/reserva_zona", {
    metodo: "POST",
    cuerpo: {
      zona_id: zonaLibre,
      unidad_id: UNIDAD.u101,
      fecha: "2027-03-15",
      hora_inicio: "10:00",
      hora_fin: "12:00",
      solicitada_por: guillermo.usuarioId,
      comentarios: `${MARCA_PRUEBA} reservas`,
    },
  });
  reservaId = alta.datos?.[0]?.id ?? "";
});

afterAll(async () => {
  if (reservaId) {
    await api(marcela, `/rest/v1/reserva_zona?id=eq.${reservaId}`, {
      metodo: "DELETE",
    });
  }
  if (aliasOriginal) {
    await api(guillermo, `/rest/v1/perfil?id=eq.${guillermo.usuarioId}`, {
      metodo: "PATCH",
      cuerpo: {
        alias: aliasOriginal.alias,
        usa_alias_zonas: aliasOriginal.usa,
      },
    });
  }
});

describe("el nombre de quien reservó", () => {
  it("la administración lo ve, y no es el de la zona", async () => {
    expect(reservaId).toBeTruthy();

    const solicitantes = await rpc(marcela, "solicitantes_de_reservas", {
      p_reservas: [reservaId],
    });
    expect(solicitantes.datos).toHaveLength(1);
    expect(solicitantes.datos[0].solicitante).toContain("Guillermo");

    // Control: el nombre de la zona es otra cosa, y es lo que se mostraba.
    const zona = await leer(marcela, `zona_comun?id=eq.${zonaLibre}&select=nombre`);
    expect(solicitantes.datos[0].solicitante).not.toBe(zona.datos[0].nombre);
  });

  it("si pidió figurar con alias, el nombre real no sale", async () => {
    await api(guillermo, `/rest/v1/perfil?id=eq.${guillermo.usuarioId}`, {
      metodo: "PATCH",
      cuerpo: { alias: "[prueba] El del 101", usa_alias_zonas: true },
    });

    const solicitantes = await rpc(marcela, "solicitantes_de_reservas", {
      p_reservas: [reservaId],
    });
    expect(solicitantes.datos[0].solicitante).toBe("[prueba] El del 101");
    expect(solicitantes.datos[0].solicitante).not.toContain("Guillermo");
  });

  it("y al apagar la casilla vuelve el nombre real", async () => {
    // El control positivo de la anterior: sin esto, la prueba pasaría igual
    // con la casilla ignorada si el alias coincidiera por casualidad.
    await api(guillermo, `/rest/v1/perfil?id=eq.${guillermo.usuarioId}`, {
      metodo: "PATCH",
      cuerpo: { usa_alias_zonas: false },
    });

    const solicitantes = await rpc(marcela, "solicitantes_de_reservas", {
      p_reservas: [reservaId],
    });
    expect(solicitantes.datos[0].solicitante).toContain("Guillermo");
  });

  it("un vecino no averigua quién reservó una zona", async () => {
    const solicitantes = await rpc(sofia, "solicitantes_de_reservas", {
      p_reservas: [reservaId],
    });
    expect(solicitantes.datos).toHaveLength(0);
  });

  it("quien reservó sí ve su propia reserva", async () => {
    const solicitantes = await rpc(guillermo, "solicitantes_de_reservas", {
      p_reservas: [reservaId],
    });
    expect(solicitantes.datos).toHaveLength(1);
  });
});

/**
 * Dos reservas en la misma franja.
 *
 * `zona_comun.cupos_simultaneos` dice cuántas caben a la vez —1 en la piscina,
 * 4 en la lavandería, que tiene cuatro lavadoras— y **no la leía nadie**: ni
 * una política, ni una función, ni el cliente. La base aceptaba las reservas
 * que le echaran, y la grilla de disponibilidad le decía a cada vecino que
 * estaba todo libre porque RLS solo le entrega las suyas.
 */
describe("los cupos simultáneos de una zona", () => {
  const PISCINA = "55555555-5555-5555-5555-555555555551";
  const LAVANDERIA = "55555555-5555-5555-5555-555555555552";
  const creadas: string[] = [];

  const pedir = (
    sesion: Sesion,
    zona: string,
    unidad: string,
    fecha: string,
    desde: string,
    hasta: string,
  ) =>
    api(sesion, "/rest/v1/reserva_zona?select=id", {
      metodo: "POST",
      cuerpo: {
        zona_id: zona,
        unidad_id: unidad,
        fecha,
        hora_inicio: desde,
        hora_fin: hasta,
        solicitada_por: sesion.usuarioId,
        comentarios: `${MARCA_PRUEBA} cupos`,
      },
    });

  afterAll(async () => {
    for (const id of creadas) {
      await api(marcela, `/rest/v1/reserva_zona?id=eq.${id}`, {
        metodo: "DELETE",
      });
    }
  });

  it("con un solo cupo, la segunda reserva de la franja se rechaza", async () => {
    const primera = await pedir(
      guillermo, PISCINA, UNIDAD.u101, "2027-05-10", "14:00", "16:00",
    );
    expect(primera.estado).toBe(201);
    creadas.push(primera.datos[0].id);

    // Sofía vive en la 102: no es un problema de permisos, es que la piscina
    // ya está cogida.
    const segunda = await pedir(
      sofia, PISCINA, UNIDAD.u102, "2027-05-10", "15:00", "17:00",
    );
    expect(segunda.estado).toBe(400);
    expect(segunda.mensaje).toContain("ya esta ocupada");
  });

  it("una franja que solo toca el borde no solapa", async () => {
    // De 16:00 a 18:00 empieza justo donde acaba la anterior.
    const pegada = await pedir(
      sofia, PISCINA, UNIDAD.u102, "2027-05-10", "16:00", "18:00",
    );
    expect(pegada.estado).toBe(201);
    creadas.push(pegada.datos[0].id);
  });

  it("la lavandería admite sus cuatro, y rechaza la quinta", async () => {
    /*
      El control positivo del caso anterior: si el disparador contara mal, una
      zona con cuatro lavadoras aceptaría una sola reserva por franja y nadie
      lo notaría hasta tener a un vecino quejándose.
    */
    for (let i = 0; i < 4; i++) {
      const cabe = await pedir(
        guillermo, LAVANDERIA, UNIDAD.u101, "2027-05-11", "09:00", "10:00",
      );
      expect(cabe.estado).toBe(201);
      creadas.push(cabe.datos[0].id);
    }

    const quinta = await pedir(
      guillermo, LAVANDERIA, UNIDAD.u101, "2027-05-11", "09:00", "10:00",
    );
    expect(quinta.estado).toBe(400);
  });

  it("una reserva cancelada deja libre su cupo", async () => {
    const primera = await pedir(
      guillermo, PISCINA, UNIDAD.u101, "2027-05-12", "14:00", "16:00",
    );
    expect(primera.estado).toBe(201);
    creadas.push(primera.datos[0].id);

    const bloqueada = await pedir(
      sofia, PISCINA, UNIDAD.u102, "2027-05-12", "14:00", "16:00",
    );
    expect(bloqueada.estado).toBe(400);

    await api(marcela, `/rest/v1/reserva_zona?id=eq.${primera.datos[0].id}`, {
      metodo: "PATCH",
      cuerpo: { estado: "cancelada" },
    });

    const ahoraSi = await pedir(
      sofia, PISCINA, UNIDAD.u102, "2027-05-12", "14:00", "16:00",
    );
    expect(ahoraSi.estado).toBe(201);
    creadas.push(ahoraSi.datos[0].id);
  });
});

/**
 * La ocupación que ve un vecino.
 *
 * `reserva_zona_lectura` solo le entrega sus propias reservas —y así debe
 * seguir: de quién es la piscina el sábado no es asunto suyo—. Pero entonces
 * la grilla le salía entera vacía y todas las franjas decían "+ Reservar".
 * `ocupacion_zona()` devuelve las franjas tomadas sin decir de quién son.
 */
describe("ocupacion_zona", () => {
  const PISCINA = "55555555-5555-5555-5555-555555555551";
  let deGuillermo = "";

  beforeAll(async () => {
    const alta = await api(guillermo, "/rest/v1/reserva_zona?select=id", {
      metodo: "POST",
      cuerpo: {
        zona_id: PISCINA,
        unidad_id: UNIDAD.u101,
        fecha: "2027-06-20",
        hora_inicio: "11:00",
        hora_fin: "13:00",
        solicitada_por: guillermo.usuarioId,
        comentarios: `${MARCA_PRUEBA} ocupacion`,
      },
    });
    deGuillermo = alta.datos?.[0]?.id ?? "";
  });

  afterAll(async () => {
    if (deGuillermo) {
      await api(marcela, `/rest/v1/reserva_zona?id=eq.${deGuillermo}`, {
        metodo: "DELETE",
      });
    }
  });

  it("una vecina ve la franja tomada, aunque la reserva no sea suya", async () => {
    // El control: por la tabla no la ve.
    const porLaTabla = await leer(
      sofia,
      `reserva_zona?select=id&id=eq.${deGuillermo}`,
    );
    expect(porLaTabla.datos).toHaveLength(0);

    const ocupacion = await rpc(sofia, "ocupacion_zona", {
      p_zona_id: PISCINA,
      p_desde: "2027-06-20",
      p_hasta: "2027-06-20",
    });
    expect(ocupacion.estado).toBe(200);
    expect(ocupacion.datos).toHaveLength(1);
    expect(ocupacion.datos[0].hora_inicio).toBe("11:00:00");
    expect(ocupacion.datos[0].propia).toBe(false);
  });

  it("y no dice de quién es", async () => {
    const ocupacion = await rpc(sofia, "ocupacion_zona", {
      p_zona_id: PISCINA,
      p_desde: "2027-06-20",
      p_hasta: "2027-06-20",
    });
    for (const fila of ocupacion.datos) {
      expect(Object.keys(fila).sort()).toEqual([
        "fecha",
        "hora_fin",
        "hora_inicio",
        "propia",
      ]);
    }
  });

  it("la suya sí viene marcada como propia", async () => {
    const ocupacion = await rpc(guillermo, "ocupacion_zona", {
      p_zona_id: PISCINA,
      p_desde: "2027-06-20",
      p_hasta: "2027-06-20",
    });
    expect(ocupacion.datos[0].propia).toBe(true);
  });

  it("quien no vive en el condominio no recibe nada", async () => {
    const forastero = await entrar(CUENTA.invitadoNuevo);

    /*
      El caso asegura su premisa. `invitadoNuevo` es la cuenta que, según
      `apoyo.ts`, "las pruebas limpian y vuelven a dar de alta en cada
      corrida": varios archivos le crean una membresía para recorrer el alta de
      un huésped. Pasaba en solitario y fallaba en la suite completa, que es la
      forma más incómoda de fallar.
    */
    await api(
      marcela,
      `/rest/v1/membresia_unidad?usuario_id=eq.${forastero.usuarioId}`,
      { metodo: "DELETE" },
    );
    await api(
      marcela,
      `/rest/v1/membresia_condominio?usuario_id=eq.${forastero.usuarioId}`,
      { metodo: "DELETE" },
    );

    const ocupacion = await rpc(forastero, "ocupacion_zona", {
      p_zona_id: PISCINA,
      p_desde: "2027-06-20",
      p_hasta: "2027-06-20",
    });
    expect(ocupacion.datos).toHaveLength(0);
  });
});
