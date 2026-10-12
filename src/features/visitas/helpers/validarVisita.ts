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

/** Por qué ese número no sirve como documento, o cadena vacía. */
export function errorDeDocumento(numero: string): string {
  const limpio = limpiarDocumento(numero);
  if (limpio === "") return "";
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

/** El teléfono es opcional; si se escribe, tiene que poderse marcar. */
export function errorDeTelefono(telefono: string): string {
  if (telefono.trim() === "") return "";
  const cifras = telefono.replace(/[^0-9]/g, "");
  return cifras.length >= 7 && cifras.length <= 15
    ? ""
    : "Revisa el teléfono: tiene que tener entre 7 y 15 cifras.";
}

/** La placa como se compara: sin espacios ni guiones, en mayúsculas. */
export function limpiarPlaca(placa: string): string {
  return placa.replace(/[\s-]/g, "").toUpperCase();
}

/**
 * Por qué esos vehículos no se pueden guardar, o cadena vacía.
 *
 * Decir que se trae vehículo y no escribir la placa guardaba la visita **sin
 * vehículo** y sin avisar: la portería recibía a alguien en coche que nadie
 * anunció.
 */
export function errorDeVehiculos(placas: string[]): string {
  const limpias = placas.map(limpiarPlaca);
  if (limpias.some((p) => p === "")) {
    return "Escribe la placa de cada vehículo, o indica que no trae.";
  }
  if (limpias.some((p) => !/^[A-Z0-9]{4,8}$/.test(p))) {
    return "Revisa la placa: solo letras y números, entre 4 y 8.";
  }
  if (new Set(limpias).size !== limpias.length) {
    return "Hay una placa repetida.";
  }
  return "";
}

/** `yyyy-MM-dd` contra `yyyy-MM-dd`: si el primero es anterior al segundo. */
export function yaPaso(dia: string, hoy: string): boolean {
  return dia < hoy;
}
