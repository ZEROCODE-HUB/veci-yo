import { create } from 'zustand';
import { Guardia, PermisoVivienda, Coadministrador } from '@/shared/types';
import { bloquesAdmin, depositosAdmin, guardiasAdmin, porteriasAdmin, tipologiasAdmin, torresAdmin, unidadesAdmin } from '@/data/adminMockData';

export interface Torre {
  id: number;
  numero: number;
  nombre: string;
  descripcion?: string;
  depto?: string;
  penthouse?: string;
  tipo?: string;
  cocherasVisitas?: string;
  cocherasPrivadas?: string;
  almacenPrivados?: string;
  entradasPeatonales?: string;
  entradasVehiculares?: string;
  pisos?: string;
  sotanos?: string;
  ubicacionParkingVisitas?: string;
  nomenclaturaDesde?: string;
  nomenclaturaHasta?: string;
}

export interface Tipologia {
  id: number;
  nombre: string;
  metrosCuadrados: number;
  habitaciones: number;
  banos: number;
}

export interface Porteria {
  id: number;
  nombre: string;
  tipo: string;
  ubicacion?: string;
  telefono?: string;
}

export interface Bloque {
  id: number;
  nombre: string;
  descripcion?: string;
}

export interface Unidad {
  id: number;
  codigo: string;
  torreNumero: number;
  piso: number;
  tipologiaId?: number;
  estacionamientos?: number;
  ubicacionParking?: string;
  estado: string;
  propietarioAsignado?: string;
  propietarioEmail?: string;
}

export interface Deposito {
  id: number;
  codigo: string;
  torreNumero: number;
  ubicacion: string;
  unidadId: number;
  departamentoCodigo: string;
}

export interface PropietarioInvited {
  id: number;
  nombre: string;
  email: string;
  unidadId: number;
  estado: string;
  fechaInvitacion: string;
}

interface AdminState {
  torres: Torre[];
  tipologias: Tipologia[];
  porterias: Porteria[];
  estacionamientosVisitantes: { total: number; ocupados: number };
  estacionamientosAsignados: Record<string, string>;
  bloques: Bloque[];
  unidades: Unidad[];
  depositos: Deposito[];
  propietariosInvited: PropietarioInvited[];
  guardias: Guardia[];
  permisos: PermisoVivienda;
  coadministradores: Coadministrador[];

  agregarTorre: (datos: Omit<Torre, 'id' | 'numero'>) => void;
  actualizarTorre: (torre: Torre) => void;
  eliminarTorre: (torre: Torre) => void;
  agregarTipologia: (datos: Omit<Tipologia, 'id'>) => void;
  actualizarTipologia: (item: Tipologia) => void;
  eliminarTipologia: (id: number) => void;
  agregarPorteria: (datos: Omit<Porteria, 'id'>) => void;
  actualizarPorteria: (item: Porteria) => void;
  eliminarPorteria: (id: number) => void;
  actualizarEstacionamientosVisitantes: (datos: Partial<{ total: number; ocupados: number }>) => void;
  asignarEstacionamientoVisita: (spot: string, clave: string) => void;
  liberarEstacionamientoVisita: (spot: string) => void;
  guardarAsignacionesEstacionamiento: (mapa: Record<string, string>) => void;
  agregarBloque: (datos: Omit<Bloque, 'id'>) => void;
  actualizarBloque: (item: Bloque) => void;
  eliminarBloque: (id: number) => void;
  agregarUnidad: (datos: Omit<Unidad, 'id'>) => void;
  actualizarUnidad: (item: Unidad) => void;
  eliminarUnidad: (id: number) => void;
  actualizarEstadoUnidad: (unidadId: number, nuevoEstado: string) => void;
  asignarPropietarioUnidad: (unidadId: number, propietarioData: { nombre: string; email: string }) => void;
  aceptarInvitacion: (invitacionId: number) => void;
  marcarUnidadConfigurada: (unidadId: number) => void;
  agregarDeposito: (datos: Omit<Deposito, 'id'>) => void;
  actualizarDeposito: (item: Deposito) => void;
  eliminarDeposito: (id: number) => void;
  agregarGuardia: (datos: Omit<Guardia, 'id'>) => void;
  actualizarGuardia: (guardia: Guardia) => void;
  eliminarGuardia: (guardia: Guardia) => void;
  actualizarPermisos: (datos: Partial<PermisoVivienda>) => void;
  agregarCoadministrador: (datos: Omit<Coadministrador, 'id'>) => void;
  actualizarCoadministrador: (item: Coadministrador) => void;
  eliminarCoadministrador: (id: number) => void;
  setTorres: (torres: Torre[]) => void;
  setTipologias: (tipologias: Tipologia[]) => void;
  setPorterias: (porterias: Porteria[]) => void;
  setBloques: (bloques: Bloque[]) => void;
  setUnidades: (unidades: Unidad[]) => void;
  setDepositos: (depositos: Deposito[]) => void;
  setPropietariosInvited: (invited: PropietarioInvited[]) => void;
  setGuardias: (guardias: Guardia[]) => void;
  setPermisos: (permisos: PermisoVivienda) => void;
  setCoadministradores: (coadmins: Coadministrador[]) => void;
}

