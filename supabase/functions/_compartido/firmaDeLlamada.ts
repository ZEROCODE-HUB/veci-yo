/**
 * firmaDeLlamada · la llave de un solo uso para rechazar una llamada sin
 * sesión (28/10/2026)
 *
 * El aviso de la llamada lleva, para cada persona, una firma de
 * «llamada + persona» con el secreto `LLAMADA_FIRMA_SECRETO`. El código de
 * Android la manda al pulsar «Rechazar» con la app cerrada --cuando no hay
 * sesión-- y `rechazar-llamada` la comprueba. Sirve solo para rechazar esa
 * llamada, por esa persona, mientras suena: no abre nada más.
 */

async function llave(secreto: string): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secreto),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

const hex = (bytes: ArrayBuffer) =>
  [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");

export async function firmarLlamada(secreto: string, llamadaId: string, usuarioId: string): Promise<string> {
  const firma = await crypto.subtle.sign(
    "HMAC",
    await llave(secreto),
    new TextEncoder().encode(`${llamadaId}:${usuarioId}`),
  );
  return hex(firma);
}

export async function firmaValida(
  secreto: string,
  llamadaId: string,
  usuarioId: string,
  firma: string,
): Promise<boolean> {
  if (!/^[0-9a-f]{64}$/.test(firma)) return false;
  const bytes = new Uint8Array(firma.match(/.{2}/g)!.map((h) => parseInt(h, 16)));
  return await crypto.subtle.verify(
    "HMAC",
    await llave(secreto),
    bytes,
    new TextEncoder().encode(`${llamadaId}:${usuarioId}`),
  );
}
