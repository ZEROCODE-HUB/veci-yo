import { describe, expect, it } from "vitest";
import { mensajeDeError } from "./error.util";

/**
 * Lo que la persona lee cuando algo falla.
 *
 * Veinte sitios de la aplicación escribían `error instanceof Error ?
 * error.message : respaldo`, y eso tira el mensaje útil: lo que lanza el
 * cliente de Supabase no es un `Error` sino un objeto plano, así que la rama
 * del `instanceof` era falsa casi siempre.
 *
 * Salió votando dos veces la misma opción de una encuesta: la base contesta
 * «Esta encuesta admite un solo voto por persona» y en pantalla salía «No se
 * pudo guardar el anuncio».
 */
const RESPALDO = "No se pudo guardar";

describe("el motivo de un fallo", () => {
  it("el del objeto que lanza la base, que es el que explica algo", () => {
    /*
      El caso que no funcionaba. `PostgrestError` es `{ message, details, hint,
      code }`: tiene `message` y no es un `Error`.
    */
    const deLaBase = {
      message: "Esta encuesta admite un solo voto por persona",
      details: null,
      hint: null,
      code: "P0001",
    };

    expect(mensajeDeError(deLaBase, RESPALDO)).toBe(
      "Esta encuesta admite un solo voto por persona",
    );
  });

  it("y el de un Error de toda la vida", () => {
    // Los de autenticación y los que lanza la propia aplicación sí lo son, y
    // por eso unas pantallas explicaban el motivo y otras no.
    expect(mensajeDeError(new Error("Credenciales inválidas"), RESPALDO)).toBe(
      "Credenciales inválidas",
    );
  });

  it("una cadena suelta también cuenta", () => {
    expect(mensajeDeError("Se cayó la red", RESPALDO)).toBe("Se cayó la red");
  });

  it("cuando no hay nada que contar, el respaldo", () => {
    /*
      Y un mensaje vacío es no tener nada que contar: sin esto la persona veía
      un aviso rojo **en blanco**, que es peor que la frase genérica.
    */
    expect(mensajeDeError(undefined, RESPALDO)).toBe(RESPALDO);
    expect(mensajeDeError(null, RESPALDO)).toBe(RESPALDO);
    expect(mensajeDeError({}, RESPALDO)).toBe(RESPALDO);
    expect(mensajeDeError({ message: "" }, RESPALDO)).toBe(RESPALDO);
    expect(mensajeDeError({ message: "   " }, RESPALDO)).toBe(RESPALDO);
    expect(mensajeDeError({ message: 42 }, RESPALDO)).toBe(RESPALDO);
    expect(mensajeDeError("", RESPALDO)).toBe(RESPALDO);
  });
});

/**
 * Lo que Postgres dice cuando rechaza algo, y lo que la persona debe leer.
 *
 * Conectar el mensaje de la base --el arreglo correcto para los disparadores,
 * que escriben frases pensadas para leerse-- dejó a la vista las frases de la
 * propia máquina, que están en inglés y nombran tablas. Una mejora destapó el
 * agujero de al lado, el mismo día.
 */
describe("cuando el que habla es Postgres y no una persona", () => {
  const CHECK =
    'new row for relation "reserva_zona" violates check constraint "reserva_zona_horario_coherente"';

  it("se traduce lo que sabemos traducir", () => {
    expect(mensajeDeError({ message: CHECK }, RESPALDO)).toBe(
      "La hora de fin tiene que ser posterior a la de inicio.",
    );
  });

  it("y lo que no, se calla", () => {
    /*
      El caso que importa. Una restricción que nadie tradujo no puede acabar
      enseñando el nombre de una tabla: vale más la frase genérica.
    */
    const desconocida =
      'new row for relation "una_tabla" violates check constraint "algo_que_nadie_tradujo"';

    expect(mensajeDeError({ message: desconocida }, RESPALDO)).toBe(RESPALDO);
  });

  it("tampoco se enseña una clave duplicada ni un permiso denegado", () => {
    expect(
      mensajeDeError(
        { message: 'duplicate key value violates unique constraint "x_idx"' },
        RESPALDO,
      ),
    ).toBe(RESPALDO);
    expect(
      mensajeDeError(
        {
          message:
            'new row violates row-level security policy for table "visita"',
        },
        RESPALDO,
      ),
    ).toBe(RESPALDO);
  });

  it("y una reserva encima de otra se explica en castellano", () => {
    /*
      La primera restriccion **de exclusion** del proyecto, del 09/10/2026, y
      ninguno de los tres patrones que habia la reconocia: su error llegaba
      crudo, con el nombre de la tabla, las dos claves en conflicto y un
      `daterange` dentro.

      El mensaje de Postgres es el de verdad, copiado de la base.
    */
    const dePostgres =
      'conflicting key value violates exclusion constraint ' +
      '"visita_sin_estancias_solapadas"';

    const leido = mensajeDeError({ message: dePostgres }, RESPALDO);

    expect(leido).toContain("ya tiene una reserva");
    // Y nada de la maquina: ni el nombre de la restriccion ni la tabla.
    expect(leido).not.toContain("exclusion");
    expect(leido).not.toContain("visita");
  });

  it("y una restricción de exclusión que no conozco se calla", () => {
    /*
      El control: lo conocido se traduce, lo demas se sustituye por el
      respaldo. Vale mas «no se pudo guardar» que enseñar el nombre de una
      tabla, y ahora que el patron reconoce las de exclusion, una futura sin
      traduccion no puede colarse entera.
    */
    expect(
      mensajeDeError(
        {
          message:
            'conflicting key value violates exclusion constraint "algo_que_no_existe"',
        },
        RESPALDO,
      ),
    ).toBe(RESPALDO);
  });

  it("pero lo que escribe un disparador sí se lee tal cual", () => {
    /*
      El control positivo, y la razón de ser de todo esto: las excepciones de
      este proyecto están escritas para una persona --«Esta encuesta admite un
      solo voto por persona»-- y tienen que llegar enteras.
    */
    const deUnDisparador = "Esta encuesta admite un solo voto por persona";

    expect(mensajeDeError({ message: deUnDisparador }, RESPALDO)).toBe(
      deUnDisparador,
    );
    expect(
      mensajeDeError(
        {
          message:
            "Esta zona necesita 30 minutos entre una reserva y la siguiente, y hay otra de 10:00 a 12:00.",
        },
        RESPALDO,
      ),
    ).toContain("30 minutos");
  });
});
