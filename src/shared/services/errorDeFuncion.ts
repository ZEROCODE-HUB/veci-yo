/**
 * Por qué falló una función de Supabase, de verdad.
 *
 * `supabase.functions.invoke` entrega un error **sin el cuerpo de la
 * respuesta**, y el cuerpo es justo donde la función explica qué pasó: que
 * falta la ciudad donde vive el huésped, que el portal no respondió, que el
 * ministerio rechazó el reporte. Sin esto, quien lo lee ve «Edge Function
 * returned a non-2xx status code», que no le dice nada y no le deja arreglarlo.
 *
 * Vive aquí y no en cada repositorio porque ya hacía falta en tres sitios —el
 * calendario, el reporte al ministerio y el correo— y tres copias de la misma
 * lectura divergen en silencio.
 */
export async function motivoDeLaFuncion(error: unknown): Promise<string | null> {
  const contexto = (error as { context?: Response } | null)?.context;
  if (!contexto || typeof contexto.json !== "function") return null;

  try {
    const cuerpo = await contexto.json();
    return typeof cuerpo?.error === "string" ? cuerpo.error : null;
  } catch {
    // El cuerpo no era JSON. No es un fallo: es que no hay más que contar.
    return null;
  }
}
