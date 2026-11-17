/**
 * Si la visita que registra la portería nace ya **dentro** del edificio.
 *
 * Quien registra desde la portería tiene a la persona en la puerta. Hasta el
 * 17/11/2026, si el edificio exigía verificar el documento y la persona traía
 * uno, la visita nacía «por llegar» (T-025, 21/10/2026): la base no dejaba
 * entrar a nadie sin verificarlo, y el guardia tenía que verificar en la ficha
 * el número que él mismo acababa de copiar.
 *
 * El cliente pidió que nazca siempre «Ingresado» (17/11/2026). La base lo
 * respalda: la visita que registra el guardia activo queda marcada
 * (`visita.registrada_en_porteria`), su documento cuenta como verificado y su
 * entrada no espera a la verificación
 * (`20261117181000_la_visita_de_porteria_entra_y_avisa.sql`).
 *
 * Lo que registra un vecino y las estancias de huésped siguen naciendo por
 * llegar: el huésped se verifica en la puerta.
 */
export function entraAlRegistrar({
  esGuardia,
  esEstancia,
}: {
  esGuardia: boolean;
  /** Una estancia de huésped siempre se verifica antes de entrar. */
  esEstancia: boolean;
}): boolean {
  return esGuardia && !esEstancia;
}
