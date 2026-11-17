import { describe, expect, it } from "vitest";
import {
  barrasPorOpcion,
  explicarUmbral,
  formatearCantidad,
  fraseDeAvance,
  leerResultado,
  medirParticipacion,
  posicionDelUmbral,
  tramosDeLaBarra,
  type ResultadoDeEncuesta,
} from "./resultadoDeEncuesta";

/** Lo que devuelve `resultado_de_encuesta`, con lo mínimo cambiado por caso. */
function deLaBase(cambios: Record<string, unknown> = {}): ResultadoDeEncuesta {
  const r = leerResultado({
    quien_vota: "vivienda",
    como_se_cuenta: "igual",
    regla: "umbral",
    umbral_porcentaje: 70,
    cerrada: false,
    resultados_visibles: true,
    electores: 240,
    total_posible: 240,
    participantes: 70,
    peso_emitido: 70,
    sin_contar: 0,
    umbral_necesario: 168,
    es_si_no: true,
    opciones: [
      { id: "si", etiqueta: "Sí", votos: 40, peso: 40, es_abstencion: false },
      { id: "no", etiqueta: "No", votos: 30, peso: 30, es_abstencion: false },
    ],
    objetivo_id: "si",
    objetivo_etiqueta: "Sí",
    empate: false,
    aprobada: false,
    falta: 128,
    ...cambios,
  });
  if (!r) throw new Error("sin resultado");
  return r;
}

describe("la frase de avance", () => {
  it("dice cuántos, cuánto y cuánto falta para el umbral", () => {
    expect(fraseDeAvance(deLaBase())).toBe(
      "De 240 departamentos: 40 sí, 30 no. Aún no se aprueba: faltan 128 para llegar al 70 %.",
    );
  });

  it("aprobada cuando llega al umbral", () => {
    const r = deLaBase({ aprobada: true, falta: 0 });
    expect(fraseDeAvance(r)).toMatch(/Aprobada: superó el 70 %\.$/);
  });

  it("cerrada sin llegar: «faltaron», en pasado", () => {
    const r = deLaBase({ cerrada: true });
    expect(fraseDeAvance(r)).toMatch(/No se aprobó: faltaron 128/);
  });

  it("en mayoría simple dice quién va ganando", () => {
    const r = deLaBase({ regla: "mayoria", umbral_necesario: null, falta: null, aprobada: true });
    expect(fraseDeAvance(r)).toBe("De 240 departamentos: 40 sí, 30 no. Va ganando Sí.");
  });

  it("con índice habla del índice total, con decimales con coma", () => {
    const r = deLaBase({
      como_se_cuenta: "indice",
      total_posible: 6.5,
      umbral_necesario: 4.55,
      falta: 1.55,
      opciones: [
        { id: "si", etiqueta: "Sí", votos: 2, peso: 3, es_abstencion: false },
        { id: "no", etiqueta: "No", votos: 1, peso: 1.5, es_abstencion: false },
      ],
    });
    expect(fraseDeAvance(r)).toBe(
      "Del índice total del edificio (6,5): 3 sí, 1,5 no. Aún no se aprueba: faltan 1,55 para llegar al 70 %.",
    );
  });

  it("cada residente: habla de residentes con derecho a voto", () => {
    const r = deLaBase({ quien_vota: "residente", electores: 30, total_posible: 30 });
    expect(fraseDeAvance(r)).toMatch(/^De 30 residentes con derecho a voto:/);
  });

  it("con los resultados ocultos no dice qué se votó, solo cuántos", () => {
    const r = deLaBase({
      resultados_visibles: false,
      opciones: [{ id: "si", etiqueta: "Sí" }, { id: "no", etiqueta: "No" }],
      aprobada: null,
      falta: null,
    });
    const frase = fraseDeAvance(r);
    expect(frase).toMatch(/ya votaron 70/);
    expect(frase).not.toMatch(/ sí|30 no/);
  });

  it("varias opciones: nombra la que va primero", () => {
    const r = deLaBase({
      regla: "mayoria",
      es_si_no: false,
      opciones: [
        { id: "a", etiqueta: "Piscina", votos: 12, peso: 12, es_abstencion: false },
        { id: "b", etiqueta: "Gimnasio", votos: 8, peso: 8, es_abstencion: false },
      ],
      objetivo_id: "a",
      objetivo_etiqueta: "Piscina",
      aprobada: true,
    });
    expect(fraseDeAvance(r)).toBe("De 240 departamentos: Piscina 12, Gimnasio 8. Va ganando «Piscina».");
  });

  it("un empate no se presenta como victoria", () => {
    const r = deLaBase({ regla: "mayoria", empate: true, aprobada: false });
    expect(fraseDeAvance(r)).toMatch(/Van empatados\.$/);
  });
});

