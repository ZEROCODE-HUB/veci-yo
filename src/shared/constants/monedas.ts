/**
 * Las monedas en que puede cobrar un edificio (16/10/2026).
 *
 * Había tres listas distintas: las zonas comunes ofrecían COP, USD, EUR, ARS
 * y MXN --sin el sol peruano, en un producto que opera en Perú--, las cuotas
 * COP, PEN y USD, y el edificio ninguna, porque su moneda no se podía
 * cambiar. Una sola lista para las tres.
 */
export const MONEDAS = [
  { value: "COP", label: "COP · Peso colombiano" },
  { value: "PEN", label: "PEN · Sol peruano" },
  { value: "USD", label: "USD · Dólar" },
  { value: "EUR", label: "EUR · Euro" },
  { value: "MXN", label: "MXN · Peso mexicano" },
  { value: "ARS", label: "ARS · Peso argentino" },
  { value: "CLP", label: "CLP · Peso chileno" },
] as const;

/** La moneda de cada país, para sugerirla al elegirlo. */
const MONEDA_POR_PAIS: Readonly<Record<string, string>> = {
  CO: "COP",
  PE: "PEN",
  EC: "USD",
  PA: "USD",
  US: "USD",
  MX: "MXN",
  AR: "ARS",
  CL: "CLP",
  ES: "EUR",
};

/** La moneda sugerida para un país, o vacío si no se conoce. */
export function monedaDelPais(pais: string | null | undefined): string {
  return (pais && MONEDA_POR_PAIS[pais.toUpperCase()]) || "";
}

/**
 * La zona horaria del edificio, de una lista.
 *
 * Decide qué es «hoy» y qué hora «ya pasó» en las reservas, las visitas y
 * los avisos. Era la del país --Bogotá o Lima-- sin poderse cambiar.
 */
export const ZONAS_HORARIAS = [
  { value: "America/Bogota", label: "Bogotá" },
  { value: "America/Lima", label: "Lima" },
  { value: "America/Guayaquil", label: "Guayaquil" },
  { value: "America/Panama", label: "Panamá" },
  { value: "America/Caracas", label: "Caracas" },
  { value: "America/La_Paz", label: "La Paz" },
  { value: "America/Santiago", label: "Santiago de Chile" },
  { value: "America/Argentina/Buenos_Aires", label: "Buenos Aires" },
  { value: "America/Asuncion", label: "Asunción" },
  { value: "America/Montevideo", label: "Montevideo" },
  { value: "America/Mexico_City", label: "Ciudad de México" },
  { value: "America/Guatemala", label: "Guatemala" },
  { value: "America/Costa_Rica", label: "Costa Rica" },
  { value: "America/Santo_Domingo", label: "Santo Domingo" },
  { value: "America/New_York", label: "Nueva York" },
  { value: "Europe/Madrid", label: "Madrid" },
] as const;

const ZONA_POR_PAIS: Readonly<Record<string, string>> = {
  CO: "America/Bogota",
  PE: "America/Lima",
  EC: "America/Guayaquil",
  PA: "America/Panama",
  VE: "America/Caracas",
  BO: "America/La_Paz",
  CL: "America/Santiago",
  AR: "America/Argentina/Buenos_Aires",
  PY: "America/Asuncion",
  UY: "America/Montevideo",
  MX: "America/Mexico_City",
  GT: "America/Guatemala",
  CR: "America/Costa_Rica",
  DO: "America/Santo_Domingo",
  US: "America/New_York",
  ES: "Europe/Madrid",
};

/** La zona horaria sugerida para un país, o vacío si no se conoce. */
export function zonaHorariaDelPais(pais: string | null | undefined): string {
  return (pais && ZONA_POR_PAIS[pais.toUpperCase()]) || "";
}
