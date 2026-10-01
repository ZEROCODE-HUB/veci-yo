export interface AlojamientoConfig {
  descripcion: string;
  /**
   * El horario de check-in que rige esta estancia, `HH:mm` o nulo.
   *
   * La administracion lo elige por vivienda --y distinto para estancia corta y
   * larga-- desde la pantalla de Permisos. Hasta el 01/10/2026 se guardaba y no
   * lo veia nadie: ni la base lo imponia ni ninguna pantalla lo enseñaba.
   *
   * Nulo es «no se ha decidido», y entonces no se promete ninguna franja.
   */
  checkinDesde: string | null;
  checkinHasta: string | null;
  numHabitaciones: number;
  maxHuespedes: number;
  estacionamientos: number;
  /**
   * En la base es `permite_mascotas`, un booleano. Antes viajaba hasta la
   * pantalla convertido en texto --"permitidas", "no-permitidas" y tambien
   * "no permitidas"--, y la pantalla lo volvia a convertir en booleano al
   * guardar. De esa ida y vuelta salian las tres variantes, y el guion de
   * "no-permitidas" se colaba en la interfaz porque el selector usaba el valor
   * como etiqueta.
   */
  permiteMascotas: boolean;
  aptoNinos: boolean;
}

export interface LibroHuesped {
  wifiName?: string;
  wifiPassword?: string;
  doorPassword?: string;
  instructions?: string;
  notes?: string;
}

