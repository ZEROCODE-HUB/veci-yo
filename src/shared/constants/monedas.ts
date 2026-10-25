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

/*
  La moneda y la zona horaria que se sugieren al elegir un país salen de la
  tabla `pais` (`useDatosDePaises`). Aquí había dos listas propias que no
  coincidían con la de la base (Parametrización, 25/10/2026).
*/
