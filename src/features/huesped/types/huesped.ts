export interface AlojamientoConfig {
  descripcion: string;
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

