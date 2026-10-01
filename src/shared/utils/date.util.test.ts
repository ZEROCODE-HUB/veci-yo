import { describe, expect, it } from "vitest";
import {
  formatAmount,
  formatMoney,
  formatDate,
  formatDateInput,
  formatDateShortMonth,
  formatDateTime,
  formatMonthYear,
  formatTime,
  DIAS_INICIALES,
  formatDateIso,
  horaComoFecha,
} from "./date.util";

/**
 * Regla 6 de AGENTS.md: el formateo es determinista y no depende del
 * dispositivo.
 *
 * Estas funciones existen porque el prototipo usaba `toLocaleDateString` en 34
 * sitios con cuatro locales distintos: `es-AR` daba `5/7/2026` mientras los
 * datos se almacenaban como `05/07/2026`, así que las comparaciones de fecha
 * fallaban en unos teléfonos y en otros no. Lo que estas pruebas fijan, sobre
 * todo, son los ceros a la izquierda.
 */

// 5 de julio de 2026, 09:07. Un día y un mes de un solo dígito, y una hora con
// minutos de un solo dígito: justo el caso que el formateo del sistema rompía.
const DIA_CORTO = new Date(2026, 6, 5, 9, 7);
// 25 de diciembre de 2026, 18:30.
const DIA_LARGO = new Date(2026, 11, 25, 18, 30);

describe("formatDate", () => {
  it("rellena con ceros a la izquierda", () => {
    expect(formatDate(DIA_CORTO)).toBe("05/07/2026");
  });

  it("no altera los valores de dos dígitos", () => {
    expect(formatDate(DIA_LARGO)).toBe("25/12/2026");
  });
});

describe("formatDateInput", () => {
  it("ordena lexicográficamente igual que cronológicamente", () => {
    expect(formatDateInput(DIA_CORTO)).toBe("2026-07-05");
    expect(formatDateInput(DIA_CORTO) < formatDateInput(DIA_LARGO)).toBe(true);
  });

  it("devuelve cadena vacía sin fecha", () => {
    expect(formatDateInput(null)).toBe("");
  });
});

describe("formatTime", () => {
  it("usa 24 horas con dos dígitos", () => {
    expect(formatTime(DIA_CORTO)).toBe("09:07");
    expect(formatTime(DIA_LARGO)).toBe("18:30");
  });

  it("medianoche es 00:00 y no 12:00", () => {
    expect(formatTime(new Date(2026, 0, 1, 0, 0))).toBe("00:00");
  });
});

describe("formatDateTime", () => {
  it("combina fecha y hora en el formato canónico", () => {
    expect(formatDateTime(DIA_CORTO)).toBe("05/07/2026 09:07");
  });
});

describe("formatDateShortMonth", () => {
  it("usa el mes abreviado en español", () => {
    expect(formatDateShortMonth(DIA_CORTO)).toBe("05 jul 2026");
    expect(formatDateShortMonth(DIA_LARGO)).toBe("25 dic 2026");
  });
});

describe("formatMonthYear", () => {
  it("usa el mes completo en español", () => {
    expect(formatMonthYear(DIA_CORTO)).toBe("julio 2026");
    expect(formatMonthYear(new Date(2026, 0, 1))).toBe("enero 2026");
  });
});

describe("formatAmount", () => {
  it("separa los miles con punto", () => {
    expect(formatAmount(1234567)).toBe("1.234.567");
    expect(formatAmount(1000)).toBe("1.000");
  });

  it("no agrupa por debajo de mil", () => {
    expect(formatAmount(999)).toBe("999");
    expect(formatAmount(0)).toBe("0");
  });

  it("redondea: los montos se muestran sin decimales", () => {
    expect(formatAmount(1234.6)).toBe("1.235");
  });
});

describe("DIAS_INICIALES", () => {
  it("son las iniciales en español, de domingo a sábado", () => {
    // El calendario las tenía escritas a mano y en inglés: "S M T W T F S".
    expect([...DIAS_INICIALES]).toEqual(["D", "L", "M", "M", "J", "V", "S"]);
  });

  it("empieza en domingo, como la cuadrícula del calendario", () => {
    // `Date.getDay()` devuelve 0 para domingo: el índice es directo.
    expect(DIAS_INICIALES[new Date(2026, 8, 20).getDay()]).toBe("D");
    expect(DIAS_INICIALES[new Date(2026, 8, 22).getDay()]).toBe("M");
  });
});

