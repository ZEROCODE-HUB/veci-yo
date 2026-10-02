/**
 * Lo que una persona tiene que leer cuando la base rechaza algo.
 *
 * Postgres responde a una restricción violada con una frase suya:
 *
 *   new row for relation "reserva_zona" violates check constraint
 *   "reserva_zona_horario_coherente"
 *
 * Está en inglés, nombra una tabla y una restricción, y no dice qué hacer.
 *
 * Hasta el 01/10/2026 daba igual, porque la aplicación tiraba el mensaje de la
 * base y mostraba uno genérico --«No se pudo guardar»--. Al conectar el mensaje
 * de verdad, que era el arreglo correcto para los **disparadores** --que sí
 * escriben frases pensadas para leerse, como «Esta encuesta admite un solo voto
 * por persona»--, estas otras quedaron a la vista. Una mejora destapó un
 * agujero al lado.
 *
 * Aquí se traducen las que una persona puede provocar de verdad. Y lo que no
 * esté, **no se enseña**: vale más un «no se pudo guardar» que enseñar el
 * nombre de una tabla.
 */

/** Las restricciones que alguien puede encontrarse usando la aplicación. */
const RESTRICCIONES: Record<string, string> = {
  // Zonas comunes.
  reserva_zona_horario_coherente:
    "La hora de fin tiene que ser posterior a la de inicio.",
  reserva_zona_numero_recurso_positivo:
    "El puesto elegido no es válido.",
  zona_comun_horario_coherente:
    "La zona no puede cerrar antes de abrir.",
  zona_comun_duracion_coherente:
    "La duración máxima no puede ser menor que la mínima.",

  // Estancias y viviendas.
  membresia_unidad_vigencia_coherente:
    "La fecha de salida no puede ser anterior a la de entrada.",
  membresia_unidad_apodo_con_texto:
    "El nombre de la vivienda no puede quedar vacío, y son 40 caracteres como mucho.",
  membresia_unidad_menor_sin_acceso:
    "Un menor de edad no puede tener acceso a la aplicación.",
  invitacion_vigencia_coherente:
    "La fecha de salida no puede ser anterior a la de entrada.",
  permiso_vivienda_umbral_positivo:
    "El umbral de noches tiene que ser mayor que cero.",
  permiso_vivienda_corta_coherente:
    "En la estancia corta, la estancia máxima no puede ser menor que la mínima.",
  permiso_vivienda_larga_coherente:
    "En la estancia larga, la estancia máxima no puede ser menor que la mínima.",

  // Renta corta.
  suscripcion_max_huespedes_positivo:
    "El número de huéspedes tiene que ser mayor que cero.",
  suscripcion_estacionamientos_no_negativos:
    "El número de estacionamientos no puede ser negativo.",
  suscripcion_estancia_coherente:
    "La estancia máxima no puede ser menor que la mínima.",

  // Contratos y pagos.
  contrato_fechas_coherentes:
    "La fecha de fin del contrato no puede ser anterior a la de inicio.",
  contrato_arrendamiento_monto_check:
    "El monto del contrato tiene que ser mayor que cero.",
  contrato_arrendamiento_duracion_meses_check:
    "La duración del contrato tiene que ser de al menos un mes.",
  cuota_administracion_periodo_es_mes:
    "El periodo de la cuota tiene que ser un mes con formato aaaa-mm.",

  // Perfil y contacto.
  perfil_correo_alt_valido: "El correo alternativo no parece válido.",

  // Comunidad.
  mensaje_con_texto: "El mensaje no puede ir vacío.",
  reconocimiento_no_autootorgado:
    "No puedes darte un reconocimiento a ti mismo.",
  reclamo_modelo_solo_para_app:
    "El modelo del dispositivo solo se pide en los reportes sobre la aplicación.",
  publicacion_vigencia:
    "La fecha de cierre no puede ser anterior a la de publicación.",
  vehiculo_residente_placa_no_vacia: "La placa no puede ir vacía.",
};

/** La forma en que Postgres nombra lo que se rompió. */
const PATRONES = [
  /violates check constraint "([a-z_]+)"/i,
  /violates unique constraint "([a-z_]+)"/i,
  /violates foreign key constraint "([a-z_]+)"/i,
];

/** Frases de Postgres que nunca debe leer una persona. */
const DE_LA_MAQUINA =
  /violates (check|unique|foreign key|not-null) constraint|new row for relation|duplicate key value|violates row-level security|permission denied for/i;

/**
 * Si el mensaje es de Postgres y no de una persona.
 *
 * Los disparadores de este proyecto escriben frases para leerse, así que esta
 * función sirve para distinguir unas de otras: lo que suene a máquina se
 * sustituye; lo demás pasa tal cual.
 */
export function esDeLaMaquina(mensaje: string): boolean {
  return DE_LA_MAQUINA.test(mensaje);
}

/**
 * La traducción de una restricción, si la hay.
 *
 * Devuelve `null` cuando el mensaje no nombra ninguna restricción conocida: el
 * que llama decide entonces, y lo que debe decidir es callar.
 */
export function traducirRestriccion(mensaje: string): string | null {
  for (const patron of PATRONES) {
    const encontrado = patron.exec(mensaje);
    if (encontrado) return RESTRICCIONES[encontrado[1]] ?? null;
  }
  return null;
}
