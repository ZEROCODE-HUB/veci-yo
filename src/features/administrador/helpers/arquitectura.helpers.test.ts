import { describe, expect, it } from "vitest";
import {
  codigoConNivel,
  garitasQueFaltan,
  nivelesSugeridos,
  planDeEstacionamientos,
  planDeTorre,
  resumenDeEstacionamientos,
  resumenDeTorre,
  siguientesCodigos,
} from "./arquitectura.helpers";

/**
 * Lo que se crea al dar de alta una torre (16/11/2026). El cliente: «pone 3
 * departamentos del piso 5 al 7, ah entonces se van a crear 9».
 */
describe("los departamentos de una torre", () => {
  it("3 por piso del 5 al 7 son 9, con su piso", () => {
    const { viviendas, motivo } = planDeTorre(
      { desde: "5", hasta: "7", porPiso: "3", numeracion: "numero" },
      500,
    );
    expect(motivo).toBe("");
    expect(viviendas.map((v) => v.codigo)).toEqual([
      "501", "502", "503", "601", "602", "603", "701", "702", "703",
    ]);
    expect(viviendas.map((v) => v.piso)).toEqual([5, 5, 5, 6, 6, 6, 7, 7, 7]);
  });

  it("con letras: 5A a 7C, y el piso no se adivina dividiendo", () => {
    const { viviendas } = planDeTorre(
      { desde: 5, hasta: 7, porPiso: 3, numeracion: "letra" },
      500,
    );
    expect(viviendas.map((v) => v.codigo)).toEqual([
      "5A", "5B", "5C", "6A", "6B", "6C", "7A", "7B", "7C",
    ]);
    expect(viviendas.find((v) => v.codigo === "7B")?.piso).toBe(7);
  });

  it("del piso 10 en adelante el código sigue siendo piso + puerta", () => {
    const { viviendas } = planDeTorre({ desde: 10, hasta: 10, porPiso: 2, numeracion: "numero" }, 500);
    expect(viviendas).toEqual([
      { codigo: "1001", piso: 10 },
      { codigo: "1002", piso: 10 },
    ]);
  });

  it("todo vacío no crea nada y no se queja: la torre puede ir sin departamentos", () => {
    expect(planDeTorre({ desde: "", hasta: "", porPiso: "", numeracion: "numero" }, 500)).toEqual({
      viviendas: [],
      motivo: "",
    });
  });

  it("lo que no vale dice por qué en vez de no crear nada en silencio", () => {
    const tope = 500;
    expect(planDeTorre({ desde: "7", hasta: "5", porPiso: "3", numeracion: "numero" }, tope).motivo).toMatch(/menor/);
    expect(planDeTorre({ desde: "5", hasta: "", porPiso: "3", numeracion: "numero" }, tope).motivo).toMatch(/Completa/);
    expect(planDeTorre({ desde: "1", hasta: "2", porPiso: "27", numeracion: "letra" }, tope).motivo).toMatch(/26/);
    expect(planDeTorre({ desde: "1", hasta: "50", porPiso: "20", numeracion: "numero" }, tope).motivo).toMatch(/máximo 500/);
  });

  it("la vista previa cuenta y enseña los tramos de cada piso", () => {
    const { viviendas } = planDeTorre({ desde: 5, hasta: 7, porPiso: 3, numeracion: "numero" }, 500);
    expect(resumenDeTorre(viviendas)).toBe(
      "Se crearán 9 departamentos: pisos 5 a 7, 3 por piso (501–503, 601–603, 701–703)",
    );
    const letras = planDeTorre({ desde: 5, hasta: 7, porPiso: 3, numeracion: "letra" }, 500).viviendas;
    expect(resumenDeTorre(letras)).toContain("(5A–5C, 6A–6C, 7A–7C)");
  });

  it("con muchos pisos recorta el medio", () => {
    const { viviendas } = planDeTorre({ desde: 1, hasta: 20, porPiso: 4, numeracion: "numero" }, 500);
    expect(resumenDeTorre(viviendas)).toBe(
      "Se crearán 80 departamentos: pisos 1 a 20, 4 por piso (101–104, 201–204, …, 2001–2004)",
    );
  });
});

