import { parse as leerMrz } from "mrz";

/**
 * Lo que traen escrito para máquinas los documentos de identidad (05/11/2026).
 *
 * El escaneo del 04/11/2026 falló ocho veces seguidas con la misma cédula: el
 * celular leía el apellido, pero no el nombre ni el número, porque en una foto
 * pequeña las cifras salen borrosas. Los documentos traen los mismos datos en
 * un formato hecho para leerse sin errores, y eso es lo que se mira primero:
 *
 *   · **PDF417** en el reverso de la cédula colombiana de siempre (la
 *     amarilla): número, apellidos, nombres, sexo y nacimiento, en posiciones
 *     fijas. El mapa lo publica github.com/Eitol/colombian-cedula-reader (MIT).
 *   · **Code39** en el reverso del DNI peruano: el número. El PDF417 de ese
 *     DNI solo trae la huella, así que de él no se saca nada.
 *   · **MRZ**, las líneas con «<<<» de los pasaportes, la cédula digital
 *     colombiana y el DNI electrónico peruano. No es un código de barras: sale
 *     del texto que ya lee el celular, y la librería `mrz` la interpreta.
 *
 * Lo que no traiga nada de eso se sigue comparando por el texto
 * (`compararDocumento`).
 */

export interface DatosDelDocumento {
  numero: string;
  apellidos: string[];
  nombres: string[];
  sexo?: "F" | "M";
  /** aaaa-mm-dd */
  nacimiento?: string;
}

/** Lo que se registró en el preregistro, igual que en `compararDocumento`. */
type Ficha = { numero?: string | null };

/**
 * El número tal como se compara: letras y cifras en mayúsculas, sin
 * separadores, y sin los ceros de delante si es solo de cifras (el PDF417 los
 * pone para llenar diez posiciones).
 */
export function numeroParaComparar(t: string): string {
  const limpio = t.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return /^\d+$/.test(limpio) ? limpio.replace(/^0+/, "") : limpio;
}

/** Debajo de esto, un número casaría por casualidad con cualquier cosa. */
const LARGO_MINIMO = 5;

/**
 * Buscar el número **dentro** de una tira más larga solo con siete cifras o
 * más: uno de cinco o seis aparece por casualidad entre las treinta cifras de
 * un código.
 */
const LARGO_PARA_BUSCAR_DENTRO = 7;

const SOLO_LETRAS = /^[A-ZÑ]+( [A-ZÑ]+)*$/;

/**
 * Los datos del PDF417 de la cédula colombiana, o null si no lo es.
 *
 * Primero por posiciones, que es como está hecho; si el lector se comió los
 * caracteres nulos de relleno y las posiciones se corrieron, por la forma: el
 * número son las últimas diez cifras de la tira que va pegada al primer
 * apellido, y después del segundo nombre van el sexo y la fecha de nacimiento
 * («M19670128»).
 */
export function cedulaColombianaDelCodigo(data: string): DatosDelDocumento | null {
  return porPosiciones(data) ?? porForma(data);
}

function porPosiciones(data: string): DatosDelDocumento | null {
  if (data.length < 160) return null;
  const campo = (desde: number, hasta: number) =>
    data.slice(desde, hasta).replace(/[^A-ZÑ ]+/g, " ").replace(/\s+/g, " ").trim();
  const numero = data.slice(48, 58);
  const apellido = campo(58, 81);
  if (!/^\d{10}$/.test(numero) || !SOLO_LETRAS.test(apellido)) return null;
  const sexoYFecha = /([MF])(\d{4})(\d{2})(\d{2})/.exec(data.slice(150, 162));
  return {
    numero: numero.replace(/^0+/, ""),
    apellidos: [apellido, campo(81, 104)].filter(Boolean),
    nombres: [campo(104, 127), campo(127, 151)].filter(Boolean),
    ...fechaYSexo(sexoYFecha),
  };
}

