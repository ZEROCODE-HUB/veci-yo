import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CUENTA, actualizar, entrar, leer, rpc, type Sesion } from "./apoyo";

/**
 * Cuántas noches separan una estancia corta de una larga.
 *
 * El cliente lo pidió el 25/09/2026: «Parámetro estancia corta, estancia larga.
 * Menos de 1 mes más limitantes. Más, ya son casi residentes.»
 *
 * Se construyó entero --la columna, el campo en la pantalla, `es_estancia_corta`
 * y `estancia_admite_visitas`-- y **nadie llamaba a ninguna de las dos**. Lo que
 * decidía de verdad era `reglas_de_estancia`, con otro criterio: «hay alguien
 * alojado hoy», sin mirar la duración. Dos definiciones de lo mismo, corriendo
 * la que no se pidió.
 *
 * O sea que a un huésped de tres meses se le aplicaban las reglas de estancia
 * corta, que es justo lo contrario de lo que dice esa frase.
 *
 * Se mide sobre la 102, que es la única vivienda con un huésped alojado hoy
 * --Tomás, con la salida en 2030 a propósito--. Lo que se mueve es **solo su
 * fila de `permiso_vivienda`**, guardada entera y devuelta entera: ya pasó que
 * restaurar «lo que yo miraba» dejara el resto estropeado para otro archivo.
 */
interface FilaPermiso {
  unidad_id: string;
  diferencia_estancia: boolean | null;
  corta_hasta_noches: number | null;
  corta_permite_visitas: boolean | null;
  larga_permite_visitas: boolean | null;
}

const CAMPOS =
  "unidad_id,diferencia_estancia,corta_hasta_noches,corta_permite_visitas,larga_permite_visitas";

let marcela: Sesion;
let tomas: Sesion;
let unidad: string;
let original: FilaPermiso;

/** Las noches que dura la estancia que hay hoy en la vivienda. */
let noches: number;

const permiso = async () =>
  (
    await leer<FilaPermiso[]>(
      marcela,
      `permiso_vivienda?select=${CAMPOS}&unidad_id=eq.${unidad}`,
    )
  ).datos[0];

const poner = (cambios: Partial<FilaPermiso>) =>
  actualizar(marcela, `permiso_vivienda?unidad_id=eq.${unidad}`, cambios);

/** Lo que `reglas_de_estancia` responde ahora mismo para esa vivienda. */
const permiteVisitas = async () => {
  const r = await rpc<Array<{ permite_visitas: boolean | null }>>(
    marcela,
    "reglas_de_estancia",
    { p_unidad_id: unidad },
  );
  return r.datos?.[0]?.permite_visitas ?? null;
};

beforeAll(async () => {
  [marcela, tomas] = await Promise.all([
    entrar(CUENTA.admin),
    entrar(CUENTA.huesped),
  ]);

  const suya = await leer<Array<{ unidad_id: string; vigente_desde: string; vigente_hasta: string }>>(
    tomas,
    "membresia_unidad?select=unidad_id,vigente_desde,vigente_hasta&activo=is.true&limit=1",
  );
  const estancia = suya.datos[0];
  expect(estancia, "Tomás tiene que seguir alojado en la 102").toBeTruthy();

  unidad = estancia.unidad_id;
  noches = Math.round(
    (Date.parse(estancia.vigente_hasta) - Date.parse(estancia.vigente_desde)) /
      86400000,
  );
  expect(noches, "su estancia tiene que durar algo").toBeGreaterThan(1);

  original = await permiso();
  expect(original, "la 102 tiene que tener su fila de permisos").toBeTruthy();
});

afterAll(async () => {
  await poner({
    diferencia_estancia: original.diferencia_estancia,
    corta_hasta_noches: original.corta_hasta_noches,
    corta_permite_visitas: original.corta_permite_visitas,
    larga_permite_visitas: original.larga_permite_visitas,
  });

  // Comprobando que quedó como estaba: una limpieza que no comprueba si limpió
  // no es una limpieza.
  const ahora = await permiso();
  expect(ahora).toEqual(original);
});

describe("qué juego de reglas le toca a la estancia que hay hoy", () => {
  it("por debajo del umbral, las reglas de estancia corta", async () => {
    /*
      El umbral se pone por encima de las noches de Tomás, así que su estancia
      cae del lado corto. Las visitas se dejan **permitidas** en ese lado para
      no bloquear a ningún otro archivo que registre una visita en la 102
      mientras esto corre: lo que se comprueba es de qué lado lee, no el valor.
    */
    await poner({
      diferencia_estancia: true,
      corta_hasta_noches: noches + 1,
      corta_permite_visitas: true,
      larga_permite_visitas: false,
    });

    expect(await permiteVisitas()).toBe(true);
  });

  it("por encima, las de estancia larga: «ya son casi residentes»", async () => {
    /*
      El caso que no ocurría. Con el umbral por debajo de las noches, la misma
      estancia pasa al lado largo y la respuesta cambia **sin tocar ninguna de
      las dos banderas**: lo único que se movió es el número.
    */
    await poner({ corta_hasta_noches: Math.max(1, noches - 1) });

    expect(await permiteVisitas()).toBe(false);
  });

  it("sin diferenciación manda el juego corto, como antes", async () => {
    // Esto no cambia, y es lo que hace que el arreglo sea seguro en un edificio
    // que ya está en marcha: hoy ninguna vivienda tiene la diferenciación
    // encendida, así que nada se mueve hasta que alguien la encienda.
    await poner({ diferencia_estancia: false });

    expect(await permiteVisitas()).toBe(true);
  });

  it("y el umbral solo, sin estancia, clasifica por noches", async () => {
    /*
      `es_estancia_corta` por su propio camino. Un RPC es público: se comprueba
      aparte de quien lo use, que ya pasó que una de las dos defensas tapara a
      la otra.
    */
    await poner({ corta_hasta_noches: 30 });

    const corta = await rpc<boolean>(marcela, "es_estancia_corta", {
      p_unidad_id: unidad,
      p_noches: 10,
    });
    const larga = await rpc<boolean>(marcela, "es_estancia_corta", {
      p_unidad_id: unidad,
      p_noches: 45,
    });
    const justo = await rpc<boolean>(marcela, "es_estancia_corta", {
      p_unidad_id: unidad,
      p_noches: 30,
    });

    expect(corta.datos).toBe(true);
    expect(larga.datos).toBe(false);
    // El borde entra: «menos de 1 mes» con el umbral en 30 incluye el día 30.
    expect(justo.datos).toBe(true);
  });
});
