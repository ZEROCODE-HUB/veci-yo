/**
 * Si una llegada cae fuera del horario de check-in de la vivienda.
 *
 * La administración fija esa franja por vivienda --y distinta para estancia
 * corta y larga--. Hasta el 01/10/2026 se guardaba y no la miraba nadie.
 *
 * Es un **aviso, no un bloqueo**: es el criterio que el cliente ya fijó para el
 * aforo --«mostrar como advertencia, no bloqueo duro»-- y aquí vale igual,
 * porque un vuelo se retrasa y la portería no puede dejar a alguien en la
 * puerta. Lo que hace falta es que el guardia lo sepa, no que no pueda.
 *
 * Las horas se comparan como texto `HH:mm`, que con ceros a la izquierda ordena
 * igual que el reloj. Construir un `Date` para esto traería la zona horaria del
 * dispositivo a una comparación que no la necesita.
 */
export function fueraDeLaFranja(
  hora: string,
  desde: string | null,
  hasta: string | null,
): boolean {
  // Sin franja decidida no hay nada fuera de nada.
  if (!desde || !hasta || desde === hasta) return false;
  if (!/^\d{2}:\d{2}/.test(hora)) return false;

  const llegada = hora.slice(0, 5);
  const inicio = desde.slice(0, 5);
  const fin = hasta.slice(0, 5);

  /*
    Una franja que cruza la medianoche --de 22:00 a 06:00-- es continua por
    fuera, no por dentro. El formulario de hoy no la ofrece, pero las dos
    columnas son `time` sueltas y la base la admite; sin este caso, una llegada
    a las 23:00 contaria como fuera de hora.
  */
  if (inicio > fin) return llegada < inicio && llegada > fin;

  return llegada < inicio || llegada > fin;
}
