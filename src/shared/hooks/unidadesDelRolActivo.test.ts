import { describe, expect, it } from "vitest";
import { unidadesDelRolActivo } from "./unidadesDelRolActivo";
import type { MembresiaUnidad } from "@/shared/services/sesion";

/**
 * Qué viviendas entran en el ámbito de una consulta, según el rol activo.
 *
 * La regla 8 dice que la consulta declara su ámbito porque la política no
 * conoce el rol con el que se entró. Esto es un paso más adentro: no basta con
 * separar «el condominio» de «mi vivienda», porque una misma persona puede
 * tener **dos viviendas con dos roles distintos**.
 *
 * Laura es inquilina líder de la 205 y huésped de la 102. Al entrar como
 * huésped, su lista de visitas enseñaba una de la 205, con la cabecera diciendo
 * «Torre 1 · 102». Elegir rol volvía a quedar en nada, que es justo lo que la
 * regla evita.
 *
 * Salió recorriendo la aplicación con ella: con Marcela --que es administradora
 * y propietaria-- no se ve, porque como administradora el ámbito es el
 * condominio entero y no pasa por aquí.
 */
const unidad = (
  unidadId: string,
  rol: MembresiaUnidad["rol"],
): Pick<MembresiaUnidad, "unidadId" | "rol"> => ({ unidadId, rol });

const LAURA = [
  unidad("u205", "inquilino_lider"),
  unidad("u102", "huesped_temporal"),
];

describe("las viviendas del rol activo", () => {
  it("como huésped, solo donde se aloja", () => {
    expect(unidadesDelRolActivo("huesped-temporal", LAURA)).toEqual(["u102"]);
  });

  it("como residente, solo donde vive", () => {
    expect(unidadesDelRolActivo("inquilino-lider", LAURA)).toEqual(["u205"]);
  });

  it("quien tiene dos viviendas con el mismo rol las ve juntas", () => {
    /*
      Guillermo es propietario de la 101 y de la 205: las opera las dos igual y
      ahí sí quiere verlas juntas. La separación que importa es huésped / no
      huésped, no una vivienda por pantalla.
    */
    const guillermo = [
      unidad("u101", "propietario"),
      unidad("u205", "propietario"),
    ];
    expect(unidadesDelRolActivo("propietario", guillermo)).toEqual([
      "u101",
      "u205",
    ]);
  });

  it("los demás roles de residente cuentan como residente", () => {
    /*
      `residente` y `corresidente` son personas que viven en la vivienda sin ser
      dueñas. La base los agrupa igual en `es_miembro_unidad`, que excluye **solo**
      al huésped temporal.
    */
    const conVarios = [
      unidad("u101", "residente"),
      unidad("u205", "corresidente"),
      unidad("u102", "huesped_temporal"),
    ];
    expect(unidadesDelRolActivo("propietario", conVarios)).toEqual([
      "u101",
      "u205",
    ]);
  });

  it("sin viviendas del rol no devuelve ninguna, y no todas", () => {
    /*
      El caso que importa que NO se invierta: si alguien entra como huésped y no
      tiene ninguna estancia, la respuesta es «ninguna». Devolver todas sería
      volver al defecto, y devolver «todas las que RLS permita» es lo que la
      regla 8 prohíbe.
    */
    const soloResidente = [unidad("u205", "inquilino_lider")];
    expect(unidadesDelRolActivo("huesped-temporal", soloResidente)).toEqual([]);
  });
});
