import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { entrarComo, salir, servicio } from "./cliente";
import {
  actualizarCondominio,
  obtenerCondominio,
} from "@/features/administrador/services/condominio.repo";
import { PAISES, paisPorCodigo } from "@/shared/constants";

/**
 * Recorrido: el país se elige de una lista, no se escribe.
 *
 * `condominio.pais` es `character(2)` y guarda `CO`. El formulario pedía el
 * **nombre** en un campo de texto libre, y al guardar hacía esto:
 *
 *     PAIS_DESDE_NOMBRE[valores.pais] ?? valores.pais.slice(0, 2).toUpperCase()
 *
 * Un mapa con dos entradas --Colombia y Perú-- y, para todo lo demás, **las dos
 * primeras letras de lo que se escribiera**. «Estados Unidos» se guardaba como
 * `ES`, que es España. Y como la columna mide exactamente dos, el recorte
 * entraba sin un solo error: nada lo decía.
 *
 * De esta columna salen el tipo de documento que se pide en la puerta, la
 * etiqueta del identificador fiscal --RUC en Perú, NIT en Colombia-- y el
 * formato de los reportes al ministerio. Un código inventado se arrastra ahí.
 *
 * La prueba va contra el **repositorio**, que es donde vivía el recorte, y no
 * contra el componente: lo que importa no es que la pantalla pinte un
 * desplegable sino qué dos letras acaban en la base.
 */

const CONDOMINIO = "11111111-1111-1111-1111-111111111111";
const ADMIN = "admin@veciyo.test";

/**
 * La fila cruda, para devolverla.
 *
 * Cruda y no lo que devuelve el repositorio: así la restauración sigue siendo
 * correcta aunque el repositorio esté roto a propósito mientras se comprueba
 * que esta prueba detecta algo.
 */
let comoEstaba: Record<string, unknown> | null = null;

beforeAll(async () => {
  await entrarComo(ADMIN);
  const { data } = await servicio
    .from("condominio")
    .select(
      "nombre, direccion, ciudad, pais, identificacion_fiscal, telefono, codigo_pais, email",
    )
    .eq("id", CONDOMINIO)
    .single();
  comoEstaba = data as Record<string, unknown>;
});

afterAll(async () => {
  if (comoEstaba) {
    const { error } = await servicio
      .from("condominio")
      .update(comoEstaba)
      .eq("id", CONDOMINIO);
    expect(error).toBeNull();
  }
  await salir();
});

describe("el país del edificio es un código, de principio a fin", () => {
  it("lo que se guarda es el código, no el nombre recortado", async () => {
    const antes = await obtenerCondominio(CONDOMINIO);
    expect(antes).toBeTruthy();

    /*
      Estados Unidos es el caso que lo delata: su nombre empieza por «Es», así
      que el recorte daba `ES` --España-- y las dos letras encajaban en la
      columna sin protestar. Si en vez del código viajara el nombre, aquí
      saldría `ES`.
    */
    await actualizarCondominio(CONDOMINIO, { ...antes!.valores, pais: "US" });

    const { data } = await servicio
      .from("condominio")
      .select("pais")
      .eq("id", CONDOMINIO)
      .single();

    expect(data!.pais).toBe("US");
    expect(data!.pais).not.toBe("ES");
  });

  it("y la pantalla lo vuelve a leer como código", async () => {
    /*
      El control que hace que lo de arriba signifique algo. Antes el
      repositorio traducía a nombre al leer --`PAISES[data.pais]`-- y de ahí
      salía el viaje de ida y vuelta por el nombre, que es donde se perdía.
      Ya pasó con el número de lavadora: se guardaba bien y no se veía.
    */
    const leido = await obtenerCondominio(CONDOMINIO);
    expect(leido!.valores.pais).toBe("US");
    // Y es un código que el catálogo reconoce, con su nombre para pintarlo.
    expect(paisPorCodigo(leido!.valores.pais)?.nombre).toBe("Estados Unidos");
  });

  it("abrir la pantalla y guardar sin tocar el país no lo cambia", async () => {
    /*
      Este es el camino por el que el defecto llegaba al dato del cliente, y es
      el más corriente de todos: la administración entra a cambiar el teléfono
      y pulsa Guardar. El país ni se toca.

      Con el recorte viejo eso bastaba: leer traducía el código a nombre
      --`PAISES[data.pais]`--, guardar recortaba el nombre a dos letras, y
      «Estados Unidos» salía de ese viaje convertido en `ES`. Nadie pulsa nada
      raro; el dato se corrompe al guardar otra cosa.

      Uno por uno y no una muestra: el mapa acertaba con dos --Colombia y
      Perú-- y fallaba calladamente con los otros veintiséis. Una prueba con
      solo esos dos habría pasado en verde todo el tiempo.
    */
    const malos: string[] = [];
    for (const pais of PAISES) {
      // Se siembra crudo, para que la lectura sea la primera que se mide.
      await servicio
        .from("condominio")
        .update({ pais: pais.codigo })
        .eq("id", CONDOMINIO);

      const leido = await obtenerCondominio(CONDOMINIO);
      // Y se devuelve **tal cual vino**, sin tocar el país.
      await actualizarCondominio(CONDOMINIO, leido!.valores);

      const { data } = await servicio
        .from("condominio")
        .select("pais")
        .eq("id", CONDOMINIO)
        .single();
      if (data!.pais !== pais.codigo) {
        malos.push(`${pais.nombre} (${pais.codigo}) acabó como ${data!.pais}`);
      }
    }
    expect(malos).toEqual([]);
  });
});

