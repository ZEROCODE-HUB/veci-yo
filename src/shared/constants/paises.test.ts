import { describe, expect, it } from "vitest";
import {
  PAISES,
  buscarPaises,
  paisPorCodigo,
  telefonoInternacional,
} from "./paises";
import { BANDERAS } from "./banderas.generado";

/**
 * El catálogo de países y el número con su prefijo.
 *
 * Esto existe porque hasta el 03/10/2026 el teléfono se guardaba como un texto
 * suelto —con prefijo, sin prefijo, con guiones— y **no había forma de saber de
 * qué país era**. El producto opera en Colombia y en Perú, y el cliente quiere
 * mandar avisos por WhatsApp, que necesita el número completo.
 *
 * Había además dos listas de países distintas en el proyecto, y ninguna con
 * prefijo.
 */

describe("el catálogo", () => {
  it("no tiene códigos repetidos", () => {
    /*
      Un código repetido significa que `paisPorCodigo` devuelve el primero y el
      otro es inalcanzable. Es el tipo de cosa que entra al añadir un país
      deprisa.
    */
    const codigos = PAISES.map((p) => p.codigo);
    expect(new Set(codigos).size).toBe(codigos.length);
  });

  it("todos los códigos son ISO de dos letras mayúsculas", () => {
    // Es lo que la base exige con un `check`. Si aquí entra «co» o «COL», la
    // escritura falla en producción y no aquí.
    for (const pais of PAISES) {
      expect(pais.codigo).toMatch(/^[A-Z]{2}$/);
    }
  });

  it("todos tienen prefijo, y solo dígitos", () => {
    for (const pais of PAISES) {
      expect(pais.prefijo).toMatch(/^\d+$/);
    }
  });

  it("Colombia y Perú van primero: es donde opera el producto", () => {
    expect(PAISES[0].codigo).toBe("CO");
    expect(PAISES[1].codigo).toBe("PE");
  });

  it("varios países pueden compartir prefijo, y eso está bien", () => {
    /*
      Estados Unidos, Canadá, Puerto Rico y República Dominicana comparten el 1.
      Si alguien «arreglara» el duplicado quitando países, se perderían.
    */
    const conUno = PAISES.filter((p) => p.prefijo === "1");
    expect(conUno.length).toBeGreaterThan(1);
  });
});

describe("buscar un país", () => {
  it("por nombre", () => {
    expect(buscarPaises("colom")[0].codigo).toBe("CO");
  });

  it("sin acentos, que es como se teclea en un móvil", () => {
    expect(buscarPaises("peru")[0].codigo).toBe("PE");
    expect(buscarPaises("mexico")[0].codigo).toBe("MX");
  });

  it("y por prefijo, con o sin el más", () => {
    /*
      Alguien que sabe que su número empieza por 57 y no se acuerda de cómo se
      escribe su país lo encuentra igual.
    */
    expect(buscarPaises("57").some((p) => p.codigo === "CO")).toBe(true);
    expect(buscarPaises("+51").some((p) => p.codigo === "PE")).toBe(true);
  });

  it("sin texto devuelve todos", () => {
    expect(buscarPaises("")).toHaveLength(PAISES.length);
    expect(buscarPaises("   ")).toHaveLength(PAISES.length);
  });
});

describe("el número listo para marcar", () => {
  it("junta el prefijo con el número", () => {
    expect(telefonoInternacional("CO", "3001234567")).toBe("+573001234567");
  });

  it("limpia lo que no son dígitos", () => {
    // Nadie escribe el teléfono igual. Lo que se manda a WhatsApp tiene que ir
    // limpio aunque lo que se guardó traiga espacios o guiones.
    expect(telefonoInternacional("PE", "987 654-321")).toBe("+51987654321");
  });

  it("si falta el país o el número, no devuelve medio teléfono", () => {
    /*
      Media cosa no sirve para llamar, y un «+57» suelto parece un teléfono y no
      lo es: alguien lo copiaría y marcaría a ninguna parte.
    */
    expect(telefonoInternacional(null, "3001234567")).toBe("");
    expect(telefonoInternacional("CO", "")).toBe("");
    expect(telefonoInternacional("CO", "   ")).toBe("");
    expect(telefonoInternacional("ZZ", "3001234567")).toBe("");
  });
});

describe("buscar por código", () => {
  it("encuentra en minúsculas también", () => {
    expect(paisPorCodigo("co")?.nombre).toBe("Colombia");
  });

  it("y devuelve nada si no existe, en vez de inventarse uno", () => {
    expect(paisPorCodigo("ZZ")).toBeNull();
    expect(paisPorCodigo(null)).toBeNull();
    expect(paisPorCodigo("")).toBeNull();
  });
});

describe("las banderas", () => {
  it("hay una por cada país del catálogo", () => {
    /*
      Dos listas que se separan en silencio es el defecto más repetido de este
      proyecto. Aquí la forma sería: alguien añade un país, no vuelve a correr
      `node scripts/generar-banderas.mjs`, y en la lista sale un hueco gris que
      nadie relaciona con nada.

      Las banderas van empaquetadas y no salen del código del país porque
      **en Windows eso no se ve**: ese sistema no trae la fuente de banderas y
      Chrome pinta las dos letras. Comprobado en pantalla el 05/10/2026.
    */
    const sinBandera = PAISES.filter((p) => !BANDERAS[p.codigo]).map((p) => p.nombre);
    expect(sinBandera).toEqual([]);
  });

  it("y ninguna de sobra, que sería una lista que ya no se regenera", () => {
    const delCatalogo = new Set(PAISES.map((p) => p.codigo));
    expect(Object.keys(BANDERAS).filter((c) => !delCatalogo.has(c))).toEqual([]);
  });

  it("cada una es un dibujo, no un hueco", () => {
    // Un `<svg></svg>` vacío cumpliría los dos casos de arriba.
    for (const pais of PAISES) {
      expect(BANDERAS[pais.codigo], pais.nombre).toMatch(/^<svg[^>]*viewBox=/);
      expect(BANDERAS[pais.codigo].length, pais.nombre).toBeGreaterThan(100);
    }
  });
});
