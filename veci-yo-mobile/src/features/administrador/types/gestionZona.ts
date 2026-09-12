import type { GestionZona } from "@/stores/zonas-store";

export type GestionZonaFormValues = GestionZona;
export const TIPOS_ZONA = ["Barbecue", "Swimming Pool", "Children's Park", "Gym", "Coworking Space", "Tennis Court", "Game Room", "Laundry Room"];
export const DIAS_ZONA = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"];
export const gestionZonaVacia = (): GestionZonaFormValues => ({
  id: `zona-${Date.now()}`, nombre: "", tipo: TIPOS_ZONA[0], descripcion: "", imagen: null,
  horarioApertura: "08:00", horarioCierre: "22:00", duracionMinima: 60, duracionMaxima: 240,
  tiempoMinimoEntreReservas: 30, diasHabilitados: [...DIAS_ZONA], fechasEspeciales: [],
  montoGarantia: 0, costoLimpieza: 0, costoReserva: 0, moneda: "COP", activa: true,
  usaSlots: false, duracionPermitida: 2, horariosDisponibles: [], reglamento: "",
  requiereAprobacion: false, permiteCorta: true, permiteLarga: true,
});
