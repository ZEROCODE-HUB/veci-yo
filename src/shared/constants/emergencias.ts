/**
 * El número de la policía de cada país (15/10/2026).
 *
 * Es lo que se sugiere al configurar un edificio y lo que se marca si el
 * edificio no puso otro. Solo los países donde hoy opera o puede operar
 * Veciyo; para los demás no se adivina.
 */
export const POLICIA_POR_PAIS: Readonly<Record<string, string>> = {
  CO: "123",
  PE: "105",
  EC: "911",
  MX: "911",
  AR: "911",
  CL: "133",
  BO: "110",
  PY: "911",
  UY: "911",
  VE: "911",
  PA: "104",
  CR: "911",
  DO: "911",
  GT: "110",
  US: "911",
  ES: "091",
};

/** El número sugerido para un país, o vacío si no se conoce. */
export function policiaDelPais(pais: string | null | undefined): string {
  return (pais && POLICIA_POR_PAIS[pais.toUpperCase()]) || "";
}
