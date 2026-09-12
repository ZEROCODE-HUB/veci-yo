import type { Guardia, PermisoVivienda } from '@/shared/types';
import type { Bloque, Deposito, Porteria, Tipologia, Torre, Unidad } from '@/stores/admin-store';
import type { GestionZona } from '@/stores/zonas-store';

export const torresAdmin: Torre[] = [
  { id: 1, numero: 1, nombre: 'Torre 1', descripcion: 'Torre principal' },
  { id: 2, numero: 2, nombre: 'Torre 2', descripcion: 'Torre secundaria' },
  { id: 3, numero: 3, nombre: 'Torre 3', descripcion: 'Torre posterior' },
];
export const tipologiasAdmin: Tipologia[] = [
  { id: 1, nombre: 'Estandar', metrosCuadrados: 80, habitaciones: 2, banos: 2 },
  { id: 2, nombre: 'Premium', metrosCuadrados: 110, habitaciones: 3, banos: 2 },
  { id: 3, nombre: 'Suite', metrosCuadrados: 145, habitaciones: 4, banos: 3 },
];
export const porteriasAdmin: Porteria[] = [
  { id: 1, nombre: 'Principal', tipo: 'Entrada principal', ubicacion: 'Acceso principal', telefono: '+593 999999001' },
  { id: 2, nombre: 'Secundaria', tipo: 'Acceso vehicular', ubicacion: 'Acceso posterior', telefono: '+593 999999002' },
];
export const bloquesAdmin: Bloque[] = [
  { id: 1, nombre: 'A', descripcion: 'Bloque A - Torres 1 a 3' },
  { id: 2, nombre: 'B', descripcion: 'Bloque B - Torres 4 a 6' },
];
export const unidadesAdmin: Unidad[] = [
  { id: 1, codigo: '101', torreNumero: 1, piso: 1, tipologiaId: 1, estacionamientos: 1, estado: 'config-completado', propietarioAsignado: 'Ana Flores', propietarioEmail: 'ana@ejemplo.com' },
  { id: 2, codigo: '102', torreNumero: 1, piso: 1, tipologiaId: 1, estacionamientos: 1, estado: 'disponible' },
  { id: 3, codigo: '103', torreNumero: 1, piso: 1, tipologiaId: 2, estacionamientos: 2, estado: 'disponible' },
  { id: 6, codigo: '201', torreNumero: 1, piso: 2, tipologiaId: 2, estacionamientos: 1, estado: 'invitado', propietarioAsignado: 'Guillermo Paredes', propietarioEmail: 'guillermo@veciyo.com' },
  { id: 7, codigo: '202', torreNumero: 1, piso: 2, tipologiaId: 1, estacionamientos: 1, estado: 'disponible' },
  { id: 8, codigo: '301', torreNumero: 1, piso: 3, tipologiaId: 2, estacionamientos: 2, estado: 'aceptado', propietarioAsignado: 'Carlos Mendoza', propietarioEmail: 'carlos@ejemplo.com' },
  { id: 9, codigo: '302', torreNumero: 1, piso: 3, tipologiaId: 1, estacionamientos: 1, estado: 'disponible' },
  { id: 10, codigo: 'PH-1', torreNumero: 1, piso: 9, tipologiaId: 3, estacionamientos: 2, estado: 'disponible' },
  { id: 4, codigo: '101', torreNumero: 2, piso: 1, tipologiaId: 1, estacionamientos: 1, estado: 'disponible' },
  { id: 11, codigo: '102', torreNumero: 2, piso: 1, tipologiaId: 1, estacionamientos: 1, estado: 'disponible' },
  { id: 12, codigo: '201', torreNumero: 2, piso: 2, tipologiaId: 2, estacionamientos: 2, estado: 'config-completado', propietarioAsignado: 'Maria Juarez', propietarioEmail: 'maria@ejemplo.com' },
  { id: 13, codigo: '101', torreNumero: 3, piso: 1, tipologiaId: 1, estacionamientos: 1, estado: 'disponible' },
  { id: 14, codigo: '102', torreNumero: 3, piso: 1, tipologiaId: 2, estacionamientos: 2, estado: 'disponible' },
  { id: 15, codigo: '103', torreNumero: 3, piso: 1, tipologiaId: 1, estacionamientos: 1, estado: 'disponible' },
];
export const depositosAdmin: Deposito[] = [
  { id: 1, codigo: 'DEP-001', torreNumero: 1, ubicacion: 'Sótano -2', unidadId: 1, departamentoCodigo: '101' },
  { id: 2, codigo: 'DEP-002', torreNumero: 1, ubicacion: 'Sótano -2', unidadId: 6, departamentoCodigo: '201' },
  { id: 3, codigo: 'DEP-003', torreNumero: 2, ubicacion: 'Sótano -1', unidadId: 12, departamentoCodigo: '201' },
];
export const guardiasAdmin: Guardia[] = [
  { id: 1, nombre: 'Roberto Hornado', correo: 'roberto.hornado@gmail.com', cedula: '2975186114', diasCalendario: 'Quito', garita: 'Principal', turnos: [{ dia: 'Lunes', hora: '18:00 a 24:00' }, { dia: 'Miercoles', hora: '18:00 a 24:00' }] },
  { id: 2, nombre: 'Juan Franco', correo: 'juan.franco@gmail.com', cedula: '29748676114', diasCalendario: 'Quito', garita: 'Principal', turnos: [{ dia: 'Martes', hora: '00:00 a 06:00' }, { dia: 'Jueves', hora: '18:00 a 24:00' }] },
];
export const permisosAdmin: PermisoVivienda = {
  entregaDirecta: true,
  huespedesTemporales: true,
  estanciaCorta: { permiteVisitas: 'Si', estanciaMinima: '2 dias', permiteHuespedNinos: 'Si', permiteMascotas: 'No', permiteCocherasVisit: 'Si', horarioCheckin: '08:30 a 13:30' },
  estanciaLarga: { permiteVisitas: 'Si', estanciaMinima: '2 dias', permiteHuespedNinos: 'Si', permiteMascotas: 'No', permiteCocherasVisit: 'Si', horarioCheckin: '08:30 a 13:30' },
};
export const gestionZonasAdmin: Record<string, GestionZona> = {
  piscina: { id: 'piscina', nombre: 'Piscina', tipo: 'Swimming Pool', descripcion: 'Piscina comunitaria para residentes', imagen: null, horarioApertura: '06:00', horarioCierre: '21:00', duracionMinima: 60, duracionMaxima: 180, tiempoMinimoEntreReservas: 30, diasHabilitados: ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'], fechasEspeciales: [], montoGarantia: 0, costoLimpieza: 0, costoReserva: 0, moneda: 'COP', activa: true },
  bbq: { id: 'bbq', nombre: 'BBQ', tipo: 'Barbecue', descripcion: 'Area de parrillas para reuniones', imagen: null, horarioApertura: '08:00', horarioCierre: '22:00', duracionMinima: 60, duracionMaxima: 240, tiempoMinimoEntreReservas: 60, diasHabilitados: ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'], fechasEspeciales: [], montoGarantia: 50000, costoLimpieza: 15000, costoReserva: 0, moneda: 'COP', activa: true },
};
