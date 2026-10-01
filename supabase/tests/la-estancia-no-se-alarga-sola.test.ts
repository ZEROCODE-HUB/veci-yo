import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  CUENTA,
  actualizar,
  entrar,
  fueRechazada,
  leer,
  rpc,
  type Sesion,
} from "./apoyo";

/**
 * Un huésped no se alarga su propia estancia.
 *
 * `proteger_membresia_unidad` ya impedía cambiarse a uno mismo el rol,
 * `puede_acceder`, `activo` y las dos banderas de primario. Le faltaban las
 * fechas, y eran las más caras: el 01/10/2026 Ramiro --estancia terminada el
 * 7 de agosto-- se puso `vigente_hasta` en 2030 con un solo PATCH. Respuesta
 * 200 y fecha guardada.
 *
 * Lo que eso devuelve no es solo entrar: las credenciales de la vivienda --el
 * wifi y el código de la puerta-- las protege `es_huesped_alojado`, que mira
 * esa misma fecha. La condición que guardaba el secreto la escribía quien
 * quería leerlo.
 *
 * El caso positivo va al lado: si la membresía fuera de solo lectura para su
 * dueño, el negativo pasaría por la razón equivocada.
 */
interface FilaMembresia {
  id: string;
  vigente_desde: string | null;
  vigente_hasta: string | null;
  datos_visibles: boolean;
}

let ramiro: Sesion;
let suya: FilaMembresia;

beforeAll(async () => {
  ramiro = await entrar(CUENTA.huespedVencido);

  const mia = await leer<FilaMembresia[]>(
    ramiro,
    `membresia_unidad?select=id,vigente_desde,vigente_hasta,datos_visibles&usuario_id=eq.${ramiro.usuarioId}&limit=1`,
  );
  suya = mia.datos[0];

  expect(suya, "Ramiro tiene que seguir teniendo su membresía").toBeTruthy();
  expect(
    suya.vigente_hasta,
    "su estancia tiene que estar terminada, que es lo que lo hace útil",
  ).toBeTruthy();
});

afterAll(async () => {
  // Por su id, y comprobando que quedó como estaba: una limpieza que no
  // comprueba si limpió no es una limpieza.
  await actualizar(ramiro, `membresia_unidad?id=eq.${suya.id}`, {
    datos_visibles: suya.datos_visibles,
  });

  const fin = await leer<FilaMembresia[]>(
    ramiro,
    `membresia_unidad?select=vigente_desde,vigente_hasta,datos_visibles&id=eq.${suya.id}`,
  );
  expect(fin.datos[0].vigente_hasta).toBe(suya.vigente_hasta);
  expect(fin.datos[0].vigente_desde).toBe(suya.vigente_desde);
  expect(fin.datos[0].datos_visibles).toBe(suya.datos_visibles);
});

describe("las fechas de la propia estancia", () => {
  it("no se puede alargar la suya", async () => {
    const respuesta = await actualizar(
      ramiro,
      `membresia_unidad?id=eq.${suya.id}`,
      { vigente_hasta: "2030-01-01" },
    );

    expect(fueRechazada(respuesta)).toBe(true);

    // Lo que de verdad importa: que no se haya escrito.
    const ahora = await leer<FilaMembresia[]>(
      ramiro,
      `membresia_unidad?select=vigente_hasta&id=eq.${suya.id}`,
    );
    expect(ahora.datos[0].vigente_hasta).toBe(suya.vigente_hasta);
  });

  it("ni adelantar el día en que empezó", async () => {
    /*
      La otra mitad. `es_huesped_con_reserva` y la sesión miran `vigente_desde`
      para decidir quién ya llegó, así que moverla hacia atrás es entrar antes
      de tiempo.
    */
    const respuesta = await actualizar(
      ramiro,
      `membresia_unidad?id=eq.${suya.id}`,
      { vigente_desde: "2020-01-01" },
    );

    expect(fueRechazada(respuesta)).toBe(true);
  });

  it("y sin estancia vigente no le dan las credenciales de la vivienda", async () => {
    /*
      El motivo por el que lo de arriba importa, comprobado por su propio
      camino. Un RPC es público: cualquiera puede llamarlo sin pasar por la
      pantalla, así que las dos defensas se miran por separado.
    */
    const credenciales = await rpc(ramiro, "credenciales_alojamiento", {
      p_unidad_id: null,
    });

    expect(
      credenciales.estado === 200
        ? (credenciales.datos ?? []).length === 0
        : true,
      "a una estancia terminada no le toca ninguna credencial",
    ).toBe(true);
  });

  it("pero su membresía no es de solo lectura: lo suyo sí lo cambia", async () => {
    /*
      El control positivo. Sin él, los dos casos de arriba pasarían igual si la
      política no dejara escribir nada, y no se vería que lo que filtra son las
      fechas y no la fila entera.
    */
    const respuesta = await actualizar(
      ramiro,
      `membresia_unidad?id=eq.${suya.id}`,
      { datos_visibles: !suya.datos_visibles },
    );

    expect(respuesta.estado).toBe(200);

    const ahora = await leer<FilaMembresia[]>(
      ramiro,
      `membresia_unidad?select=datos_visibles&id=eq.${suya.id}`,
    );
    expect(ahora.datos[0].datos_visibles).toBe(!suya.datos_visibles);
  });
});
