/** Lo que hace falta de cada membresía para decidir esto. */
export interface FilaDeEstancia {
  rol: string;
  vigente_hasta: string | null;
}

/**
 * Si a esta persona lo único que tenía era una estancia y ya se le acabó.
 *
 * Al caducar, la membresía se descarta al armar la sesión y la persona se queda
 * sin ningún rol. Hasta el 30/09/2026 eso la mandaba a la vista de
 * **`propietario-sin-propiedades`**, que es la de alguien que todavía no ha
 * registrado su piso: menú completo de residente, «Registra tu primera
 * propiedad» y un botón de «Agregar propiedad».
 *
 * O sea que a quien se alojó tres noches en un edificio ajeno se le ofrecía dar
 * de alta una propiedad ahí. No es un agujero --la base no le deja ver nada--
 * pero le miente sobre lo que le pasa y le ofrece lo que no le corresponde.
 *
 * La diferencia está en el dato: uno **tiene** membresías, solo que vencidas.
 *
 * Vive en su propio archivo, sin importar nada de la plataforma, por lo mismo
 * que `suscripcionVigente` y `unidadesDelRolActivo`: `sesion.ts` arrastra el
 * cliente de Supabase y con él React Native, que las pruebas unitarias no saben
 * leer.
 *
 * Las fechas son `yyyy-MM-dd` y se comparan como texto: construir un `Date` con
 * una fecha suelta la interpreta en UTC y al oeste de Greenwich cae en el día
 * anterior.
 */
export function soloEstanciasTerminadas(
  filas: FilaDeEstancia[],
  hoy: string,
): boolean {
  if (filas.length === 0) return false;

  return filas.every(
    (fila) =>
      fila.rol === "huesped_temporal" &&
      Boolean(fila.vigente_hasta) &&
      fila.vigente_hasta! < hoy,
  );
}
