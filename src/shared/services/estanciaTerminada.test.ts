import { describe, expect, it } from "vitest";
import { soloEstanciasTerminadas } from "./estanciaTerminada";

/**
 * Quien se alojó y ya se fue, frente a quien nunca tuvo nada.
 *
 * Los dos llegan a la aplicación sin ningún rol, y hasta el 30/09/2026 los dos
 * recibían la vista del propietario sin propiedades: «Registra tu primera
 * propiedad» y un botón de «Agregar propiedad», en un edificio donde uno de
 * ellos solo durmió tres noches.
 *
 * Salió recorriendo la aplicación como Ramiro, cuya estancia terminó en agosto.
 */
const huesped = (vigente_hasta: string | null) => ({
  rol: "huesped_temporal",
  vigente_hasta,
});

const HOY = "2026-09-30";

describe("si lo único que había era una estancia y ya terminó", () => {
  it("la estancia vencida, sí", () => {
    expect(soloEstanciasTerminadas([huesped("2026-08-07")], HOY)).toBe(true);
  });

  it("el último día todavía no", () => {
    // Quien se va hoy sigue alojado hoy. Es el mismo criterio que usa la base
    // para las credenciales de entrada.
    expect(soloEstanciasTerminadas([huesped(HOY)], HOY)).toBe(false);
  });

  it("y la que aún no ha empezado, tampoco", () => {
    expect(soloEstanciasTerminadas([huesped("2026-10-07")], HOY)).toBe(false);
  });

  it("quien nunca tuvo nada no es un huésped que se fue", () => {
    /*
      El caso que distingue las dos vistas. Sin filas no hay estancia que haya
      terminado: es alguien que acaba de crear su cuenta y todavía no registró
      su propiedad, y a ese sí hay que ofrecerle el botón.
    */
    expect(soloEstanciasTerminadas([], HOY)).toBe(false);
  });

  it("si queda algo que no es una estancia vencida, tampoco", () => {
    /*
      Basta una membresía viva, o de otro tipo, para que la persona no sea «un
      huésped que se fue»: tiene vivienda en el edificio. El `every` es lo que
      lo sujeta, y sin este caso podría cambiarse por un `some` sin que nada se
      pusiera rojo.
    */
    const conVivienda = [
      huesped("2026-08-07"),
      { rol: "propietario", vigente_hasta: null },
    ];
    expect(soloEstanciasTerminadas(conVivienda, HOY)).toBe(false);

    const conOtraEstanciaViva = [huesped("2026-08-07"), huesped("2030-01-01")];
    expect(soloEstanciasTerminadas(conOtraEstanciaViva, HOY)).toBe(false);
  });

  it("una estancia sin fecha de fin no está terminada", () => {
    // `vigente_hasta` nulo es «sin fecha de salida», no «se fue».
    expect(soloEstanciasTerminadas([huesped(null)], HOY)).toBe(false);
  });
});
