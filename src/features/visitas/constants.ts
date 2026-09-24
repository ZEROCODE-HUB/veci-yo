/**
 * Vocabulario de la interfaz de visitas: etiquetas, iconos y listas de opcion.
 *
 * Vivia en `src/data/visitasMockData.ts` mezclado con veinte visitas
 * inventadas. Esto no es mock -- son los textos que la pantalla muestra -- pero
 * tampoco es dato compartido: pertenece a la feature.
 *
 * `TORRES` y `DEPARTAMENTOS` ya se reemplazaron por `useUnidadesDisponibles`,
 * y los tipos de documento y de vehiculo salen ahora de los enums de la base.
 */
import { etiquetasDe, TIPO_DOCUMENTO, TIPO_VEHICULO } from "@/shared/constants";
import { colors as paleta } from "@/config";

export const TIPOS_VISITA = [
  "amigos",
  "temporal",
  "permanente",
  "huesped-temporal",
] as const;

export const TIPO_LABELS: Record<string, string> = {
  amigos: "Amigos Familiares",
  temporal: "Profesional Temporal",
  permanente: "Profesional Permanente",
  "huesped-temporal": "Huésped Temporal",
};

export const TIPO_ICONS: Record<string, string> = {
  amigos: "🏠",
  temporal: "👷",
  permanente: "👩‍⚕️",
  "huesped-temporal": "🏨",
};

export const TIPO_EMOJIS: Record<string, string> = {
  amigos: "🏠",
  temporal: "👷",
  permanente: "👩‍⚕️",
  "huesped-temporal": "🏨",
};

/*
  Los cuatro estados del enum `estado_visita`, y solo esos. La lista decia
  'Pendiente', 'Aceptado', 'Rechazado' e 'Ingresado': dos de ellos --'Aceptado'
  y 'Rechazado'-- no existen en el esquema ni en ninguna columna, asi que
  filtrar por ellos no devolvia nada nunca. El esquema es la fuente de verdad.
*/
export const ESTADOS_VISITA = [
  "Programada",
  "Ingresado",
  "Finalizado",
  "Cancelado",
] as const;

export const FILTROS_ESTADO_VISITA = [
  { value: "Programada", label: "Programada", color: paleta.textMuted },
  { value: "Ingresado", label: "Ingresado", color: paleta.success },
  { value: "Finalizado", label: "Finalizado", color: paleta.secondary },
  { value: "Cancelado", label: "Cancelado", color: paleta.danger },
] as const;

export const PROFESIONES: Record<string, string[]> = {
  permanente: [
    "Cuidado de menores",
    "Profesional de la salud",
    "Limpieza y servicios generales",
    "Atención a mascotas",
    "Conductor",
    "Jardinero",
    "Otros",
  ],
  temporal: [
    "Domiciliario",
    "Pintor",
    "Carpintero",
    "Electricista",
    "Profesional de la salud",
    "Limpieza y servicios generales",
    "Atención a mascotas",
    "Cuidado de menores",
    "Peluquero o maquillador",
    "Fontanero",
    "Otros",
  ],
};

// `TIPOS_ID` era ['Cédula','Pasaporte','DNI'] y la base acepta seis valores:
// un extranjero con carné o con PEP no podia registrarse, y "Cédula" era
// ambiguo entre la de ciudadania y la de extranjeria. Ahora las etiquetas
// salen de `shared/constants/enums`, que el typecheck obliga a mantener
// completas.
export const TIPOS_ID = etiquetasDe(TIPO_DOCUMENTO);

export const TIPOS_VEHICULO = etiquetasDe(TIPO_VEHICULO);

export const TIMELINE_STEPS = [
  "preregistroEnviado",
  "documentacionCompleta",
  "terminosAceptados",
  "verificacionPasada",
  "trasideEntrada",
  "trasideSalida",
] as const;
