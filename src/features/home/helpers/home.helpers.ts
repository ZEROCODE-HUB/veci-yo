import { theme } from "@/config";
import type { FranjaDeTrafico } from "@/features/visitas/services/porteria.repo";

export const HORAS_TURNO = [
  "06:00",
  "08:00",
  "10:00",
  "12:00",
  "14:00",
  "16:00",
  "18:00",
  "20:00",
  "22:00",
  "00:00",
];

export const COLOR_FAMILIARES = theme.colors.secondary;
export const COLOR_TEMPORAL = theme.colors.warning;

/** La franja de dos horas en la que cae una hora del dia (0 a 23). */
function indiceDeLaHora(hora: number) {
  const indice = hora < 6 ? HORAS_TURNO.length - 1 : Math.floor((hora - 6) / 2);
  return Math.min(Math.max(indice, 0), HORAS_TURNO.length - 1);
}

/**
 * Las barras del grafico de trafico, a partir de los numeros de la base.
 *
 * Hasta el 09/10/2026 esto recibia la lista de personas del dia y contaba
 * sobre ella. Dos cosas estaban mal:
 *
 *   · «con vehiculo» salia de comparar el nombre con **ocho nombres escritos
 *     aqui** --Guillermo Sarpeito, Mario Bonefi...--, residuo de la maqueta.
 *     Nadie que no se llamara asi venia en coche;
 *   · y para pintar un grafico hacia falta traerse a todas las personas de
 *     ese dia, que es justo lo que la porteria ya no puede leer de ayer.
 *
 * Ahora recibe cuantos por hora, que es lo unico que un grafico necesita.
 */
export function calcularTrafico(franjas: FranjaDeTrafico[], modoIngreso: boolean) {
  const usadoFamiliar = HORAS_TURNO.map(() => 0);
  const usadoTemporal = HORAS_TURNO.map(() => 0);
  const usadoVehiculos = HORAS_TURNO.map(() => 0);
  const movimiento = modoIngreso ? "ingreso" : "salida";

  for (const franja of franjas) {
    if (franja.movimiento !== movimiento) continue;
    const indice = indiceDeLaHora(franja.hora);
    if (franja.esHuesped) usadoTemporal[indice] += franja.personas;
    else usadoFamiliar[indice] += franja.personas;
    usadoVehiculos[indice] += franja.conVehiculo;
  }

  const usadoPorHora = usadoFamiliar.map((valor, indice) => valor + usadoTemporal[indice]);

  return {
    usadoFamiliar,
    usadoTemporal,
    usadoVehiculos,
    usadoPorHora,
    maxVal: Math.max(1, ...usadoPorHora),
  };
}
