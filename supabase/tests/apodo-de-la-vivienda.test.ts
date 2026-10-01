import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  CUENTA,
  actualizar,
  entrar,
  fueRechazada,
  leer,
  type Sesion,
} from "./apoyo";

/**
 * El apodo que cada quien le pone a su vivienda: «La playa».
 *
 * La tarjeta de «Mis viviendas» lo prometía desde el prototipo --decía
 * «Alias: Torre 1 · 102» sobre un texto que compone la aplicación-- y no había
 * nada detrás. Esto es lo que lo cumple.
 *
 * Lo que se comprueba aquí es **de quién es**: vive en `membresia_unidad`, no
 * en `unidad`, porque es de cada persona. Sofía es la propietaria de la 102 y
 * puede invitar gente a ella --o sea que `membresia_unidad_cambio` la deja
 * escribir la fila de Tomás--, así que sin `proteger_apodo_de_vivienda` podría
 * ponerle nombre a la casa en nombre de su huésped.
 *
 * El caso positivo va al lado del negativo a propósito: sin él, «Sofía no puede
 * tocar lo de Tomás» pasaría igual con la escritura cerrada para todos.
 */
interface FilaMembresia {
  id: string;
  apodo: string | null;
  usuario_id: string;
}

let sofia: Sesion;
let tomas: Sesion;

/** La membresía de cada uno, con lo que tuviera antes para devolverlo luego. */
let laDeSofia: FilaMembresia;
let laDeTomas: FilaMembresia;

const mia = (sesion: Sesion) =>
  leer<FilaMembresia[]>(
    sesion,
    `membresia_unidad?select=id,apodo,usuario_id&usuario_id=eq.${sesion.usuarioId}&activo=is.true&limit=1`,
  );

beforeAll(async () => {
  [sofia, tomas] = await Promise.all([
    entrar(CUENTA.vecino),
    entrar(CUENTA.huesped),
  ]);

  const [deSofia, deTomas] = await Promise.all([mia(sofia), mia(tomas)]);

  laDeSofia = deSofia.datos[0];
  laDeTomas = deTomas.datos[0];

  expect(laDeSofia, "Sofía tiene que tener una vivienda").toBeTruthy();
  expect(laDeTomas, "Tomás tiene que tener una estancia").toBeTruthy();

  /*
    Si lo que hay guardado ya viene con la marca, una corrida anterior murió
    antes de devolverlo y restaurar lo perpetuaría. Es lo que pasó con el libro
    del alojamiento, y se ve aquí en vez de dentro de dos semanas.
  */
  expect(laDeSofia.apodo ?? "").not.toContain("[prueba]");
  expect(laDeTomas.apodo ?? "").not.toContain("[prueba]");
});

afterAll(async () => {
  // Por su id, que es lo que esta prueba escribió. Buscar por los atributos con
  // los que se creó funciona hasta el día en que otro dato coincide.
  await actualizar(sofia, `membresia_unidad?id=eq.${laDeSofia.id}`, {
    apodo: laDeSofia.apodo,
  });
  await actualizar(tomas, `membresia_unidad?id=eq.${laDeTomas.id}`, {
    apodo: laDeTomas.apodo,
  });

  const [deSofia, deTomas] = await Promise.all([mia(sofia), mia(tomas)]);
  expect(deSofia.datos[0].apodo).toBe(laDeSofia.apodo);
  expect(deTomas.datos[0].apodo).toBe(laDeTomas.apodo);
});

describe("el apodo de una vivienda", () => {
  it("cada quien le pone nombre a la suya", async () => {
    const respuesta = await actualizar(
      sofia,
      `membresia_unidad?id=eq.${laDeSofia.id}`,
      { apodo: "[prueba] La playa" },
    );

    expect(respuesta.estado).toBe(200);

    const ahora = await mia(sofia);
    expect(ahora.datos[0].apodo).toBe("[prueba] La playa");
  });

  it("y no al de otro, aunque sea su casa y pueda invitar a ella", async () => {
    /*
      Sofía es la propietaria de la 102 y Tomás su huésped. `puede_invitar_a_
      unidad` la deja escribir esa fila --para eso existe esa política: ella
      gestiona la gente de su vivienda--, así que lo que lo impide es el
      disparador y nada más.
    */
    const respuesta = await actualizar(
      sofia,
      `membresia_unidad?id=eq.${laDeTomas.id}`,
      { apodo: "[prueba] Como yo digo" },
    );

    expect(fueRechazada(respuesta)).toBe(true);

    // Y lo que importa de verdad: que no se haya escrito.
    const deTomas = await mia(tomas);
    expect(deTomas.datos[0].apodo).toBe(laDeTomas.apodo);
  });

  it("tampoco la administración", async () => {
    const marcela = await entrar(CUENTA.admin);

    const respuesta = await actualizar(
      marcela,
      `membresia_unidad?id=eq.${laDeTomas.id}`,
      { apodo: "[prueba] Lo pongo yo" },
    );

    expect(fueRechazada(respuesta)).toBe(true);

    const deTomas = await mia(tomas);
    expect(deTomas.datos[0].apodo).toBe(laDeTomas.apodo);
  });

  it("en blanco no se guarda, y largo tampoco", async () => {
    /*
      Un apodo vacío dejaría en blanco el texto de la barra de arriba, que es
      justo el que se pulsa para cambiar de vivienda. Y el tope de 40 es el
      ancho de esa línea, que no se parte.
    */
    const vacio = await actualizar(
      sofia,
      `membresia_unidad?id=eq.${laDeSofia.id}`,
      { apodo: "   " },
    );
    expect(fueRechazada(vacio)).toBe(true);

    const largo = await actualizar(
      sofia,
      `membresia_unidad?id=eq.${laDeSofia.id}`,
      { apodo: "x".repeat(41) },
    );
    expect(fueRechazada(largo)).toBe(true);

    // Y el borde de arriba sí entra: 40 justos.
    const justo = await actualizar(
      sofia,
      `membresia_unidad?id=eq.${laDeSofia.id}`,
      { apodo: "x".repeat(40) },
    );
    expect(justo.estado).toBe(200);
  });

  it("quitarlo es dejarlo nulo", async () => {
    await actualizar(sofia, `membresia_unidad?id=eq.${laDeSofia.id}`, {
      apodo: "[prueba] La playa",
    });

    const respuesta = await actualizar(
      sofia,
      `membresia_unidad?id=eq.${laDeSofia.id}`,
      { apodo: null },
    );

    expect(respuesta.estado).toBe(200);

    const ahora = await mia(sofia);
    expect(ahora.datos[0].apodo).toBeNull();
  });
});