describe("la barra", () => {
  it("Sí, No y lo que falta suman el total, en ese orden", () => {
    const tramos = tramosDeLaBarra(deLaBase());
    expect(tramos.map((t) => t.tono)).toEqual(["si", "no", "falta"]);
    expect(tramos[0].ancho).toBeCloseTo((40 / 240) * 100);
    expect(tramos.reduce((s, t) => s + t.ancho, 0)).toBeCloseTo(100);
  });

  it("el Sí va primero aunque la base lo mande después", () => {
    const r = deLaBase({
      opciones: [
        { id: "no", etiqueta: "No", votos: 30, peso: 30, es_abstencion: false },
        { id: "ab", etiqueta: "Abstención", votos: 5, peso: 5, es_abstencion: true },
        { id: "si", etiqueta: "Sí", votos: 40, peso: 40, es_abstencion: false },
      ],
    });
    expect(tramosDeLaBarra(r).map((t) => t.tono)).toEqual(["si", "no", "otro", "falta"]);
  });

  it("la marca del umbral cae en su porcentaje del total", () => {
    expect(posicionDelUmbral(deLaBase())).toBeCloseTo(70);
  });

  it("en mayoría simple no hay marca", () => {
    expect(posicionDelUmbral(deLaBase({ regla: "mayoria", umbral_necesario: null }))).toBeNull();
  });

  it("sin total no divide por cero", () => {
    const r = deLaBase({ total_posible: 0, electores: 0 });
    expect(tramosDeLaBarra(r).every((t) => Number.isFinite(t.ancho))).toBe(true);
  });

  it("barras por opción, con la que va primero marcada", () => {
    const r = deLaBase({
      es_si_no: false,
      opciones: [
        { id: "a", etiqueta: "Piscina", votos: 12, peso: 12, es_abstencion: false },
        { id: "b", etiqueta: "Gimnasio", votos: 0, peso: 0, es_abstencion: false },
      ],
      objetivo_id: "a",
    });
    const barras = barrasPorOpcion(r);
    expect(barras[0]).toMatchObject({ lider: true, ancho: 5, valor: "12" });
    expect(barras[1].lider).toBe(false);
  });
});

describe("participación para la administración", () => {
  it("cuántos faltan y qué porcentaje votó", () => {
    expect(medirParticipacion({ participantes: 70, electores: 240 })).toEqual({
      votaron: 70,
      de: 240,
      faltan: 170,
      porcentaje: 29,
    });
  });
});

describe("formatearCantidad", () => {
  it("enteros sin decimales y el resto con coma", () => {
    expect(formatearCantidad(3)).toBe("3");
    expect(formatearCantidad(1.5)).toBe("1,5");
    expect(formatearCantidad(1.256)).toBe("1,26");
  });
});

describe("leerResultado", () => {
  it("sin respuesta de la base, nada", () => {
    expect(leerResultado(null)).toBeNull();
  });
});

describe("explicarUmbral", () => {
  it("dice contra qué total se mide, según quién vota y cómo se cuenta", () => {
    expect(explicarUmbral("vivienda", "igual", "70")).toMatch(/70 % de todos los departamentos/);
    expect(explicarUmbral("vivienda", "indice", "70")).toMatch(/del índice total/);
    expect(explicarUmbral("residente", "indice", "70")).toMatch(/residentes con derecho/);
  });
});
