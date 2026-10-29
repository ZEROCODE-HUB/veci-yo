import { useMemo } from "react";
import { useLista } from "@/shared/hooks/useLista";
import { formatRangoHoras } from "@/shared/utils";
import {
  FRANJAS_TURNO,
  NOMBRES_DE_TURNO,
  franjaDeEtiqueta,
  type FranjaDeTurno,
  type NombreDeTurno,
} from "../types";
import { shiftOfHour } from "../helpers/seguridad.helpers";

const HORA = /^([01]\d|2[0-4]):[0-5]\d$/;

function hora(valor: unknown): string | null {
  return typeof valor === "string" && HORA.test(valor) ? valor : null;
}

/**
 * Las franjas del filtro y del horario de un guardia, y los nombres de los
 * turnos (29/10/2026), de la lista `turnos_franjas` de la base.
 *
 * La lista tiene dos grupos en `extra.grupo`: `franja_filtro` (los tramos que
 * se eligen) y `nombre_turno` (Mañana, Tarde, Noche y sus horas). En el panel
 * se cambian el nombre, si se ofrece, el orden y las horas `desde` y `hasta`.
 * Una franja que acaba a las 00:00 acaba a medianoche: aquí se lee como
 * 24:00, que es como la guarda el turno.
 *
 * Una opción con horas que no se entienden no se ofrece. Si no queda ninguna
 * (o la lista no llegó), valen las de siempre.
 */
export function useFranjasDeTurno() {
  const { opciones } = useLista("turnos_franjas");
  return useMemo(() => {
    const deLaBase: FranjaDeTurno[] = [];
    const nombresDeLaBase: NombreDeTurno[] = [];
    for (const o of opciones) {
      const desde = hora(o.extra.desde ?? o.extra.hora_inicio);
      const hasta = hora(o.extra.hasta ?? o.extra.hora_fin);
      if (!desde || !hasta) continue;
      if (o.extra.grupo === "franja_filtro") {
        deLaBase.push({ horaInicio: desde, horaFin: hasta === "00:00" ? "24:00" : hasta });
      } else if (o.extra.grupo === "nombre_turno") {
        nombresDeLaBase.push({ nombre: o.etiqueta, desde, hasta });
      }
    }
    const franjas = deLaBase.length > 0 ? deLaBase : [...FRANJAS_TURNO];
    const nombres = nombresDeLaBase.length > 0 ? nombresDeLaBase : NOMBRES_DE_TURNO;
    return {
      franjas,
      /** Las etiquetas del selector, con el formato con el que se pintan los turnos. */
      etiquetas: franjas.map((f) => formatRangoHoras(f.horaInicio, f.horaFin)),
      franjaDeEtiqueta: (etiqueta: string) => franjaDeEtiqueta(etiqueta, franjas),
      nombres: nombres.map((n) => n.nombre),
      nombreDelTurno: (horaDeEntrada: string) => shiftOfHour(horaDeEntrada, nombres),
    };
  }, [opciones]);
}
