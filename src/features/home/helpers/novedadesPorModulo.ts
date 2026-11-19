/**
 * Cuántos avisos sin leer tiene cada módulo del menú (18/11/2026, pedido del
 * cliente: «un globito con un número si hay anuncios, zonas comunes
 * aprobadas que no viste»). Sale de la misma bandeja que la campana: un aviso
 * leído deja de contar en los dos sitios.
 */
const MODULO_DEL_MOTIVO: Record<string, string> = {
  anuncio_publicado: "anuncios",
  reserva_aprobada: "zonas-comunes",
  reserva_rechazada: "zonas-comunes",
  reserva_cancelada: "zonas-comunes",
  reserva_cambiada: "zonas-comunes",
  reserva_creada: "zonas-comunes",
  reserva_por_aprobar: "zonas-comunes",
  correspondencia_recibida: "correspondencia",
  correspondencia_incidencia: "correspondencia",
  visita_ingreso: "visitas",
};

export function novedadesPorModulo(avisos: readonly { tipo: string; leida: boolean }[]): Record<string, number> {
  const cuenta: Record<string, number> = {};
  for (const a of avisos) {
    if (a.leida) continue;
    const modulo = MODULO_DEL_MOTIVO[a.tipo];
    if (modulo) cuenta[modulo] = (cuenta[modulo] ?? 0) + 1;
  }
  return cuenta;
}
