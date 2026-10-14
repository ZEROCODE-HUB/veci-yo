import type { VisitaItem } from "@/shared/types";

/**
 * Las estancias que llegan pronto y siguen sin preregistro.
 *
 * Lo pidió la responsable de producto el 14/10/2026: «al anfitrión le debe
 * salir una alerta de los que faltan menos de 3 días, y un botón para enviar
 * el mensaje». Cuenta las de **3 días o menos**, hoy incluido: el día que
 * llega todavía se puede hacer en la puerta, pero ya va tarde.
 *
 * Pura y aparte: es una regla, y en un `filter` dentro del JSX nadie la
 * comprueba.
 */
export const DIAS_DE_AVISO = 3;

export interface EstanciaPorRecordar {
  visita: VisitaItem;
  dias: number;
}

/** `dd/MM/yyyy` a días desde hoy (`yyyy-MM-dd`). */
function diasHasta(fecha: string, hoyIso: string): number | null {
  const [dia, mes, anio] = fecha.split("/");
  if (!dia || !mes || !anio) return null;
  const objetivo = Date.UTC(Number(anio), Number(mes) - 1, Number(dia));
  const [a, m, d] = hoyIso.split("-").map(Number);
  return Math.round((objetivo - Date.UTC(a, m - 1, d)) / 86_400_000);
}

export function estanciasPorRecordar(
  visitas: VisitaItem[],
  hoyIso: string,
): EstanciaPorRecordar[] {
  const salen: EstanciaPorRecordar[] = [];
  for (const visita of visitas) {
    if (visita.tipo !== "huesped-temporal" || !visita.fechaDesde) continue;
    if (["Cancelado", "Finalizado"].includes(visita.estado)) continue;
    if (visita.invitados?.[0]?.timeline?.precheckinCerrado) continue;
    const dias = diasHasta(visita.fechaDesde, hoyIso);
    if (dias === null || dias < 0 || dias > DIAS_DE_AVISO) continue;
    salen.push({ visita, dias });
  }
  return salen.sort((x, y) => x.dias - y.dias);
}

/** El texto que el anfitrión pega en Airbnb o WhatsApp. */
export function mensajeDeRecordatorio(nombre: string, dias: number, enlace: string): string {
  const cuando =
    dias <= 0 ? "hoy" : dias === 1 ? "mañana" : `en ${dias} días`;
  const saludo = nombre.trim() ? `Hola, ${nombre.trim()}.` : "Hola.";
  return `${saludo} Llegas ${cuando}. Recuerda hacer tu preregistro antes de llegar: ${enlace}. Tarda unos minutos y así la portería te recibe sin esperas.`;
}
