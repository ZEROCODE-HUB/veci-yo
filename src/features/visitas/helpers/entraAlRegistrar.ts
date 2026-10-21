/**
 * Si la visita que registra la portería nace ya **dentro** del edificio.
 *
 * Quien registra desde la portería tiene a la persona en la puerta, así que la
 * visita nacía siempre `ingresada`. Pero si el edificio exige verificar el
 * documento y la persona trae uno, la base no la deja entrar sin verificarlo
 * (`no_entra_si_el_documento_no_coincide`): la visita se creaba, la persona
 * no, y quedaba una visita «Ingresado» sin nadie dentro. Al intentar marcar
 * la entrada después, la pantalla mandaba un identificador vacío y salía
 * «invalid input syntax for type uuid» (T-025, 21/10/2026).
 *
 * Ahora, en ese caso, la visita nace por llegar: el guardia verifica el
 * documento en la ficha y entonces registra la entrada. Es la misma regla de
 * la base, para que la pantalla no ofrezca lo que la base va a negar.
 */
export function entraAlRegistrar({
  esGuardia,
  esEstancia,
  exigeDocumento,
  documentos,
}: {
  esGuardia: boolean;
  /** Una estancia de huésped siempre se verifica antes de entrar. */
  esEstancia: boolean;
  /** El edificio exige que la portería verifique el documento. */
  exigeDocumento: boolean;
  /** El documento de cada persona de la visita, vacío si no lo trae. */
  documentos: (string | undefined)[];
}): boolean {
  if (!esGuardia || esEstancia) return false;
  const traeDocumento = documentos.some((d) => Boolean(d?.trim()));
  return !(exigeDocumento && traeDocumento);
}
