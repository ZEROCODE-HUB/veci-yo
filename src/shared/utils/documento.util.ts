import type { ReglaDeDocumento } from "@/shared/services/documentos.repo";

/**
 * Cómo se juzga el número de un documento de identidad, para toda la app.
 *
 * Vivía en `features/visitas/helpers/validarVisita.ts` y lo usaban también el
 * registro, «Completa tus datos» y el personal de seguridad. El 23/11/2026 el
 * cliente contó que el aviso decía solo «Revisa el número» y la gente lo
 * confundía con el del teléfono: ahora cada aviso nombra el documento y dice
 * el largo que se acepta.
 *
 * Son las mismas reglas que el preregistro del huésped en la web
 * (`veciyo-web/src/lib/ficha.ts`). El límite sigue siendo la base.
 */

/** El número tal como se compara: sin espacios, puntos ni guiones. */
export function limpiarDocumento(numero: string): string {
  return numero.replace(/[\s.-]/g, "").toUpperCase();
}

/** Lo que hace falta de la regla de un documento para juzgar su número. */
export type ReglaDelNumero = Pick<ReglaDeDocumento, "soloCifras" | "largoMinimo" | "largoMaximo">;

/** Sin regla --un acompañante sin tipo-- se pide lo mínimo. */
const REGLA_ABIERTA: ReglaDelNumero = { soloCifras: false, largoMinimo: 4, largoMaximo: 20 };

/** «8 cifras» o «entre 5 y 12 cifras». */
function largoDicho(regla: ReglaDelNumero): string {
  const unidad = regla.soloCifras ? "cifras" : "caracteres";
  return regla.largoMinimo === regla.largoMaximo
    ? `${regla.largoMaximo} ${unidad}`
    : `entre ${regla.largoMinimo} y ${regla.largoMaximo} ${unidad}`;
}

/**
 * Por qué ese número no sirve como documento, o cadena vacía.
 *
 * Con la regla del país (`documento_del_pais`, que se edita desde el panel de
 * la plataforma) se aplica esa: solo cifras o no, y su largo. La misma que
 * `error_de_documento` en la base y que la web.
 */
export function errorDeDocumento(numero: string, regla?: ReglaDelNumero | null): string {
  const limpio = limpiarDocumento(numero);
  if (limpio === "") return "";
  const r = regla ?? REGLA_ABIERTA;
  if (r.soloCifras) {
    if (!/^[0-9]+$/.test(limpio)) {
      return `Revisa el número de documento: lleva solo números (${largoDicho(r)}), sin letras ni símbolos.`;
    }
  } else if (!/^[A-Z0-9]+$/.test(limpio)) {
    return "Revisa el número de documento: lleva solo letras y números, sin símbolos.";
  }
  if (limpio.length < r.largoMinimo || limpio.length > r.largoMaximo) {
    return `Revisa el número de documento: tiene que tener ${largoDicho(r)} (tiene ${limpio.length}).`;
  }
  return "";
}

/**
 * Lo que se acepta, para ponerlo de pista en el campo antes de escribir:
 * «Solo números, entre 5 y 12 cifras». Sin regla, cadena vacía.
 */
export function pistaDeDocumento(regla?: ReglaDelNumero | null): string {
  if (!regla) return "";
  const largo = largoDicho(regla);
  return regla.soloCifras
    ? `Solo números, ${largo}`
    : `Letras y números, ${largo}`;
}
