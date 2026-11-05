import { describe, expect, it } from "vitest";
import {
  cedulaColombianaDelCodigo,
  coincideLaMrz,
  compararCodigo,
  mrzDelTexto,
  numeroParaComparar,
} from "./leerCodigoDelDocumento";

/**
 * Un PDF417 de cédula colombiana armado con el mapa de posiciones publicado
 * (github.com/Eitol/colombian-cedula-reader): los campos de texto van
 * rellenos con nulos a la derecha y el número con ceros a la izquierda.
 */
function pdf417Colombiano(c: {
  numero: string;
  apellido1: string;
  apellido2?: string;
  nombre1: string;
  nombre2?: string;
  sexo?: string;
  nacimiento?: string;
}): string {
  const bytes = Array.from({ length: 531 }, () => "\0");
  const poner = (desde: number, texto: string) => {
    [...texto].forEach((ch, i) => (bytes[desde + i] = ch));
  };
  poner(0, "01");
  poner(2, "30847811");
  poner(40, "16434054");
  poner(48, c.numero.padStart(10, "0"));
  poner(58, c.apellido1);
  poner(81, c.apellido2 ?? "");
  poner(104, c.nombre1);
  poner(127, c.nombre2 ?? "");
  poner(151, `${c.sexo ?? "F"}${c.nacimiento ?? "19670128"}`);
  poner(160, "15001");
  poner(166, "O+");
  return bytes.join("");
}

const maria = pdf417Colombiano({
  numero: "51907053",
  apellido1: "GONZALEZ",
  apellido2: "MARIN",
  nombre1: "MARIA",
  nombre2: "GABRIELA",
});

describe("el PDF417 de la cédula colombiana", () => {
  it("se lee por posiciones: número sin ceros, apellidos, nombres, sexo y nacimiento", () => {
    expect(cedulaColombianaDelCodigo(maria)).toEqual({
      numero: "51907053",
      apellidos: ["GONZALEZ", "MARIN"],
      nombres: ["MARIA", "GABRIELA"],
      sexo: "F",
      nacimiento: "1967-01-28",
    });
  });

  it("si el lector se comió los nulos y las posiciones se corrieron, por la forma", () => {
    const sinNulos = maria.replace(/\0+/g, "|");
    const datos = cedulaColombianaDelCodigo(sinNulos);
    expect(datos?.numero).toBe("51907053");
    expect(datos?.apellidos).toEqual(["GONZALEZ", "MARIN"]);
    expect(datos?.nombres).toEqual(["MARIA", "GABRIELA"]);
    expect(datos?.nacimiento).toBe("1967-01-28");
  });

  it("una cédula de 6 cifras, como la del escaneo que falló el 04/11/2026", () => {
    const corta = pdf417Colombiano({ numero: "520134", apellido1: "RUIZ", nombre1: "ANA" });
    expect(cedulaColombianaDelCodigo(corta)?.numero).toBe("520134");
    expect(compararCodigo("pdf417", corta, { numero: "520.134" })).toBe("coincide");
  });

  it("coincide con el número registrado aunque lleve puntos", () => {
    expect(compararCodigo("pdf417", maria, { numero: "51.907.053" })).toBe("coincide");
  });

  it("con otro número registrado dice que es otro, no que no lo entiende", () => {
    expect(compararCodigo("pdf417", maria, { numero: "51907054" })).toBe("otro_numero");
  });

  it("el PDF417 del DNI peruano solo trae la huella: no se entiende, no es «otro»", () => {
    const huella = "\u0001\u0002ABC\u0007\u0010xyz-binario-sin-cifras";
    expect(cedulaColombianaDelCodigo(huella)).toBeNull();
    expect(compararCodigo("pdf417", huella, { numero: "45678912" })).toBe("no_se_entiende");
  });

  it("un número corto no se busca entre las cifras de un código que no se entiende", () => {
    expect(compararCodigo("pdf417", "XX99123456XX", { numero: "12345" })).toBe("no_se_entiende");
  });
});

describe("el Code39 del DNI peruano", () => {
  it("es el número solo", () => {
    expect(compararCodigo("code39", "45678912", { numero: "45678912" })).toBe("coincide");
  });

  it("con el dígito de control pegado al final también", () => {
    expect(compararCodigo("code39", "456789124", { numero: "45678912" })).toBe("coincide");
  });

  it("otro DNI es otro número", () => {
    expect(compararCodigo("code39", "11111111", { numero: "45678912" })).toBe("otro_numero");
  });

  it("los tipos llegan escritos de varias formas según el sistema", () => {
    expect(compararCodigo("org.iso.Code39", "45678912", { numero: "45678912" })).toBe("coincide");
  });
});

describe("la zona MRZ", () => {
  // El ejemplo de la norma ICAO 9303.
  const pasaporte = `PASSPORT
P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<
L898902C36UTO7408122F1204159ZE184226B<<<<<10`;

  it("un pasaporte: número con letras, apellidos y nombres", () => {
    const mrz = mrzDelTexto(pasaporte);
    expect(mrz?.numeros[0]).toBe("L898902C3");
    expect(mrz?.apellidos).toEqual(["ERIKSSON"]);
    expect(mrz?.nombres).toEqual(["ANNA", "MARIA"]);
    expect(mrz?.numeroComprobado).toBe(true);
    expect(coincideLaMrz(mrz!, { numero: "L898902C3" })).toBe(true);
    expect(coincideLaMrz(mrz!, { numero: "L898902C4" })).toBe(false);
  });

  it("con espacios metidos por el lector y «<» leído como «", () => {
    const sucio = pasaporte
      .replace("P<UTOERIKSSON", "P< UTO ERIKSSON")
      .replace("<<<<<10", "«<<<10");
    expect(mrzDelTexto(sucio)?.numeros[0]).toBe("L898902C3");
  });

  it("una tarjeta de tres líneas, como el DNI electrónico", () => {
    const dni = `IDPER45678912<4<<<<<<<<<<<<<<<
8001014M2512314PER<<<<<<<<<<<6
PEREZ<GARCIA<<JUAN<CARLOS<<<<<`;
    const mrz = mrzDelTexto(dni);
    expect(mrz?.apellidos).toEqual(["PEREZ", "GARCIA"]);
    expect(coincideLaMrz(mrz!, { numero: "45678912" })).toBe(true);
  });

  it("una línea corta en uno o dos caracteres se rellena", () => {
    const corta = pasaporte.replace("<<<<<<<<<<<<<<<<<<<\n", "<<<<<<<<<<<<<<<<<\n");
    expect(mrzDelTexto(corta)?.numeros[0]).toBe("L898902C3");
  });

  it("el texto de una cédula amarilla no tiene MRZ", () => {
    expect(mrzDelTexto("REPUBLICA DE COLOMBIA\nNUMERO 1.012.345.678\nGOMEZ RUIZ\nTOMAS")).toBeNull();
  });
});

describe("cómo se compara un número", () => {
  it("sin separadores ni ceros de relleno, y con letras en mayúsculas", () => {
    expect(numeroParaComparar("0051.907-053")).toBe("51907053");
    expect(numeroParaComparar("ab 123 456")).toBe("AB123456");
  });
});
