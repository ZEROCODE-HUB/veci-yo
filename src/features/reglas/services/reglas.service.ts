import { reglasDepartamentos } from "../reglasMockData";

const simularRespuesta = <T>(value: T, delay = 180) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(value), delay));

export const obtenerDepartamentosRentaCorta = () =>
  simularRespuesta(reglasDepartamentos);
