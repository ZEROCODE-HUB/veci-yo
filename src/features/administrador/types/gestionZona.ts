import type { GestionZona } from "@/stores/zonas-store";

export interface FechaEspecialFormValue {
  fecha: string;
  tipo: string;
  motivo: string;
  horaApertura?: string;
  horaCierre?: string;
}

export type GestionZonaFormValues = Omit<GestionZona, "fechasEspeciales" | "usaSlots" | "duracionMaximaMin" | "horariosDisponibles" | "reglamento" | "requiereAprobacion" | "permiteCorta" | "permiteLarga"> & {
  fechasEspeciales: FechaEspecialFormValue[];
  usaSlots: boolean;
  duracionMaximaMin: number;
  horariosDisponibles: string[];
  reglamento: string;
  requiereAprobacion: boolean;
  condicionesAprobacion: string;
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
export const MONEDAS_ZONA = ["COP", "USD", "EUR", "ARS", "MXN"];
export const TIPOS_FECHA_ESPECIAL = [
  { value: "cerrado", label: "Cerrado por mantenimiento" },
  { value: "evento_privado", label: "Evento privado" },
  { value: "feriado", label: "Feriado" },
  { value: "horario_especial", label: "Horario especial" },
];
export const gestionZonaVacia = (): GestionZonaFormValues => ({
  id: `zona-${Date.now()}`, nombre: "", tipo: TIPOS_ZONA[0].value, descripcion: "", imagen: null,
  horarioApertura: "08:00", horarioCierre: "22:00", duracionMinimaMin: 60, duracionMaximaMin: 240,
  tiempoMinimoEntreReservas: 30, diasHabilitados: [...DIAS_ZONA], fechasEspeciales: [],
  montoGarantia: 0, costoLimpieza: 0, costoReserva: 0, moneda: "COP", activa: true,
  usaSlots: false, horariosDisponibles: [], reglamento: "",
  requiereAprobacion: false, condicionesAprobacion: "",
  permiteCorta: true, permiteLarga: true,
});
