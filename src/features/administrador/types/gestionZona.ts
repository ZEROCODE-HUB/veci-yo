import type { GestionZona } from "@/stores/zonas-store";

export interface FechaEspecialFormValue {
  fecha: string;
  tipo: string;
  motivo: string;
  horaApertura?: string;
  horaCierre?: string;
}

export type GestionZonaFormValues = Omit<GestionZona, "fechasEspeciales" | "usaSlots" | "duracionMaximaMin" | "horariosDisponibles" | "reglamento" | "requiereAprobacion" | "permiteCorta" | "permiteLarga" | "capacidadMaxima" | "cuposSimultaneos" | "eligeNumero"> & {
  capacidadMaxima: number;
  cuposSimultaneos: number;
  eligeNumero: boolean;
  fechasEspeciales: FechaEspecialFormValue[];
  usaSlots: boolean;
  duracionMaximaMin: number;
  horariosDisponibles: string[];
  reglamento: string;
  requiereAprobacion: boolean;
  condicionesAprobacion: string;
  /** La clave del icono elegido de la galeria. Vacio = el del tipo. */
  icono: string;
  permiteCorta: boolean;
  permiteLarga: boolean;
};

/*
  Esta lista estaba en ingles --Barbecue, Swimming Pool, Gym...-- y no eran
  tipos de zona sino zonas: herencia del prototipo. La base guarda la
  categoria, ahora como enum `tipo_zona`, y el desplegable no mostraba el
  valor guardado porque no estaba entre sus opciones.
*/
export const TIPOS_ZONA = [
  { value: "recreacion", label: "Recreación" },
  { value: "servicios", label: "Servicios" },
  { value: "eventos", label: "Eventos" },
];

export const ETIQUETA_TIPO_ZONA: Record<string, string> = Object.fromEntries(
  TIPOS_ZONA.map((t) => [t.value, t.label]),
);
export const DIAS_ZONA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
/*
  Las dos que existen en la base (`tipo_fecha_especial`). Había cuatro
  --«cerrado», «evento privado», «feriado», «horario especial»-- y las tres
  primeras significan lo mismo para quien reserva: ese día no se puede. El
  porqué va en el motivo, que es texto.
*/
export const TIPOS_FECHA_ESPECIAL = [
  { value: "cerrada", label: "Cerrada ese día" },
  { value: "horario_especial", label: "Horario especial" },
];
/**
 * Con qué valores nace una zona nueva. Los decide el edificio
 * (`zona_apertura_por_defecto`, `zona_cierre_por_defecto`,
 * `zona_duracion_minima_por_defecto`, `zona_duracion_maxima_por_defecto`,
 * `zona_tiempo_entre_reservas_por_defecto`, `zona_cupos_por_defecto`) y los
 * pasa la pantalla: aquí estaban escritos a mano.
 */
export interface PlantillaDeZona {
  apertura: string;
  cierre: string;
  duracionMinimaMin: number;
  duracionMaximaMin: number;
  tiempoEntreReservasMin: number;
  cupos: number;
  /** La del edificio: proponía «COP» siempre (Parametrización, 25/10/2026). */
  moneda: string;
}

export const gestionZonaVacia = (plantilla: PlantillaDeZona): GestionZonaFormValues => ({
  id: `zona-${Date.now()}`, nombre: "", tipo: TIPOS_ZONA[0].value, descripcion: "", imagen: null,
  horarioApertura: plantilla.apertura, horarioCierre: plantilla.cierre,
  duracionMinimaMin: plantilla.duracionMinimaMin, duracionMaximaMin: plantilla.duracionMaximaMin,
  tiempoMinimoEntreReservas: plantilla.tiempoEntreReservasMin, diasHabilitados: [...DIAS_ZONA], fechasEspeciales: [],
  montoGarantia: 0, costoLimpieza: 0, costoReserva: 0, moneda: plantilla.moneda, activa: true,
  usaSlots: false, horariosDisponibles: [], reglamento: "",
  requiereAprobacion: false, condicionesAprobacion: "", icono: "",
  permiteCorta: true, permiteLarga: true,
  capacidadMaxima: 0, cuposSimultaneos: plantilla.cupos, eligeNumero: false,
});
