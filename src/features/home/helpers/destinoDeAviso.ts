/**
 * A qué pantalla lleva tocar un aviso (15/10/2026, hueco 26).
 *
 * Solo llevaba a algún sitio el de chat; el resto se marcaba leído y dejaba a
 * la persona buscando de qué le avisaban. Cada aviso trae `entidad_tipo` y
 * `entidad_id` desde septiembre; esto los traduce a una pantalla.
 *
 * El S.O.S. no lleva a ninguna: la alarma tiene su propia pantalla en vivo, y
 * un aviso viejo de una alarma ya cerrada no tiene dónde abrirse.
 */
export interface Destino {
  pantalla: string;
  parametros?: Record<string, string>;
}

/** Los avisos de una estancia abren su ficha; el resto, la lista de visitas. */
const DE_UNA_ESTANCIA = new Set([
  "huesped_salida_parcial",
  "huesped_salida",
  "verificacion_requiere_revision",
  "menor_por_revisar",
  "preregistro_incompleto",
]);

export function destinoDeAviso(aviso: {
  tipo: string;
  entidadTipo?: string | null;
  entidadId?: string | null;
}): Destino | null {
  const id = aviso.entidadId ?? undefined;
  switch (aviso.entidadTipo) {
    case "conversacion":
      return id ? { pantalla: "ChatConversacion", parametros: { conversationId: id } } : null;
    case "anuncio":
      return id ? { pantalla: "AnuncioDetalle", parametros: { id } } : { pantalla: "Anuncios" };
    case "reclamo":
      return id ? { pantalla: "ReclamoDetalle", parametros: { id } } : { pantalla: "Reclamos" };
    case "correspondencia":
      return { pantalla: "Correspondencia" };
    case "reserva_zona":
      return { pantalla: "ZonasComunes" };
    case "reconocimiento":
      return { pantalla: "CuadroHonor" };
    case "visita":
      return DE_UNA_ESTANCIA.has(aviso.tipo) && id
        ? { pantalla: "Visitas", parametros: { abrir: id } }
        : { pantalla: "Visitas" };
    default:
      return null;
  }
}
