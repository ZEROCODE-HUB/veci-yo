/*
  Las monedas viven en la base (tabla `moneda`) y se leen con `useMonedas`.
  Aquí había una lista de siete; el 28/10/2026 el cliente dejó solo COP, PEN y
  USD, y se cambian desde Panel › Más › Monedas.
*/

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
