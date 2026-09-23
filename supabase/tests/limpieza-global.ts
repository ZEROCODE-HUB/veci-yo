import { CUENTA, MARCA_PRUEBA, api, entrar } from "./apoyo";

/**
 * Borra las reservas de prueba antes de que arranque la suite.
 *
 * Estaba como una función que cada archivo tenía que acordarse de llamar, y
 * `huesped.test.ts` no la llamaba: dejó **cincuenta y nueve reservas
 * idénticas** en la piscina, todas el 15/11/2026 de 10 a 12. Nadie se enteró
 * hasta que el disparador de cupos simultáneos empezó a rechazar la número
 * sesenta y las dos pruebas se pusieron rojas.
 *
 * Aquí corre una sola vez, antes que todo, y ningún archivo puede olvidarla.
 */
export default async function limpiar() {
  const marcela = await entrar(CUENTA.admin);
  await api(
    marcela,
    `/rest/v1/reserva_zona?comentarios=like.${encodeURIComponent(MARCA_PRUEBA + "%")}`,
    { metodo: "DELETE" },
  );
}
