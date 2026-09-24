import { beforeAll, describe, expect, it } from "vitest";
import {
  CLAVE,
  CONDOMINIO,
  CUENTA,
  URL,
  api,
  entrar,
  fueRechazada,
  leer,
  type Sesion,
} from "./apoyo";

/**
 * Los documentos legales.
 *
 * "Términos y Condiciones de la App", "Tratamiento de Datos Personales",
 * "Política de Privacidad" y "Términos del Condominio" vivían en
 * `LegalAccordion.tsx`, escritos a mano y **con un párrafo de relleno cada
 * uno**. Para poner el texto de verdad había que publicar la aplicación, y el
 * cuarto es por condominio, así que ni siquiera podía ser un texto único.
 *
 * Lo que importa aquí es **quién puede leerlos**: la pantalla que los muestra
 * está en el stack de autenticación y se ve antes de tener cuenta. Pedirle a
 * alguien que acepte unos términos que no puede leer no es una opción.
 */

let marcela: Sesion;
let guillermo: Sesion;

beforeAll(async () => {
  [marcela, guillermo] = await Promise.all([
    entrar(CUENTA.admin),
    entrar(CUENTA.propietario),
  ]);
});

/** Una petición sin ninguna sesión: la clave anónima y nada más. */
async function sinSesion(ruta: string) {
  const respuesta = await fetch(`${URL}/rest/v1/${ruta}`, {
    headers: { apikey: CLAVE, "Content-Type": "application/json" },
  });
  const texto = await respuesta.text();
  return { estado: respuesta.status, datos: texto ? JSON.parse(texto) : null };
}

describe("los de la plataforma", () => {
  it("se leen sin haber iniciado sesión", async () => {
    const publicos = await sinSesion(
      "documento_legal?select=tipo,titulo,contenido&condominio_id=is.null",
    );
    expect(publicos.estado).toBe(200);
    expect(publicos.datos.length).toBeGreaterThan(0);

    // Y traen texto: el defecto era que el texto no se pudiera cambiar, no que
    // no existiera.
    for (const doc of publicos.datos) {
      expect(String(doc.contenido).trim().length).toBeGreaterThan(0);
    }
  });

  it("y nadie los cambia desde la aplicación", async () => {
    /*
      Son de quien opera el producto, como el precio del plan: van con
      `service_role`. Marcela administra su edificio y aun así no puede tocar
      los términos de la plataforma.
    */
    const antes = await leer(
      marcela,
      "documento_legal?select=id,contenido&tipo=eq.terminos_app",
    );
    expect(antes.datos).toHaveLength(1);

    await api(marcela, `/rest/v1/documento_legal?id=eq.${antes.datos[0].id}`, {
      metodo: "PATCH",
      cuerpo: { contenido: "Cambiado" },
    });

    const despues = await leer(
      marcela,
      "documento_legal?select=contenido&tipo=eq.terminos_app",
    );
    expect(despues.datos[0].contenido).toBe(antes.datos[0].contenido);
  });
});

describe("los del condominio", () => {
  it("no se leen sin sesión, aunque los de la plataforma sí", async () => {
    /*
      El caso que decide el diseño: sin sesión no se sabe de qué edificio es
      quien pregunta, así que dárselos sería publicar las normas internas de
      cualquier condominio a cualquiera que tenga la clave anónima —que va
      dentro de la app y es pública por diseño—.
    */
    const intento = await sinSesion(
      "documento_legal?select=id&tipo=eq.terminos_condominio",
    );
    expect(intento.datos).toHaveLength(0);
  });

  it("los lee quien vive en el edificio", async () => {
    const delResidente = await leer(
      guillermo,
      `documento_legal?select=id,titulo&condominio_id=eq.${CONDOMINIO}`,
    );
    expect(delResidente.datos.length).toBeGreaterThan(0);
  });

  it("y los cambia su administración, que es de quien son", async () => {
    const suyo = await leer(
      marcela,
      `documento_legal?select=id,contenido&condominio_id=eq.${CONDOMINIO}&tipo=eq.terminos_condominio`,
    );
    expect(suyo.datos).toHaveLength(1);
    const original = suyo.datos[0].contenido;

    const cambiado = await api(
      marcela,
      `/rest/v1/documento_legal?id=eq.${suyo.datos[0].id}`,
      { metodo: "PATCH", cuerpo: { contenido: `${original} [prueba]` } },
    );
    expect(cambiado.estado).toBe(200);

    // Se deja como estaba.
    await api(marcela, `/rest/v1/documento_legal?id=eq.${suyo.datos[0].id}`, {
      metodo: "PATCH",
      cuerpo: { contenido: original },
    });
  });

  it("pero no un residente cualquiera", async () => {
    const suyo = await leer(
      guillermo,
      `documento_legal?select=id,contenido&condominio_id=eq.${CONDOMINIO}`,
    );
    const original = suyo.datos[0].contenido;

    await api(guillermo, `/rest/v1/documento_legal?id=eq.${suyo.datos[0].id}`, {
      metodo: "PATCH",
      cuerpo: { contenido: "Reescrito por un vecino" },
    });

    const despues = await leer(
      guillermo,
      `documento_legal?select=contenido&id=eq.${suyo.datos[0].id}`,
    );
    expect(despues.datos[0].contenido).toBe(original);
  });

  it("y un documento de condominio sin condominio no entra", async () => {
    // La restricción que impide que las normas de un edificio acaben en la
    // pantalla de registro de cualquiera.
    const intento = await api(marcela, "/rest/v1/documento_legal", {
      metodo: "POST",
      prefer: "return=minimal",
      cuerpo: {
        tipo: "terminos_condominio",
        titulo: "Sin edificio",
        contenido: "x",
      },
    });
    expect(fueRechazada(intento)).toBe(true);
  });
});
