import { describe, expect, it } from "vitest";
import {
  haciaElFormulario,
  haciaLaBase,
  VISITAS_DE_HUESPED,
  VISITAS_POR_DEFECTO,
} from "./visitasDeHuesped";

/**
 * El defecto que estas pruebas cierran no se veía con dos opciones de tres
 * funcionando: había que elegir justo la tercera, guardar, salir y volver.
 * Lo que se comprueba es que el viaje de ida y vuelta es completo para
 * **todas**, no que el diccionario tenga las entradas que se esperan.
 */
describe("el vocabulario de las visitas de huéspedes", () => {
  it("cada opción vuelve entera de la base", () => {
    for (const opcion of VISITAS_DE_HUESPED) {
      expect(haciaLaBase(opcion.valor)).toBe(opcion.enLaBase);
      expect(haciaElFormulario(opcion.enLaBase)).toBe(opcion.valor);
    }
  });

  it("las tres son distintas en los dos idiomas", () => {
    const valores = VISITAS_DE_HUESPED.map((o) => o.valor);
    const enBase = VISITAS_DE_HUESPED.map((o) => o.enLaBase);
    expect(new Set(valores).size).toBe(VISITAS_DE_HUESPED.length);
    expect(new Set(enBase).size).toBe(VISITAS_DE_HUESPED.length);
  });

  it("y siguen siendo las tres del enum de la base", () => {
    /*
      Si alguien añade un valor a `visitas_de_huesped` en una migración, esta
      prueba cae y obliga a darle etiqueta aquí en vez de dejarlo sin pintar.
    */
    expect(VISITAS_DE_HUESPED.map((o) => o.enLaBase).sort()).toEqual([
      "aprobar_cada_uno",
      "permitir_todos",
      "prohibir_todos",
    ]);
  });

  it("lo que no se sabe traducir no se manda a la base", () => {
    // `null` es «no toques la columna». Mandar un valor inventado la haría
    // fallar; mandar el primero de la lista cambiaría la regla a espaldas del
    // anfitrión.
    expect(haciaLaBase("aprobar-por-huesped")).toBeNull();
    expect(haciaLaBase("")).toBeNull();
  });

  it("y lo que la base no dice arranca en la opción por defecto", () => {
    expect(haciaElFormulario(null)).toBe(VISITAS_POR_DEFECTO);
    expect(haciaElFormulario(undefined)).toBe(VISITAS_POR_DEFECTO);
    expect(haciaElFormulario("cualquier_cosa")).toBe(VISITAS_POR_DEFECTO);
  });
});