describe("los códigos de los estacionamientos de un nivel", () => {
  it("privados S1-01… y de visita S1-V01…", () => {
    expect(siguientesCodigos("S1", "privado", 3, [])).toEqual(["S1-01", "S1-02", "S1-03"]);
    expect(siguientesCodigos("S1", "visitante", 2, [])).toEqual(["S1-V01", "S1-V02"]);
  });

  it("siguen la numeración que ya hay, sin mezclar privados y de visita", () => {
    const hay = ["S1-01", "S1-07", "S1-V02", "S2-15", "T1-P01"];
    expect(siguientesCodigos("S1", "privado", 2, hay)).toEqual(["S1-08", "S1-09"]);
    expect(siguientesCodigos("S1", "visitante", 1, hay)).toEqual(["S1-V03"]);
    expect(siguientesCodigos("S2", "privado", 1, hay)).toEqual(["S2-16"]);
  });

  it("el plan reparte por filas, salta las vacías y lo resume", () => {
    const plan = planDeEstacionamientos(
      [
        { nombre: "Sótano 1", nomenclatura: "S1", privados: 20, visita: 5 },
        { nombre: "Sótano 2", nomenclatura: "S2", privados: 0, visita: 0 },
      ],
      [],
    );
    expect(plan).toHaveLength(1);
    expect(plan[0].codigosPrivados[19]).toBe("S1-20");
    expect(resumenDeEstacionamientos(plan)).toBe(
      "Se crearán 25 estacionamientos: S1-01 a S1-20, S1-V01 a S1-V05",
    );
  });

  it("dos filas del mismo nivel no chocan", () => {
    const plan = planDeEstacionamientos(
      [
        { nombre: "Sótano 1", nomenclatura: "S1", privados: 2, visita: 0 },
        { nombre: "Sótano 1", nomenclatura: "S1", privados: 1, visita: 0 },
      ],
      ["S1-01"],
    );
    expect(plan.flatMap((p) => p.codigosPrivados)).toEqual(["S1-02", "S1-03", "S1-04"]);
  });

  it("el código se muestra con su nivel", () => {
    expect(codigoConNivel("S1-03", "Sótano 1")).toBe("S1-03 · Sótano 1");
    expect(codigoConNivel("T1-P01", null)).toBe("T1-P01");
  });
});

describe("los niveles sugeridos", () => {
  it("Sótano 1…N y Primer piso, sin repetir los que ya hay", () => {
    expect(nivelesSugeridos(2, []).map((n) => n.nomenclatura)).toEqual(["S1", "S2", "P1"]);
    expect(nivelesSugeridos(2, [{ nomenclatura: "S1" }]).map((n) => n.nombre)).toEqual([
      "Sótano 2",
      "Primer piso",
    ]);
    expect(nivelesSugeridos(0, []).map((n) => n.nombre)).toEqual(["Primer piso"]);
  });
});

describe("las garitas que faltan", () => {
  const torres = [
    { uuid: "t1", numero: 1, nombre: "Torre 1" },
    { uuid: "t2", numero: 2, nombre: "Los Pinos" },
  ];

  it("modelo A: la principal y una por torre", () => {
    expect(garitasQueFaltan("por_torre", torres, []).map((g) => g.nombre)).toEqual([
      "Garita principal",
      "Garita Torre 1",
      "Garita Los Pinos",
    ]);
  });

  it("modelo B: la principal y la vehicular", () => {
    expect(garitasQueFaltan("vehicular", torres, []).map((g) => [g.nombre, g.tipo])).toEqual([
      ["Garita principal", "entrada_principal"],
      ["Garita vehicular", "acceso_vehicular"],
    ]);
  });

  it("solo crea las que faltan", () => {
    const hay = [
      { tipo: "entrada_principal" },
      { tipo: "garita_torre", torreId: "t1" },
    ];
    expect(garitasQueFaltan("por_torre", torres, hay)).toEqual([
      { clave: "torre:t2", nombre: "Garita Los Pinos", tipo: "garita_torre", torreId: "t2" },
    ]);
    expect(garitasQueFaltan("vehicular", torres, [...hay, { tipo: "acceso_vehicular" }])).toEqual([]);
  });
});
