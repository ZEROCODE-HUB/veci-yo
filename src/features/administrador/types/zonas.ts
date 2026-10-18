export type ZonaComunFormValues = {
  id: string;
  nombre: string;
  descripcion: string;
  horariosDisponibles: string;
  duracionMaximaMin: string;
  reglas: string;
  capacidadMaxima: string;
  requiereAprobacion: boolean;
  emoji: string;
};

/*
  Aquí vivía `zonaToForm`, que no llamaba nadie, con sus propios respaldos
  --120 minutos de duración y 10 personas de aforo-- distintos de los del
  resto de la app. Se quitó al pasar esos valores a los parámetros de la base
  (18/10/2026): la zona nueva nace con `gestionZonaVacia`.
*/