describe("las dos columnas gemelas del contacto de emergencia", () => {
  /*
    `membresia_unidad` e `invitacion` tenían **dos** columnas para el país del
    contacto de emergencia: `codigo_pais_emergencia` y
    `contacto_emergencia_codigo`. La segunda es la que se escribe y se lee.

    Las creé yo el 03/10/2026 sin fijarme en que ya existía con otro nombre, y
    el cliente autorizó quitarlas el 05/10: «las columnas duplicadas hay que
    borrarlas».

    Se comprueba pidiéndolas: PostgREST responde 42703 --«column does not
    exist»-- si de verdad no están. Un `select` de una columna inexistente es
    la única forma de preguntarlo desde aquí, porque el esquema `pg_catalog` no
    está expuesto.
  */
  it("ya no existen, y la que se usa sigue ahí", async () => {
    for (const tabla of ["membresia_unidad", "invitacion"] as const) {
      const { error } = await servicio
        .from(tabla)
        .select("codigo_pais_emergencia")
        .limit(1);
      expect(error, `${tabla} todavía tiene la columna gemela`).toBeTruthy();
      expect(error!.code).toBe("42703");
    }

    // El control positivo: la buena responde. Sin esto, un 42703 por otro
    // motivo --la tabla mal escrita-- se leería como éxito.
    const { error: buena } = await servicio
      .from("membresia_unidad")
      .select("contacto_emergencia_codigo")
      .limit(1);
    expect(buena).toBeNull();
  });
});

describe("una restricción NOT VALID deja filas que no se pueden editar", () => {
  /*
    `codigo_pais_es_iso2` se creó NOT VALID en seis tablas y nadie la validó.
    NOT VALID no mira las filas viejas --para eso se usa-- pero **sí** comprueba
    cualquier UPDATE posterior sobre una de ellas, aunque no toque esa columna:
    así quedó el perfil de Sofía imposible de modificar, por un `+57`.

    Validadas el 05/10/2026. Lo que eso significa, y es lo que se comprueba
    aquí, es que un código malo **se rechaza al escribirlo**, que es donde se
    entiende, en vez de quedarse esperando a que alguien edite esa fila.
  */
  it("un código de país que no es ISO2 se rechaza al escribirlo", async () => {
    const antes = await obtenerCondominio(CONDOMINIO);
    const { error } = await servicio
      .from("condominio")
      .update({ codigo_pais: "+57" })
      .eq("id", CONDOMINIO);

    expect(error, "la base aceptó un +57 como código de país").toBeTruthy();
    expect(error!.message).toMatch(/codigo_pais_es_iso2|check constraint/i);

    // Y el bueno sí entra: sin esto, un rechazo de cualquier otra causa
    // --una política, un permiso-- se leería como que la regla funciona.
    await actualizarCondominio(CONDOMINIO, { ...antes!.valores, codigoPais: "CO" });
    const { data } = await servicio
      .from("condominio")
      .select("codigo_pais")
      .eq("id", CONDOMINIO)
      .single();
    expect(data!.codigo_pais).toBe("CO");
  });
});
