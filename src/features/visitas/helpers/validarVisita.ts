/**
 * Lo que una visita nueva no puede llevar, dicho con palabras.
 *
 * Sale de recorrer las visitas corrientes el 12/10/2026: el formulario dejaba
 * pasar un documento «ABC!!», un correo sin arroba y un teléfono de dos
 * cifras; decía «cada vehículo necesita su placa» y guardaba la visita sin
 * ninguno; y anunciaba una visita para un día que ya pasó.
 *
 * Son las mismas reglas que el preregistro del huésped en la web
 * (`veciyo-web/src/lib/ficha.ts`). El límite sigue siendo la base.
 */

/** El número tal como se compara: sin espacios, puntos ni guiones. */
export function limpiarDocumento(numero: string): string {
  return numero.replace(/[\s.-]/g, "").toUpperCase();
}

/**
 * Documentos que en Colombia y Perú son solo cifras, de 5 a 12. La misma
 * lista y los mismos números que la web (`ficha.ts`): el largo era 5–20 en el
 * registro, 4–20 aquí y en las guardias, y 5–12 en la web (Parametrización,
 * 25/10/2026).
 */
const SOLO_CIFRAS: ReadonlySet<string> = new Set([
  "cedula_ciudadania",
  "cedula_extranjeria",
  "tarjeta_identidad",
  "dni",
]);

/**
 * Por qué ese número no sirve como documento, o cadena vacía. Con el tipo
 * (la clave de la base) se aplica su regla; sin él, la general.
 */
export function errorDeDocumento(numero: string, tipo?: string | null): string {
  const limpio = limpiarDocumento(numero);
  if (limpio === "") return "";
  if (tipo && SOLO_CIFRAS.has(tipo)) {
    if (!/^[0-9]+$/.test(limpio)) return "Ese documento lleva solo números.";
    if (limpio.length < 5 || limpio.length > 12) {
      return "Revisa el número: tiene que tener entre 5 y 12 cifras.";
    }
    return "";
  }
  if (!/^[A-Z0-9]+$/.test(limpio)) {
    return "El documento lleva solo letras y números, sin símbolos.";
  }
  if (limpio.length < 4 || limpio.length > 20) {
    return "Revisa el documento: tiene que tener entre 4 y 20 caracteres.";
  }
  return "";
}

export function errorDeCorreo(correo: string): string {
  const limpio = correo.trim();
  if (limpio === "") return "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(limpio)
    ? ""
    : "Ese correo no parece válido.";
}

/**
 * El teléfono es opcional; si se escribe, tiene que poderse marcar. El largo
 * permitido viene de la base (`telefono_largo_minimo` / `telefono_largo_maximo`).
 */
export function errorDeTelefono(
  telefono: string,
  largo: { minimo: number; maximo: number },
): string {
  if (telefono.trim() === "") return "";
  const cifras = telefono.replace(/[^0-9]/g, "");
  return cifras.length >= largo.minimo && cifras.length <= largo.maximo
    ? ""
    : `Revisa el teléfono: tiene que tener entre ${largo.minimo} y ${largo.maximo} cifras.`;
}

/** La placa como se compara: sin espacios ni guiones, en mayúsculas. */
export function limpiarPlaca(placa: string): string {
  return placa.replace(/[\s-]/g, "").toUpperCase();
}

/**
 * Por qué esa placa no sirve, o cadena vacía. El largo es el de la base
 * (`placa_largo_minimo` / `placa_largo_maximo`) y se mide sin espacios ni
 * guiones: era 4–8 aquí, 4–10 en el residente y nada en la portería ni en la
 * web (Parametrización, 25/10/2026).
 */
export function errorDePlaca(
  placa: string,
  largo: { minimo: number; maximo: number },
): string {
  const limpia = limpiarPlaca(placa);
  if (limpia === "") return "";
  if (!/^[A-Z0-9]+$/.test(limpia) || limpia.length < largo.minimo || limpia.length > largo.maximo) {
    return `Revisa la placa: solo letras y números, entre ${largo.minimo} y ${largo.maximo}.`;
  }
  return "";
}

/**
 * Por qué esos vehículos no se pueden guardar, o cadena vacía.
 *
 * Decir que se trae vehículo y no escribir la placa guardaba la visita **sin
 * vehículo** y sin avisar: la portería recibía a alguien en coche que nadie
 * anunció.
 */
export function errorDeVehiculos(
  placas: string[],
  largo: { minimo: number; maximo: number },
): string {
  const limpias = placas.map(limpiarPlaca);
  if (limpias.some((p) => p === "")) {
    return "Escribe la placa de cada vehículo, o indica que no trae.";
  }
  const mala = placas.map((p) => errorDePlaca(p, largo)).find(Boolean);
  if (mala) return mala;
  if (new Set(limpias).size !== limpias.length) {
    return "Hay una placa repetida.";
  }
  return "";
}

/** `yyyy-MM-dd` contra `yyyy-MM-dd`: si el primero es anterior al segundo. */
export function yaPaso(dia: string, hoy: string): boolean {
  return dia < hoy;
}
