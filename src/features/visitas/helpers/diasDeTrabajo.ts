/**
 * Los días de la semana en que viene un profesional permanente.
 *
 * La tarjeta decía «Lun – Vie» **escrito a fuego** para todo el mundo, y el
 * formulario no tenía dónde elegirlos: `dias_laborales` existía en la base y
 * ninguna pantalla la escribía (13/10/2026). Ahora la vecina los elige, y son
 * números --0 domingo a 6 sábado, como `extract(dow)` en la base-- en vez de
 * un texto ya compuesto: un dato no se guarda formateado.
 */

/** En el orden en que se leen en una semana laboral: de lunes a domingo. */
export const DIAS_DE_LA_SEMANA = [
  { valor: 1, letra: "L", corto: "Lun", nombre: "lunes" },
  { valor: 2, letra: "M", corto: "Mar", nombre: "martes" },
  { valor: 3, letra: "X", corto: "Mié", nombre: "miércoles" },
  { valor: 4, letra: "J", corto: "Jue", nombre: "jueves" },
  { valor: 5, letra: "V", corto: "Vie", nombre: "viernes" },
  { valor: 6, letra: "S", corto: "Sáb", nombre: "sábado" },
  { valor: 0, letra: "D", corto: "Dom", nombre: "domingo" },
] as const;

export const LUNES_A_VIERNES = [1, 2, 3, 4, 5];

/** «Lun a Vie», «Lun, Mié y Vie», «Todos los días» o que no hay ninguno. */
export function textoDeDias(dias?: number[] | null): string {
  const elegidos = DIAS_DE_LA_SEMANA.filter((dia) =>
    (dias ?? []).includes(dia.valor),
  );
  if (!elegidos.length) return "Sin días asignados";
  if (elegidos.length === 7) return "Todos los días";

  // Un tramo seguido de tres o más se lee mejor como rango.
  const posiciones = elegidos.map((dia) =>
    DIAS_DE_LA_SEMANA.findIndex((otro) => otro.valor === dia.valor),
  );
  const seguidos = posiciones.every(
    (posicion, i) => i === 0 || posicion === posiciones[i - 1] + 1,
  );
  if (seguidos && elegidos.length >= 3) {
    return `${elegidos[0].corto} a ${elegidos[elegidos.length - 1].corto}`;
  }

  const cortos = elegidos.map((dia) => dia.corto);
  return cortos.length === 1
    ? cortos[0]
    : `${cortos.slice(0, -1).join(", ")} y ${cortos[cortos.length - 1]}`;
}

/**
 * Si ese día es de los suyos.
 *
 * Sin días decididos no se avisa de nada: es una visita de antes de que se
 * pudieran elegir, y decir «hoy no le toca» sería inventarlo.
 */
export function tocaEseDia(dias: number[] | null | undefined, fecha: Date) {
  if (!dias?.length) return true;
  return dias.includes(fecha.getDay());
}
