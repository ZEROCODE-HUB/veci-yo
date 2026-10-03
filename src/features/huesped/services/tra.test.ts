import { describe, expect, it } from "vitest";
/*
  El modulo que de verdad corre en la funcion que reporta, no una copia. Mismo
  patron que el calendario y que el precheckin de la web.
*/
import {
  cuerpoAcompanante,
  cuerpoPrincipal,
  loQueFalta,
} from "../../../../supabase/functions/_compartido/tra";

/**
 * El cuerpo que se le manda al ministerio.
 *
 * Esto se prueba con cuidado porque el que recibe al otro lado es el Estado: no
 * hay forma de preguntarle qué le pareció, su error no dice qué campo está mal,
 * y un reporte que no sale a tiempo tiene multa.
 */

const PERSONA = {
  nombres: "Camila",
  apellidos: "Rojas",
  tipoDocumento: "cedula_ciudadania",
  documento: "1020304050",
  ciudadResidencia: "Medellín",
  ciudadProcedencia: "Lima",
};

const ESTANCIA = {
  numeroHabitacion: "102",
  checkIn: "2026-11-15",
  checkOut: "2026-11-18",
  motivo: "turismo",
  numeroAcompanantes: 2,
  tipoAcomodacion: "Apartamento",
  costo: 850000,
  nombreEstablecimiento: "Las Barranqueras 246",
  rnt: "123456",
};

describe("el cuerpo del huésped principal", () => {
  it("manda las ciudades con la errata del ministerio", () => {
    /*
      `cuidad_residencia`, no `ciudad`. Así se llama en la API del MinCIT, y
      mandarlo bien escrito es mandarlo a un campo que no existe: el reporte se
      acepta y la ciudad llega vacía.

      Este caso está escrito para que alguien que «arregle la falta de ortografía»
      lo rompa y se entere en el acto.
    */
    const cuerpo = cuerpoPrincipal(PERSONA, ESTANCIA);

    expect(cuerpo).toHaveProperty("cuidad_residencia", "Medellín");
    expect(cuerpo).toHaveProperty("cuidad_procedencia", "Lima");
    expect(cuerpo).not.toHaveProperty("ciudad_residencia");
    expect(cuerpo).not.toHaveProperty("ciudad_procedencia");
  });

  it("traduce el documento a las siglas del ministerio", () => {
    expect(cuerpoPrincipal(PERSONA, ESTANCIA).tipo_identificacion).toBe("C.C");

    expect(
      cuerpoPrincipal(
        { ...PERSONA, tipoDocumento: "cedula_extranjeria" },
        ESTANCIA,
      ).tipo_identificacion,
    ).toBe("C.E");
  });

  it("y un documento peruano va como pasaporte, que es como entra un extranjero", () => {
    /*
      El enum de la base nombra documentos de Colombia y de Perú porque el
      producto opera en los dos. La TRA es colombiana y no conoce el DNI: sin
      traducirlo, llegaría la cadena `dni` y el ministerio la rechazaría.
    */
    for (const documento of ["dni", "carne_extranjeria", "pep"]) {
      expect(
        cuerpoPrincipal({ ...PERSONA, tipoDocumento: documento }, ESTANCIA)
          .tipo_identificacion,
      ).toBe("Pasaporte");
    }
  });

  it("el costo va como texto y sin decimales", () => {
    // El ministerio lo declara como texto aunque sea dinero.
    const cuerpo = cuerpoPrincipal(PERSONA, { ...ESTANCIA, costo: 850000.4 });
    expect(cuerpo.costo).toBe("850000");
    expect(typeof cuerpo.costo).toBe("string");
  });

  it("manda los quince campos que pide la resolución, ni uno menos", () => {
    /*
      La lista entera, para que quitar uno sin darse cuenta se note aquí y no en
      un rechazo del ministerio tres semanas después.
    */
    const cuerpo = cuerpoPrincipal(PERSONA, ESTANCIA);
    expect(Object.keys(cuerpo).sort()).toEqual(
      [
        "apellidos",
        "check_in",
        "check_out",
        "costo",
        "cuidad_procedencia",
        "cuidad_residencia",
        "motivo",
        "nombre_establecimiento",
        "nombres",
        "numero_acompanantes",
        "numero_habitacion",
        "numero_identificacion",
        "rnt_establecimiento",
        "tipo_acomodacion",
        "tipo_identificacion",
      ].sort(),
    );
  });
});

describe("el cuerpo de un acompañante", () => {
  it("lleva el código del principal como padre", () => {
    /*
      Es lo que los agrupa en una sola estancia. Sin el `padre`, el ministerio
      recibe cuatro personas sueltas que durmieron el mismo día en el mismo
      sitio y no sabe que son una familia.
    */
    const cuerpo = cuerpoAcompanante(PERSONA, ESTANCIA, 19);
    expect(cuerpo.padre).toBe(19);
    expect(typeof cuerpo.padre).toBe("number");
  });

  it("y no lleva lo que es de la reserva entera", () => {
    // El costo, el motivo y el RNT se declaran una vez, en el principal.
    const cuerpo = cuerpoAcompanante(PERSONA, ESTANCIA, 19);
    expect(cuerpo).not.toHaveProperty("costo");
    expect(cuerpo).not.toHaveProperty("motivo");
    expect(cuerpo).not.toHaveProperty("rnt_establecimiento");
    expect(cuerpo).not.toHaveProperty("numero_acompanantes");
  });
});

describe("lo que falta antes de salir a internet", () => {
  it("con todo puesto, no falta nada", () => {
    expect(loQueFalta(PERSONA, ESTANCIA)).toEqual([]);
  });

  it("dice todo lo que falta de una vez, no el primero", () => {
    /*
      El anfitrión tiene que poder arreglarlo en una pasada. El error del
      ministerio no distingue qué campo está mal, así que si esto devolviera uno
      cada vez, haría falta reportar cinco veces para enterarse de cinco faltas.
    */
    const faltan = loQueFalta(
      { ...PERSONA, ciudadResidencia: null, ciudadProcedencia: "  " },
      { ...ESTANCIA, costo: null, rnt: null },
    );

    expect(faltan).toHaveLength(4);
    expect(faltan.join(" ")).toContain("ciudad donde vive");
    expect(faltan.join(" ")).toContain("ciudad de donde viene");
    expect(faltan.join(" ")).toContain("costo");
    expect(faltan.join(" ")).toContain("RNT");
  });

  it("un costo en cero sí vale: hay estancias que no se cobran", () => {
    // Null es «nadie lo escribió». Cero es «no se cobró», y es un dato.
    expect(loQueFalta(PERSONA, { ...ESTANCIA, costo: 0 })).toEqual([]);
  });
});
