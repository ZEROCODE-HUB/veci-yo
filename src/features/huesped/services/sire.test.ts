import { describe, expect, it } from "vitest";
import {
  archivoSire,
  loQueFaltaSire,
  quienNecesitaSire,
  SIRE_PROVISIONAL,
} from "../../../../supabase/functions/_compartido/sire";

/**
 * A quién hay que reportar a Migración Colombia.
 *
 * Esta es la parte del SIRE que **sí** se puede dar por buena sin el
 * instructivo oficial: a quién, cuándo y con qué datos está en el ABC público.
 * Lo que está por confirmar es la forma del archivo, y eso está marcado aparte.
 *
 * Importa acertar: no reportar tiene multas de 5 a 131 millones de pesos, y
 * reportar a un colombiano a Migración es meter en un registro de extranjeros a
 * quien no lo es.
 */

const COLOMBIANA = {
  nombres: "Marcela",
  apellidos: "Sierra",
  tipoDocumento: "cedula_ciudadania",
  documento: "52000111",
  fechaNacimiento: "1985-04-10",
  nacionalidad: "CO",
  direccionEnColombia: "Las Barranqueras 246",
};

const PERUANO = {
  ...COLOMBIANA,
  nombres: "Bruno",
  apellidos: "Salas",
  tipoDocumento: "pasaporte",
  documento: "XP998877",
  nacionalidad: "PE",
};

/** Alguien a quien nadie le preguntó de dónde es. */
const SIN_NACIONALIDAD = { ...PERUANO, nombres: "Quien sabe", nacionalidad: null };

describe("a quién se reporta al SIRE", () => {
  it("a los extranjeros, y solo a ellos", () => {
    const { reportables } = quienNecesitaSire([COLOMBIANA, PERUANO], "CO");

    expect(reportables).toHaveLength(1);
    expect(reportables[0].nombres).toBe("Bruno");
  });

  it("a nadie si el alojamiento no está en Colombia", () => {
    /*
      El SIRE es colombiano y este producto también opera en Perú. Sin esta
      regla, un edificio de Lima mandaría a Migración Colombia a todos sus
      huéspedes peruanos —que allí no son extranjeros— y a los colombianos no.
    */
    const { reportables } = quienNecesitaSire([COLOMBIANA, PERUANO], "PE");
    expect(reportables).toEqual([]);
  });

  it("y a quien no dijo su nacionalidad NO se le adivina", () => {
    /*
      Suponerla por el tipo de documento parece razonable y es falso: un
      colombiano puede entrar con pasaporte. Equivocarse aquí es, o no reportar
      a quien tocaba, o meter a un nacional en un registro de extranjeros.

      Así que no entra en la lista de reportables **y** se señala, para que el
      anfitrión pueda preguntárselo.
    */
    const { reportables, sinNacionalidad } = quienNecesitaSire(
      [COLOMBIANA, PERUANO, SIN_NACIONALIDAD],
      "CO",
    );

    expect(reportables.map((p) => p.nombres)).toEqual(["Bruno"]);
    expect(sinNacionalidad.map((p) => p.nombres)).toEqual(["Quien sabe"]);
  });

  it("una nacionalidad en minúsculas cuenta igual", () => {
    const { reportables } = quienNecesitaSire(
      [{ ...PERUANO, nacionalidad: "pe" }, { ...COLOMBIANA, nacionalidad: "co" }],
      "co",
    );
    expect(reportables).toHaveLength(1);
  });
});

describe("lo que falta para reportar a alguien", () => {
  it("con todo puesto, nada", () => {
    expect(loQueFaltaSire(PERUANO)).toEqual([]);
  });

  it("la fecha de nacimiento es obligatoria, y casi nunca se llena", () => {
    /*
      Es la que más falta: el formulario del preregistro la pide y nadie la
      rellena porque no es obvia para qué sirve. La pide el ABC.
    */
    const faltan = loQueFaltaSire({ ...PERUANO, fechaNacimiento: null });
    expect(faltan).toContain("la fecha de nacimiento");
  });

  it("y las dice todas de una vez", () => {
    const faltan = loQueFaltaSire({
      ...PERUANO,
      apellidos: "  ",
      documento: null,
      fechaNacimiento: null,
    });
    expect(faltan).toHaveLength(3);
  });
});

describe("el archivo", () => {
  it("lleva dentro que el formato está sin confirmar", () => {
    /*
      Mientras no haya instructivo oficial, el archivo lo dice. Alguien que lo
      suba al portal tiene que saber que esto es un borrador, no un entregable.
      Es la diferencia entre una simulación honesta y un servicio que finge.
    */
    const texto = archivoSire([PERUANO], "entrada", "2026-11-15");
    expect(texto).toContain(SIRE_PROVISIONAL);
  });

  it("distingue la entrada de la salida", () => {
    const entrada = archivoSire([PERUANO], "entrada", "2026-11-15");
    const salida = archivoSire([PERUANO], "salida", "2026-11-18");

    // El SIRE pide los dos movimientos, no uno.
    expect(entrada).not.toBe(salida);
    expect(entrada.split("\n")[1]).toContain("|I|");
    expect(salida.split("\n")[1]).toContain("|S|");
  });

  it("una línea por persona", () => {
    const texto = archivoSire([PERUANO, { ...PERUANO, nombres: "Otro" }], "entrada", "2026-11-15");
    // La cabecera más dos.
    expect(texto.split("\n")).toHaveLength(3);
  });
});
