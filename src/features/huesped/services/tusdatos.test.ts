import { describe, expect, it } from "vitest";
/*
  El modulo que de verdad corre en la funcion que verifica, no una copia. Mismo
  patron que la TRA y que el calendario.
*/
import {
  esAmbienteDePruebas,
  fechaParaTusdatos,
  leerResultado,
  pideFechaDeExpedicion,
  tipoDocumentoDeTusdatos,
  URL_DE_PRODUCCION,
  URL_DE_PRUEBAS,
  veredicto,
} from "../../../../supabase/functions/_compartido/tusdatos";

/**
 * Lo que se anota de una consulta de antecedentes.
 *
 * Las respuestas de aquí **no están inventadas**: son las que devolvió el
 * ambiente de pruebas de tusdatos el 13/10/2026 con sus documentos de ejemplo,
 * recortadas en la lista de fuentes. Se guardan porque la primera versión de
 * este cliente se escribió leyendo la documentación y sin llamarlos, y leía un
 * campo que no viene: todo habría acabado en «error del proveedor».
 */

/** `GET /api/results/…` de la cédula 111: hallazgos en todas las fuentes. */
const CON_HALLAZGOS = {
  cedula: 111,
  error: false,
  errores: [],
  estado: "finalizado",
  hallazgo: true,
  hallazgos: "Alto",
  id: "651c2ede72476080772781f5",
  nombre: "MIGUEL FERNANDO PEREZ GOMEZ",
  results: { "Policia Nacional de Colombia": true },
  time: 42.67135,
  typedoc: "CC",
  validado: true,
};

/** La 112: limpia. */
const LIMPIA = {
  cedula: 112,
  error: false,
  errores: [],
  estado: "finalizado",
  hallazgo: false,
  hallazgos: "",
  id: "8188f7e8aa70102bf2053f32",
  nombre: "MIGUEL FERNANDO PEREZ GOMEZ",
  results: { "Policia Nacional de Colombia": false },
  typedoc: "CC",
  validado: true,
};

/** La 113: no respondió ninguna fuente. Y aun así dice «finalizado». */
const TODO_CAIDO = {
  cedula: 113,
  error: true,
  errores: ["cidob", "delitos_sexuales", "inpec", "interpol", "ofac", "policia", "procuraduria"],
  estado: "finalizado",
  hallazgo: false,
  hallazgos: "",
  id: "d9530d51473cf57e73945088",
  nombre: "MIGUEL FERNANDO PEREZ GOMEZ",
  results: { "Policia Nacional de Colombia": "Error" },
  typedoc: "CC",
  validado: true,
};

/** Su ejemplo de cédula de extranjería: `hallazgo` y `hallazgos` no coinciden. */
const EXTRANJERIA = {
  cedula: 960696,
  error: false,
  errores: [],
  estado: "finalizado",
  hallazgo: false,
  hallazgos: "bajo",
  id: "5dacf8f0ca6469492f3736d8",
  nombre: "MATILDA COLLEEN WILLARD",
  results: { Policia: false },
  typedoc: "CE",
};

describe("leer la respuesta de tusdatos", () => {
  it("saca el nivel, el reporte y las fuentes caídas", () => {
    const r = leerResultado(200, CON_HALLAZGOS);
    expect(r.estado).toBe("finalizado");
    expect(r.nivel).toBe("alto");
    expect(r.reporteId).toBe("651c2ede72476080772781f5");
    expect(r.fuentesConError).toEqual([]);
    expect(r.validado).toBe(true);
  });

  it("el nivel vacío es «ninguno», no «no se sabe»", () => {
    expect(leerResultado(200, LIMPIA).nivel).toBe("ninguno");
  });

  it("manda el nivel aunque el sí o no diga otra cosa", () => {
    expect(leerResultado(200, EXTRANJERIA).nivel).toBe("bajo");
  });

  it("un nivel que no conoce no lo adivina", () => {
    expect(leerResultado(200, { ...LIMPIA, hallazgos: "critico" }).nivel).toBeNull();
    expect(leerResultado(200, { ...LIMPIA, hallazgos: undefined }).nivel).toBeNull();
  });

  it("distingue seguir procesando, caducar y fallar", () => {
    expect(leerResultado(207, { estado: "procesando" }).estado).toBe("procesando");
    expect(leerResultado(404, { estado: "error, tarea no valida" }).estado).toBe("caducada");
    expect(leerResultado(500, { estado: "error, consulta fallida" }).estado).toBe("fallida");
  });
});