describe("formatDateIso", () => {
  it("pasa de yyyy-MM-dd a dd/MM/yyyy", () => {
    expect(formatDateIso("2026-10-02")).toBe("02/10/2026");
    expect(formatDateIso("2026-01-15T00:00:00Z")).toBe("15/01/2026");
  });

  it("no construye un Date, para que no se corra un día", () => {
    // `new Date("2026-10-02")` se interpreta en UTC: al oeste de Greenwich
    // `getDate()` devolvería 1. Partir la cadena no tiene ese problema.
    expect(formatDateIso("2026-10-02")).toBe("02/10/2026");
  });

  it("devuelve cadena vacía ante nada o ante basura", () => {
    expect(formatDateIso(null)).toBe("");
    expect(formatDateIso(undefined)).toBe("");
    expect(formatDateIso("")).toBe("");
    expect(formatDateIso("no es una fecha")).toBe("");
  });
});

describe("formatMoney", () => {
  it("lleva siempre el código de la moneda", () => {
    /*
      El defecto que lo motiva: la pantalla de suscripción decía "$15.00" sin
      decir cuál. En un producto que opera en Colombia y en Perú, `$` es el
      peso o el dólar según quién mire.
    */
    expect(formatMoney(15, "USD")).toBe("15,00 USD");
    expect(formatMoney(60000, "COP")).toBe("60.000 COP");
  });

  it("las monedas sin fracción no muestran decimales", () => {
    expect(formatMoney(1234567, "COP")).toBe("1.234.567 COP");
    expect(formatMoney(1234567, "PEN")).toBe("1.234.567,00 PEN");
  });

  it("redondea a la fracción de la moneda, no antes", () => {
    expect(formatMoney(15.005, "USD")).toBe("15,01 USD");
    expect(formatMoney(15.4, "COP")).toBe("15 COP");
  });

  it("no depende del dispositivo", () => {
    // Regla 6: `toLocaleString` da un resultado distinto en cada teléfono.
    expect(formatMoney(1000.5, "usd")).toBe("1.000,50 USD");
  });

  it("los negativos llevan el signo delante", () => {
    expect(formatMoney(-2500.75, "PEN")).toBe("-2.500,75 PEN");
  });
});

/**
 * Las horas, que se formateaban a mano en once sitios.
 *
 * `formatTime` existía desde el principio y aun así once lugares construían
 * `HH:mm` con su propio `padStart` --uno de ellos escrito el mismo 01/10/2026,
 * horas antes de encontrarlo--. Es la forma más barata del defecto que ya mordió
 * a este proyecto con las horas de los turnos: dos sitios que arman el mismo
 * texto acaban armándolo distinto, y nada lo dice.
 */
describe("la hora, de ida y de vuelta", () => {
  it("se formatea con dos cifras siempre", () => {
    expect(formatTime(new Date(2026, 9, 1, 9, 5))).toBe("09:05");
    expect(formatTime(new Date(2026, 9, 1, 14, 30))).toBe("14:30");
    expect(formatTime(new Date(2026, 9, 1, 0, 0))).toBe("00:00");
  });

  it("y vuelve a ser una fecha con esa hora", () => {
    const fecha = horaComoFecha("14:30");

    expect(fecha.getHours()).toBe(14);
    expect(fecha.getMinutes()).toBe(30);
    // Segundos y milisegundos a cero: el selector compara horas, no instantes.
    expect(fecha.getSeconds()).toBe(0);
    expect(fecha.getMilliseconds()).toBe(0);
  });

  it("sin hora, la medianoche", () => {
    // Es lo que hacían las dos copias de `parseTime`, y hay que conservarlo:
    // el selector necesita posicionarse en algo.
    expect(formatTime(horaComoFecha())).toBe("00:00");
    expect(formatTime(horaComoFecha(""))).toBe("00:00");
  });

  it("las dos son inversas", () => {
    for (const hora of ["00:00", "07:15", "12:00", "23:59"]) {
      expect(formatTime(horaComoFecha(hora))).toBe(hora);
    }
  });
});
