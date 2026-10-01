import { describe, expect, it } from "vitest";
import { esNoResidente } from "./noResidente";

/**
 * El dueño que no vive en su vivienda.
 *
 * La regla decidía si se le ocultan la correspondencia, las visitas y las zonas
 * comunes, que son de quien vive allí. Estaba escrita como
 * `rolActivo === "propietario" && !esResidente`, y a quien de verdad no reside
 * la sesión le da el rol `propietario-no-residente`: la primera mitad era falsa
 * justo para la persona a la que apuntaba, así que **no se aplicaba a nadie**.
 *
 * Salió recorriendo la aplicación con Guillermo puesto como no residente: el
 * menú le salía entero. El código que oculta los módulos existía y era
 * correcto; lo que no llegaba era la condición.
 */
describe("si es dueño pero no vive en la vivienda", () => {
  it("con el rol de no residente, sí", () => {
    // El caso que nunca llegaba: es el rol que la sesión le da a esa persona.
    expect(esNoResidente("propietario-no-residente", false)).toBe(true);
  });

  it("y aunque la vivienda activa diga que sí reside", () => {
    /*
      El rol manda sobre el dato de la vivienda. Si alguien entra con este rol
      es porque **ninguna** de sus viviendas es de vivir; que una fila diga otra
      cosa sería una incoherencia, y ante la duda se restringe.
    */
    expect(esNoResidente("propietario-no-residente", true)).toBe(true);
  });

  it("el propietario que vive allí ve todo", () => {
    expect(esNoResidente("propietario", true)).toBe(false);
  });

  it("y el que tiene dos viviendas, según cuál esté mirando", () => {
    /*
      Quien tiene una donde vive y otra que no, entra como `propietario` a
      secas --porque una sí es de vivir-- y lo que decide entonces es la
      vivienda activa. Sin esta mitad, cambiar de vivienda no cambiaría nada.
    */
    expect(esNoResidente("propietario", false)).toBe(true);
  });

  it("los demás roles no son propietarios que no residen", () => {
    /*
      Ni el huésped ni la portería ni la administración: cada uno tiene su
      propia lista de módulos, y colarlos aquí les quitaría los suyos.
    */
    expect(esNoResidente("huesped-temporal", false)).toBe(false);
    expect(esNoResidente("guardia", false)).toBe(false);
    expect(esNoResidente("administrador", false)).toBe(false);
    expect(esNoResidente("inquilino-lider", false)).toBe(false);
    expect(esNoResidente(null, false)).toBe(false);
  });
});