describe("qué se anota de una consulta", () => {
  it("un hallazgo alto marca a la persona", () => {
    expect(veredicto(leerResultado(200, CON_HALLAZGOS)).resultado).toBe("rechazada");
  });

  it("sin hallazgos y con todas las fuentes, se aprueba", () => {
    expect(veredicto(leerResultado(200, LIMPIA)).resultado).toBe("aprobada");
  });

  it("un hallazgo bajo no marca a nadie", () => {
    expect(veredicto(leerResultado(200, EXTRANJERIA)).resultado).toBe("aprobada");
  });

  it("con las fuentes caídas NO se aprueba, aunque diga «sin hallazgos»", () => {
    /*
      El caso por el que existe `veredicto`. Su respuesta trae
      `estado: finalizado` y `hallazgo: false`: quien lea solo eso da por buena
      a una persona a la que no se miró en ningún sitio.
    */
    const v = veredicto(leerResultado(200, TODO_CAIDO));
    expect(v.resultado).toBe("error_proveedor");
    expect(v.motivo).toMatch(/incompleta/i);
    expect(v.motivo).toMatch(/policia/);
  });

  it("que falle una fuente que no es de antecedentes no lo impide", () => {
    const r = leerResultado(200, { ...LIMPIA, error: true, errores: ["simit", "sena"] });
    expect(veredicto(r).resultado).toBe("aprobada");
  });

  it("un hallazgo alto lo es aunque otra fuente haya fallado", () => {
    const r = leerResultado(200, { ...CON_HALLAZGOS, error: true, errores: ["policia"] });
    expect(veredicto(r).resultado).toBe("rechazada");
  });

  it("un documento que no se pudo comprobar no se aprueba", () => {
    const v = veredicto(leerResultado(200, { ...LIMPIA, validado: false }));
    expect(v.resultado).toBe("error_proveedor");
    expect(v.motivo).toMatch(/documento/i);
  });

  it("lo que no se entiende tampoco", () => {
    const r = leerResultado(200, { ...LIMPIA, hallazgos: "critico" });
    expect(veredicto(r).resultado).toBe("error_proveedor");
  });

  it("procesando sigue pendiente; caducada y fallida son error", () => {
    expect(veredicto(leerResultado(207, {})).resultado).toBe("pendiente");
    expect(veredicto(leerResultado(404, {})).resultado).toBe("error_proveedor");
    expect(veredicto(leerResultado(500, {})).resultado).toBe("error_proveedor");
  });
});

describe("lo que se manda", () => {
  it("traduce nuestros tipos de documento a los suyos", () => {
    expect(tipoDocumentoDeTusdatos("cedula_ciudadania")).toBe("CC");
    expect(tipoDocumentoDeTusdatos("cedula_extranjeria")).toBe("CE");
    expect(tipoDocumentoDeTusdatos("pasaporte")).toBe("PP");
    expect(tipoDocumentoDeTusdatos("ppt")).toBe("PPT");
  });

  it("el PEP no se consulta: dejó de valer en marzo de 2023", () => {
    expect(tipoDocumentoDeTusdatos("pep")).toBeNull();
    expect(tipoDocumentoDeTusdatos("tarjeta_identidad")).toBeNull();
    expect(tipoDocumentoDeTusdatos(null)).toBeNull();
  });

  it("la fecha de expedición es obligatoria para extranjería y PPT", () => {
    expect(pideFechaDeExpedicion("CE")).toBe(true);
    expect(pideFechaDeExpedicion("PPT")).toBe(true);
    expect(pideFechaDeExpedicion("CC")).toBe(false);
    expect(pideFechaDeExpedicion("PP")).toBe(false);
  });

  it("la fecha va como día/mes/año", () => {
    expect(fechaParaTusdatos("2014-12-01")).toBe("01/12/2014");
    expect(fechaParaTusdatos("01/12/2014")).toBe("01/12/2014");
    expect(fechaParaTusdatos("")).toBeNull();
    expect(fechaParaTusdatos("ayer")).toBeNull();
  });

  it("sabe cuándo está hablando con el ambiente de pruebas", () => {
    expect(esAmbienteDePruebas(URL_DE_PRUEBAS)).toBe(true);
    expect(esAmbienteDePruebas(`${URL_DE_PRUEBAS}/`)).toBe(true);
    expect(esAmbienteDePruebas(URL_DE_PRODUCCION)).toBe(false);
  });
});