function porForma(data: string): DatosDelDocumento | null {
  const pegado = /(\d{10,})([A-ZÑ])/.exec(data);
  if (!pegado) return null;
  const numero = pegado[1].slice(-10).replace(/^0+/, "");
  if (numero.length < LARGO_MINIMO) return null;
  const resto = data.slice(pegado.index + pegado[1].length);
  const sexoYFecha = /([MF])(\d{4})(\d{2})(\d{2})/.exec(resto);
  const palabras = (sexoYFecha ? resto.slice(0, sexoYFecha.index) : resto)
    .split(/[^A-ZÑ ]+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  // Con cuatro trozos el orden es seguro; con menos, falta alguno y no se sabe
  // cuál, así que solo el primero va como apellido.
  const apellidos = palabras.length >= 4 ? palabras.slice(0, 2) : palabras.slice(0, 1);
  const nombres = palabras.length >= 4 ? palabras.slice(2, 4) : palabras.slice(1);
  return { numero, apellidos, nombres, ...fechaYSexo(sexoYFecha) };
}

function fechaYSexo(m: RegExpExecArray | null): Pick<DatosDelDocumento, "sexo" | "nacimiento"> {
  if (!m) return {};
  const [, sexo, anio, mes, dia] = m;
  const valida = Number(mes) >= 1 && Number(mes) <= 12 && Number(dia) >= 1 && Number(dia) <= 31;
  return { sexo: sexo as "F" | "M", ...(valida ? { nacimiento: `${anio}-${mes}-${dia}` } : {}) };
}

export type ResultadoDelCodigo = "coincide" | "otro_numero" | "no_se_entiende";

/**
 * Compara un código de barras leído con el número registrado.
 *
 * «otro_numero» solo cuando se sabe dónde está el número --el PDF417 de la
 * cédula colombiana o un Code39, que es el número solo--: decirlo de un código
 * que no se entiende sería afirmar algo que no se leyó.
 */
export function compararCodigo(tipo: string, data: string, ficha: Ficha): ResultadoDelCodigo {
  const registrado = numeroParaComparar(ficha.numero ?? "");
  if (registrado.length < LARGO_MINIMO) return "no_se_entiende";
  const clase = tipo.toLowerCase();

  if (clase.includes("pdf417")) {
    const cedula = cedulaColombianaDelCodigo(data);
    if (cedula) return cedula.numero === registrado ? "coincide" : "otro_numero";
    // Otro documento con PDF417: el número tiene que estar entero entre sus cifras.
    return registrado.length >= LARGO_PARA_BUSCAR_DENTRO && data.replace(/\D/g, "").includes(registrado)
      ? "coincide"
      : "no_se_entiende";
  }

  if (clase.includes("39")) {
    const leido = numeroParaComparar(data);
    if (leido.length < LARGO_MINIMO) return "no_se_entiende";
    // El DNI peruano puede llevar el dígito de control pegado al final.
    return leido === registrado || leido.slice(0, -1) === registrado ? "coincide" : "otro_numero";
  }

  const leido = numeroParaComparar(data);
  if (leido === registrado) return "coincide";
  return registrado.length >= LARGO_PARA_BUSCAR_DENTRO && leido.includes(registrado)
    ? "coincide"
    : "no_se_entiende";
}

export interface DatosDeLaMrz {
  /** Todos los campos donde un documento puede poner el número de la persona. */
  numeros: string[];
  apellidos: string[];
  nombres: string[];
  /** Si el dígito de control del número de documento cuadra. */
  numeroComprobado: boolean;
}

/** Largo de cada línea y cuántas líneas lleva cada formato de MRZ. */
const FORMATOS: Array<{ largo: number; lineas: number }> = [
  { largo: 30, lineas: 3 }, // TD1: tarjetas (cédula digital, DNI electrónico)
  { largo: 36, lineas: 2 }, // TD2
  { largo: 44, lineas: 2 }, // TD3: pasaportes
];

/**
 * La MRZ que haya en el texto leído, o null.
 *
 * El lector no la devuelve limpia: mete espacios, confunde «<» con ««» o
 * «‹», y a veces corta o alarga una línea en uno o dos caracteres. Se
 * normaliza cada línea, se rellenan o recortan las que están a dos de su largo,
 * y se prueba cada grupo de líneas seguidas con la librería.
 */
export function mrzDelTexto(texto: string): DatosDeLaMrz | null {
  const lineas = texto
    .split(/\r?\n/)
    .map((l) => l.toUpperCase().replace(/[«‹]/g, "<<").replace(/\s+/g, ""))
    .filter((l) => l.includes("<") && /^[A-Z0-9<]+$/.test(l));

  for (const { largo, lineas: cuantas } of FORMATOS) {
    const ajustadas = lineas
      .filter((l) => Math.abs(l.length - largo) <= 2)
      .map((l) => (l.length >= largo ? l.slice(0, largo) : l.padEnd(largo, "<")));
    for (let i = 0; i + cuantas <= ajustadas.length; i++) {
      const datos = interpretar(ajustadas.slice(i, i + cuantas));
      if (datos) return datos;
    }
  }
  return null;
}

function interpretar(lineas: string[]): DatosDeLaMrz | null {
  try {
    const r = leerMrz(lineas, { autocorrect: true });
    const f = r.fields;
    const numeros = [f.documentNumber, f.personalNumber, f.optional1, f.optional2]
      .map((n) => numeroParaComparar(n ?? ""))
      .filter((n) => n.length >= LARGO_MINIMO);
    if (numeros.length === 0) return null;
    const palabras = (t: string | null | undefined) =>
      (t ?? "").split(/\s+/).filter((p) => p.length > 0);
    const control = r.details.find((d) => d.field === "documentNumberCheckDigit");
    return {
      numeros,
      apellidos: palabras(f.lastName),
      nombres: palabras(f.firstName),
      numeroComprobado: control?.valid === true,
    };
  } catch {
    return null;
  }
}

/**
 * Si la MRZ trae el número registrado. Exacto: si el lector se equivocó en
 * una cifra, no casa aquí y lo intenta la comparación por texto, que sí
 * perdona una.
 */
export function coincideLaMrz(mrz: DatosDeLaMrz, ficha: Ficha): boolean {
  const registrado = numeroParaComparar(ficha.numero ?? "");
  if (registrado.length < LARGO_MINIMO) return false;
  // Algunos documentos guardan el número de la persona con relleno delante o detrás.
  return mrz.numeros.some(
    (n) => n === registrado || (registrado.length >= LARGO_PARA_BUSCAR_DENTRO && n.includes(registrado)),
  );
}
