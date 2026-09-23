export function formatZonaDateParam(value: Date | null) {
  return value ? value.toISOString() : "";
}

/**
 * Las horas que dura como mucho una reserva.
 *
 * La columna es `duracion_maxima_min` —**minutos**— y la aplicacion la trataba
 * como horas en tres sitios: la cabecera de la grilla decia "Horario libre
 * (max 120 h)" para una zona de dos horas, el desplegable de duracion se
 * construia con `Array.from({length: 120})` —de "1 hora" a "120 horas"— y la
 * lista del administrador escribia "Duracion: 120h".
 *
 * Y el formulario de la administracion tenia **dos campos sobre la misma
 * columna**, uno etiquetado "(min)" y otro "(horas)": ganaba el que se
 * rellenara ultimo.
 */
export function horasMaximas(minutos?: number | null): number {
  return Math.max(1, Math.floor((minutos || 60) / 60));
}
