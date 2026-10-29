import { describe, expect, it } from "vitest";
import { SEMILLA } from "@/pruebas/listasDeLaBase";
import { tiposDelArea } from "./tiposDePqrs";

/**
 * Qué tipos ofrece cada área, leído de las listas de la base (28/10/2026).
 *
 * Antes era `TIPOS_POR_AREA`, escrito a mano; ahora el área dice sus tipos en
 * `extra.tipos` y el administrador puede apagar uno. Se prueba con la
 * semilla, que es lo que trae la base el primer día.
 */
const areas = SEMILLA.areas_de_pqrs ?? [];
const tipos = SEMILLA.tipos_de_pqrs ?? [];
const area = (codigo: string) => areas.find((a) => a.codigo === codigo);
const codigos = (codigo: string) => tiposDelArea(area(codigo), tipos).map((t) => t.codigo);

describe("tiposDelArea", () => {
  it("el condominio ofrece sus cuatro, en el orden de la lista de tipos", () => {
    expect(codigos("condominio")).toEqual(["pregunta", "queja", "reclamo", "sugerencia"]);
  });

  it("la aplicación es la única con «soporte»", () => {
    // El modelo de dispositivo solo se acepta ahí, y la restricción
    // `reclamo_modelo_solo_para_app` lo impone en la base.
    const conSoporte = areas.filter((a) => tiposDelArea(a, tipos).some((t) => t.codigo === "soporte"));
    expect(conSoporte.map((a) => a.codigo)).toEqual(["aplicacion"]);
  });

  it("las áreas sin tipos propios no ofrecen ninguno", () => {
    expect(codigos("constructora")).toEqual([]);
    expect(codigos("documentos_antiguos")).toEqual([]);
  });

  it("un tipo apagado no se ofrece aunque el área lo nombre", () => {
    const conConsulta = { ...area("condominio")!, extra: { tipos: ["consulta", "queja"] } };
    expect(tiposDelArea(conConsulta, tipos).map((t) => t.codigo)).toEqual(["queja"]);
  });

  it("sin área, o con un `extra` que no es una lista, no ofrece nada", () => {
    expect(tiposDelArea(undefined, tipos)).toEqual([]);
    expect(tiposDelArea({ ...area("condominio")!, extra: { tipos: "queja" } }, tipos)).toEqual([]);
  });
});