export const useAdminStore = create<AdminState>((set) => ({
  torres: torresAdmin,
  tipologias: tipologiasAdmin,
  porterias: porteriasAdmin,
  estacionamientosVisitantes: { total: 20, ocupados: 5 },
  estacionamientosAsignados: { B03: '1-0', B07: '1-2' },
  bloques: bloquesAdmin,
  unidades: unidadesAdmin,
  depositos: depositosAdmin,
  propietariosInvited: [
    {
      id: 1,
      nombre: 'Guillermo Paredes',
      email: 'guillermo@veciyo.com',
      unidadId: 6,
      estado: 'pendiente',
      fechaInvitacion: '13/09/2026',
    },
  ],
  guardias: guardiasAdmin,
  permisos: {
    entregaDirecta: true,
    huespedesTemporales: true,
    estanciaCorta: {
      permiteVisitas: 'Sí',
      estanciaMinima: '2 días',
      permiteHuespedNinos: 'Sí',
      permiteMascotas: 'No',
      permiteCocherasVisit: 'Sí',
      horarioCheckin: '08:30 a 13:30',
    },
    estanciaLarga: {
      permiteVisitas: 'Sí',
      estanciaMinima: '2 días',
      permiteHuespedNinos: 'Sí',
      permiteMascotas: 'No',
      permiteCocherasVisit: 'Sí',
      horarioCheckin: '08:30 a 13:30',
    },
  },
  coadministradores: [],

  agregarTorre: (datos) =>
    set((state) => {
      const numero = state.torres.length ? Math.max(...state.torres.map((t) => t.numero)) + 1 : 1;
      return { torres: [...state.torres, { id: Date.now(), numero, ...datos }] };
    }),

  actualizarTorre: (torre) =>
    set((state) => ({
      torres: state.torres.map((t) => (t.id === torre.id ? { ...t, ...torre } : t)),
    })),

  eliminarTorre: (torre) =>
    set((state) => ({
      torres: state.torres.filter((t) => t.id !== torre.id),
    })),

  agregarTipologia: (datos) =>
    set((state) => ({
      tipologias: [...state.tipologias, { id: Date.now(), ...datos }],
    })),

  actualizarTipologia: (item) =>
    set((state) => ({
      tipologias: state.tipologias.map((t) => (t.id === item.id ? { ...t, ...item } : t)),
    })),

  eliminarTipologia: (id) =>
    set((state) => ({
      tipologias: state.tipologias.filter((t) => t.id !== id),
    })),

  agregarPorteria: (datos) =>
    set((state) => ({
      porterias: [...state.porterias, { id: Date.now(), ...datos }],
    })),

  actualizarPorteria: (item) =>
    set((state) => ({
      porterias: state.porterias.map((p) => (p.id === item.id ? { ...p, ...item } : p)),
    })),

  eliminarPorteria: (id) =>
    set((state) => ({
      porterias: state.porterias.filter((p) => p.id !== id),
    })),

  actualizarEstacionamientosVisitantes: (datos) =>
    set((state) => ({
      estacionamientosVisitantes: { ...state.estacionamientosVisitantes, ...datos },
    })),

  asignarEstacionamientoVisita: (spot, clave) =>
    set((state) => {
      if (state.estacionamientosAsignados[spot]) return state;
      const next = { ...state.estacionamientosAsignados, [spot]: clave };
      return {
        estacionamientosAsignados: next,
        estacionamientosVisitantes: {
          ...state.estacionamientosVisitantes,
          ocupados: Math.min(state.estacionamientosVisitantes.total, Object.keys(next).length),
        },
      };
    }),

  liberarEstacionamientoVisita: (spot) =>
    set((state) => {
      if (!state.estacionamientosAsignados[spot]) return state;
      const next = { ...state.estacionamientosAsignados };
      delete next[spot];
      return {
        estacionamientosAsignados: next,
        estacionamientosVisitantes: {
          ...state.estacionamientosVisitantes,
          ocupados: Object.keys(next).length,
        },
      };
    }),

  guardarAsignacionesEstacionamiento: (mapa) =>
    set((state) => ({
      estacionamientosAsignados: mapa,
      estacionamientosVisitantes: {
        ...state.estacionamientosVisitantes,
        ocupados: Math.min(state.estacionamientosVisitantes.total, Object.keys(mapa).length),
      },
    })),

  agregarBloque: (datos) =>
    set((state) => ({
      bloques: [...state.bloques, { id: Date.now(), ...datos }],
    })),

  actualizarBloque: (item) =>
    set((state) => ({
      bloques: state.bloques.map((b) => (b.id === item.id ? { ...b, ...item } : b)),
    })),

  eliminarBloque: (id) =>
    set((state) => ({
      bloques: state.bloques.filter((b) => b.id !== id),
    })),

  agregarUnidad: (datos) =>
    set((state) => ({
      unidades: [...state.unidades, { id: Date.now(), ...datos }],
    })),

  actualizarUnidad: (item) =>
    set((state) => ({
      unidades: state.unidades.map((u) => (u.id === item.id ? { ...u, ...item } : u)),
    })),

  eliminarUnidad: (id) =>
    set((state) => ({
      unidades: state.unidades.filter((u) => u.id !== id),
    })),

  actualizarEstadoUnidad: (unidadId, nuevoEstado) =>
    set((state) => ({
      unidades: state.unidades.map((u) => (u.id === unidadId ? { ...u, estado: nuevoEstado } : u)),
    })),

  asignarPropietarioUnidad: (unidadId, propietarioData) =>
    set((state) => ({
      unidades: state.unidades.map((u) =>
        u.id === unidadId
          ? { ...u, propietarioAsignado: propietarioData.nombre, propietarioEmail: propietarioData.email, estado: 'invitado' }
          : u
      ),
      propietariosInvited: [
        ...state.propietariosInvited,
        {
          id: Date.now(),
          nombre: propietarioData.nombre,
          email: propietarioData.email,
          unidadId,
          estado: 'pendiente',
          fechaInvitacion: new Date().toLocaleDateString('es-AR'),
        },
      ],
    })),

  aceptarInvitacion: (invitacionId) =>
    set((state) => {
      const inv = state.propietariosInvited.find((i) => i.id === invitacionId);
      return {
        propietariosInvited: state.propietariosInvited.map((i) =>
          i.id === invitacionId ? { ...i, estado: 'aceptada' } : i
        ),
        unidades: inv
          ? state.unidades.map((u) =>
              u.id === inv.unidadId
                ? { ...u, estado: 'config-pendiente', propietarioAsignado: u.propietarioAsignado || 'Pendiente' }
                : u
            )
          : state.unidades,
      };
    }),

  marcarUnidadConfigurada: (unidadId) =>
    set((state) => ({
      unidades: state.unidades.map((u) => (u.id === unidadId ? { ...u, estado: 'config-completado' } : u)),
    })),

  agregarDeposito: (datos) =>
    set((state) => ({
      depositos: [...state.depositos, { id: Date.now(), ...datos }],
    })),

  actualizarDeposito: (item) =>
    set((state) => ({
      depositos: state.depositos.map((d) => (d.id === item.id ? { ...d, ...item } : d)),
    })),

  eliminarDeposito: (id) =>
    set((state) => ({
      depositos: state.depositos.filter((d) => d.id !== id),
    })),

  agregarGuardia: (datos) =>
    set((state) => ({
      guardias: [{ id: Date.now(), ...datos }, ...state.guardias],
    })),

  actualizarGuardia: (guardia) =>
    set((state) => ({
      guardias: state.guardias.map((g) => (g.id === guardia.id ? { ...g, ...guardia } : g)),
    })),

  eliminarGuardia: (guardia) =>
    set((state) => ({
      guardias: state.guardias.filter((g) => g.id !== guardia.id),
    })),

  actualizarPermisos: (datos) =>
    set((state) => ({
      permisos: { ...state.permisos, ...datos },
    })),

  agregarCoadministrador: (datos) =>
    set((state) => ({
      coadministradores: [...state.coadministradores, { id: Date.now(), ...datos }],
    })),

  actualizarCoadministrador: (item) =>
    set((state) => ({
      coadministradores: state.coadministradores.map((c) => (c.id === item.id ? { ...c, ...item } : c)),
    })),

  eliminarCoadministrador: (id) =>
    set((state) => ({
      coadministradores: state.coadministradores.filter((c) => c.id !== id),
    })),

  setTorres: (torres) => set({ torres }),
  setTipologias: (tipologias) => set({ tipologias }),
  setPorterias: (porterias) => set({ porterias }),
  setBloques: (bloques) => set({ bloques }),
  setUnidades: (unidades) => set({ unidades }),
  setDepositos: (depositos) => set({ depositos }),
  setPropietariosInvited: (propietariosInvited) => set({ propietariosInvited }),
  setGuardias: (guardias) => set({ guardias }),
  setPermisos: (permisos) => set({ permisos }),
  setCoadministradores: (coadministradores) => set({ coadministradores }),
}));
