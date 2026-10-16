import type { VisitaItem } from "@/shared/types";

export type TonoDeEstado = "bien" | "espera" | "mal";

export interface EstadoParaPorteria {
  texto: string;
  tono: TonoDeEstado;
}

/**
 * Lo que el guardia necesita saber de una estancia, en palabras.
 *
 * La responsable de producto (16/10/2026): «el guardia no ve el paso a paso,
 * qué le falta. Si le falta aparece Incompleto, falta aprobación de TyC o falta
 * aprobación del anfitrión». Y «falta revisión y aprobación manual del
 * anfitrión: eso sucede cuando hay un hallazgo, pero no se le indica al
 * guardia». O sea: el guardia sabe **que** falta la aprobación, nunca **por
 * qué** (KT: la verificación de antecedentes no la ve la portería).
 *
 * El orden es el de lo que más pesa en la puerta: un «no» del anfitrión gana a
 * todo; luego lo que espera al anfitrión; luego lo que falta del huésped.
 */
export function estadoParaPorteria(visita: VisitaItem): EstadoParaPorteria {
  const personas = visita.invitados ?? [];

  if (personas.some((p) => p.verificacion === "rechazada")) {
    return { texto: "No autorizado por el anfitrión", tono: "mal" };
  }

  if (
    visita.esperaAlAnfitrion ||
    personas.some(
      (p) => p.verificacion === "revision" || p.revisionMenor === "no_se_parece_revisar",
    )
  ) {
    return { texto: "Falta aprobación del anfitrión", tono: "espera" };
  }

  const cerrado = personas.some((p) => Boolean(p.timeline?.precheckinCerrado));
  if (!cerrado) {
    const adultosSinTerminos = personas.some(
      (p) => !p.esMenor && !p.timeline?.terminosAceptados && !p.timeline?.terminosAprobadoPor,
    );
    if (adultosSinTerminos) {
      return { texto: "Incompleto · falta aceptar términos y condiciones", tono: "espera" };
    }
    return { texto: "Incompleto · preregistro sin terminar", tono: "espera" };
  }

  return { texto: "Preregistro completo", tono: "bien" };
}
