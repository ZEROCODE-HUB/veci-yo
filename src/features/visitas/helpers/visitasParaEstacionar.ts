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
export function visitasParaEstacionar(
  visitas: VisitaItem[],
  /** Hoy, para probarlo con una fecha fija. */
  ahora: Date = new Date(),
): OpcionDeVisita[] {
  /*
    Y solo las de hoy (15/10/2026): la lista ofrecía a una huésped que salió
    hace dos días y a otra que llega a fin de mes. «dd/MM/yyyy» se pasa a un
    número comparable; sin fecha no se descarta.
  */
  const numero = (fecha?: string) => {
    const [d, m, a] = (fecha ?? "").split("/").map(Number);
    return d && m && a ? a * 10000 + m * 100 + d : null;
  };
  const hoy = ahora.getFullYear() * 10000 + (ahora.getMonth() + 1) * 100 + ahora.getDate();
  return visitas
    .filter((visita) => {
      const desde = numero(visita.fechaDesde);
      const hasta = numero(visita.fechaHasta);
      return (
        Boolean(visita.uuid) &&
        visita.estado !== "Finalizado" &&
        visita.estado !== "Cancelado" &&
        (desde === null || desde <= hoy) &&
        (hasta === null || hasta >= hoy)
      );
    })
    .map((visita) => ({
      value: visita.uuid as string,
      label: `${visita.nombre || "Visita"} (${visita.torre || "-"}-${visita.depto || "-"})`,
    }));
}
