import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { api, CUENTA, entrar, fueRechazada, leer, type Sesion } from "./apoyo";

/**
 * Las preferencias de la persona.
 *
 * Vivían en un store de Zustand sembrado con los datos de alguien inventado
 * —un correo de respaldo, un documento fijo— y se perdían al cerrar la
 * aplicación (R-29).
 *
 * Dos de ellas no son una preferencia de pantalla sino **a dónde mandar las
 * notificaciones**. El día que se encienda el envío de correo, el servidor
 * tiene que saber a qué dirección escribir.
 */

let guillermo: Sesion;
let sofia: Sesion;
let original: any = null;

beforeAll(async () => {
  [guillermo, sofia] = await Promise.all([
    entrar(CUENTA.propietario),
    entrar(CUENTA.vecino),
  ]);

  const fila = await leer(
    guillermo,
    `perfil?id=eq.${guillermo.usuarioId}&select=codigo_pais,usar_contacto_alt,telefono_alt,correo_alt,modo_daltonico,fuente_aumentada,modo_oscuro`,
  );
  original = fila.datos[0] ?? null;
});

afterAll(async () => {
  if (!original) return;
  await api(guillermo, `/rest/v1/perfil?id=eq.${guillermo.usuarioId}`, {
    metodo: "PATCH",
    cuerpo: original,
  });
});

const guardar = (sesion: Sesion, cuerpo: Record<string, unknown>) =>
  api(sesion, `/rest/v1/perfil?id=eq.${sesion.usuarioId}`, {
    metodo: "PATCH",
    cuerpo,
  });

describe("se guardan y sobreviven", () => {
  it("lo que se elige queda escrito", async () => {
    /*
      El codigo de pais va en **ISO 3166-1 alfa-2**, no como prefijo.

      Esta prueba escribia `"+57"`, que es lo que de verdad habia en la base: el
      campo era un `Input` a mano y cabia «+57», «57» o «Colombia», las tres
      conviviendo en la misma columna. Asi no se puede componer un numero para
      llamar ni para WhatsApp, que es lo que pidio el cliente.

      Desde el 03/10/2026 hay un `check` que solo acepta dos letras mayusculas,
      y un catalogo que tiene el prefijo. La prueba documentaba el formato viejo
      y por eso se puso roja: funciono como estaba previsto.
    */
    const respuesta = await guardar(guillermo, {
      codigo_pais: "CO",
      modo_daltonico: true,
      fuente_aumentada: true,
    });
    expect(respuesta.estado).toBe(200);

    const fila = await leer(
      guillermo,
      `perfil?id=eq.${guillermo.usuarioId}&select=codigo_pais,modo_daltonico,fuente_aumentada`,
    );
    expect(fila.datos[0].codigo_pais).toBe("CO");
    expect(fila.datos[0].modo_daltonico).toBe(true);
    expect(fila.datos[0].fuente_aumentada).toBe(true);
  });

  it("y un prefijo no vale como pais", async () => {
    /*
      El control del caso de arriba. Si la base aceptara «+57» seguiriamos
      igual: un dato que cada pantalla interpreta a su manera.
    */
    const respuesta = await guardar(guillermo, { codigo_pais: "+57" });
    expect(respuesta.estado).toBeGreaterThanOrEqual(400);
  });
});

describe("a dónde van las notificaciones", () => {
  it("un correo alternativo que no es un correo se rechaza", async () => {
    const intento = await guardar(guillermo, { correo_alt: "esto no es" });
    expect(fueRechazada(intento)).toBe(true);
  });

  it("pero uno que sí lo es, se acepta", async () => {
    // Control positivo: el rechazo es de la restricción, no del PATCH.
    const ok = await guardar(guillermo, {
      correo_alt: "avisos@veciyo.test",
      telefono_alt: "+57 300 0000000",
    });
    expect(ok.estado).toBe(200);
  });

  it("pedir avisos en otro sitio sin decir cuál se rechaza", async () => {
    /*
      `usar_contacto_alt` sin ningún dato alternativo dejaría a esa persona sin
      recibir nada: la aplicación miraría el contacto alternativo y no habría.
    */
    await guardar(guillermo, {
      usar_contacto_alt: false,
      correo_alt: null,
      telefono_alt: null,
    });

    const intento = await guardar(guillermo, { usar_contacto_alt: true });
    expect(fueRechazada(intento)).toBe(true);
  });

  it("con un correo alternativo puesto, sí se acepta", async () => {
    const ok = await guardar(guillermo, {
      correo_alt: "avisos@veciyo.test",
      usar_contacto_alt: true,
    });
    expect(ok.estado).toBe(200);
  });
});

describe("son de cada uno", () => {
  it("un vecino no lee las preferencias de otro", async () => {
    const ajenas = await leer(
      sofia,
      `perfil?id=eq.${guillermo.usuarioId}&select=correo_alt,telefono_alt`,
    );
    // O no devuelve la fila, o no devuelve el dato: las dos valen, lo que no
    // vale es que salga el correo.
    const texto = JSON.stringify(ajenas.datos);
    expect(texto).not.toContain("avisos@veciyo.test");
  });

  it("y tampoco las escribe", async () => {
    const intento = await api(
      sofia,
      `/rest/v1/perfil?id=eq.${guillermo.usuarioId}`,
      {
        metodo: "PATCH",
        prefer: "return=minimal",
        cuerpo: { correo_alt: "secuestrado@veciyo.test" },
      },
    );
    expect(intento.estado).toBeLessThan(400);

    const fila = await leer(
      guillermo,
      `perfil?id=eq.${guillermo.usuarioId}&select=correo_alt`,
    );
    expect(fila.datos[0].correo_alt).not.toBe("secuestrado@veciyo.test");
  });
});
