/**
 * Lee el texto de la foto del documento en el navegador (23/10/2026).
 *
 * La versión web de la app sigue viva mientras se prueba el celular, así que
 * aquí se lee con Tesseract, también dentro del navegador: la foto no se sube.
 * El celular usa ML Kit (`leerTextoDelDocumento.native.ts`).
 */
export async function leerTextoDelDocumento(uri: string): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const lector = await createWorker("spa");
  try {
    const { data } = await lector.recognize(uri);
    return data.text;
  } finally {
    await lector.terminate();
  }
}
