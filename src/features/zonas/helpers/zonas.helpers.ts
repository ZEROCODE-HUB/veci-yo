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
/*
  Recibe los minutos ya resueltos: si la zona no tiene duración, quien llama
  pone la del edificio (`zona_duracion_maxima_por_defecto`). Aquí había un 60
  de respaldo, y otras pantallas suponían 120 o 240 para lo mismo.
*/
export function horasMaximas(minutos: number): number {
  return Math.max(1, Math.floor(minutos / 60));
}
