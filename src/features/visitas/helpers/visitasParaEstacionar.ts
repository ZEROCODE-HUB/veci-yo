import type { VisitaItem } from "@/shared/types";

export interface OpcionDeVisita {
  /** El uuid de la visita: es lo que guarda la asignacion. */
  value: string;
  label: string;
}

/**
 * A que visitas se les puede dar un estacionamiento.
 *
 * Fuera las que ya terminaron o se cancelaron: el cupo se suelta solo cuando
 * la visita pasa a finalizada, asi que uno asignado **despues** no lo soltaria
 * nadie (ya paso: «0 de 1 disponibles» para siempre). Y fuera las que no
 * tienen uuid, que no se pueden guardar.
 */
export function visitasParaEstacionar(visitas: VisitaItem[]): OpcionDeVisita[] {
  return visitas
    .filter(
      (visita) =>
        Boolean(visita.uuid) &&
        visita.estado !== "Finalizado" &&
        visita.estado !== "Cancelado",
    )
    .map((visita) => ({
      value: visita.uuid as string,
      label: `${visita.nombre || "Visita"} (${visita.torre || "-"}-${visita.depto || "-"})`,
    }));
}
