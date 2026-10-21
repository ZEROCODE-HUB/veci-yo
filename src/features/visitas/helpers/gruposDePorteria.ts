import type { VisitaItem } from "@/shared/types";
import { toComparableDate } from "./visitas.helpers";

export type GrupoDePorteria = "hoy" | "dentro" | "manana";

export type FilaDePorteria =
  | { clase: "titulo"; grupo: GrupoDePorteria; titulo: string; cuantas: number }
  | { clase: "visita"; item: VisitaItem };

/*
  «Mañana» solo es verdad si la portería ve dos días; con más, el grupo junta
  todos los que vienen después de hoy.
*/
function tituloDelGrupo(grupo: GrupoDePorteria, diasALaVista: number): string {
  if (grupo === "hoy") return "Hoy";
  if (grupo === "dentro") return "Dentro";
  return diasALaVista === 2 ? "Mañana" : "Próximos días";
}

/** `yyyy-MM-dd` más `dias` días, en `yyyy-MM-dd`. */
function sumarDias(diaIso: string, dias: number): string {
  const [a, m, d] = diaIso.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
}

// Quién llega ahora va primero: es lo que la portería mira al levantar la vista.
const ORDEN: GrupoDePorteria[] = ["hoy", "dentro", "manana"];

/**
 * En qué grupo cae una visita.
 *
 * Sale del **dato**, no de la etiqueta: «dentro» es el estado, y «mañana» es
 * una fecha de llegada posterior a hoy. Todo lo demás es de hoy —también lo
 * que no tiene fecha, que es lo que la portería anota cuando alguien ya está
 * en la puerta, y una estancia que empezó ayer y todavía no ha entrado—.
 */
export function grupoDePorteria(
  item: Pick<VisitaItem, "estado" | "fechaDesde">,
  hoy: string,
): GrupoDePorteria {
  if (item.estado === "Ingresado") return "dentro";
  const llegada = toComparableDate(item.fechaDesde);
  return llegada && llegada > hoy ? "manana" : "hoy";
}

/**
 * La lista de la portería, partida en Hoy, Dentro y Mañana.
 *
 * Decidido con el cliente el 11/10/2026. La base ya solo le entrega esto a la
 * portería —lo de hoy, lo de mañana y quien sigue dentro—; faltaba que se
 * leyera así, en vez de todo seguido.
 *
 * Devuelve filas planas, con el título de cada grupo delante de los suyos: es
 * lo que pinta una lista corriente. Un grupo vacío no deja título. Dentro de
 * cada grupo, primero quien dijo a qué hora llega, por hora.
 *
 * `hoy` va en `yyyy-MM-dd` y lo pone quien llama. `diasALaVista` es el
 * parámetro `porteria_dias_a_la_vista` (hoy 2: hoy y mañana); lo que llegue
 * más tarde no se lista.
 */
export function agruparParaPorteria(
  items: VisitaItem[],
  hoy: string,
  diasALaVista: number,
): FilaDePorteria[] {
  const porGrupo: Record<GrupoDePorteria, VisitaItem[]> = {
    hoy: [],
    dentro: [],
    manana: [],
  };
  const ultimoDia = sumarDias(hoy, diasALaVista - 1);
  for (const item of items) {
    const grupo = grupoDePorteria(item, hoy);
    if (grupo === "manana" && toComparableDate(item.fechaDesde) > ultimoDia) {
      continue;
    }
    porGrupo[grupo].push(item);
  }

  const filas: FilaDePorteria[] = [];
  for (const grupo of ORDEN) {
    const suyos = porGrupo[grupo];
    if (suyos.length === 0) continue;
    filas.push({
      clase: "titulo",
      grupo,
      titulo: tituloDelGrupo(grupo, diasALaVista),
      cuantas: suyos.length,
    });
    const porHora = [...suyos].sort((a, b) =>
      (a.horaEstimadaLlegada ?? "99:99").localeCompare(
        b.horaEstimadaLlegada ?? "99:99",
      ),
    );
    for (const item of porHora) filas.push({ clase: "visita", item });
  }
  return filas;
}
