import type { GestionZona } from "@/stores/zonas-store";

export interface FechaEspecialFormValue {
  fecha: string;
  tipo: string;
  motivo: string;
  horaApertura?: string;
  horaCierre?: string;
}

export interface BloqueHorario {
  inicio: string;
  fin: string;
}

export type GestionZonaFormValues = Omit<GestionZona, "fechasEspeciales" | "usaSlots" | "duracionPermitida" | "horariosDisponibles" | "reglamento" | "requiereAprobacion" | "permiteCorta" | "permiteLarga"> & {
  fechasEspeciales: FechaEspecialFormValue[];
  usaSlots: boolean;
  duracionPermitida: number;
  horariosDisponibles: string[];
  reglamento: string;
  requiereAprobacion: boolean;
  permiteCorta: boolean;
  permiteLarga: boolean;
  cantidadBloques: number;
  bloques: BloqueHorario[];
};

export const TIPOS_ZONA = ["Barbecue", "Swimming Pool", "Children's Park", "Gym", "Coworking Space", "Tennis Court", "Game Room", "Laundry Room"];
export const DIAS_ZONA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
export const MONEDAS_ZONA = ["COP", "USD", "EUR", "ARS", "MXN"];
export const TIPOS_FECHA_ESPECIAL = [
  { value: "cerrado", label: "Cerrado por mantenimiento" },
  { value: "evento_privado", label: "Evento privado" },
  { value: "feriado", label: "Feriado" },
  { value: "horario_especial", label: "Horario especial" },
];
export const gestionZonaVacia = (): GestionZonaFormValues => ({
  id: `zona-${Date.now()}`, nombre: "", tipo: TIPOS_ZONA[0], descripcion: "", imagen: null,
  horarioApertura: "08:00", horarioCierre: "22:00", duracionMinima: 60, duracionMaxima: 240,
  tiempoMinimoEntreReservas: 30, diasHabilitados: [...DIAS_ZONA], fechasEspeciales: [],
  montoGarantia: 0, costoLimpieza: 0, costoReserva: 0, moneda: "COP", activa: true,
  usaSlots: false, duracionPermitida: 2, horariosDisponibles: [], reglamento: "",
  requiereAprobacion: false, permiteCorta: true, permiteLarga: true,
  cantidadBloques: 2,
  bloques: [
    { inicio: "08:00", fin: "10:00" },
    { inicio: "10:00", fin: "12:00" },
    { inicio: "14:00", fin: "16:00" },
  ],
});
