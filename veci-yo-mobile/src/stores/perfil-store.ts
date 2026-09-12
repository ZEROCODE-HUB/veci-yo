import { create } from 'zustand';
import { reclamosInit } from '@/features/perfil/soporteMockData';

export interface Seguridad {
  correoRespaldo: string;
  faceId: boolean;
  huellaDactilar: boolean;
  f2a: boolean;
  pausarCuenta: boolean;
}

export interface ConfiguracionApp {
  codigoPais: string;
  telefono: string;
  correo: string;
  alias: string;
  usarAltNotif: boolean;
  telefonoAlt: string;
  correoAlt: string;
  modoDaltonico: boolean;
  fuenteAumentada: boolean;
  modoOscuro: boolean;
}

export interface Reclamo {
  id: number;
  numero: string;
  nombre: string;
  ci: string;
  titulo: string;
  descripcion: string;
  modelo?: string;
  categoria: string;
  subcategoria?: string;
  tipo: string;
  estado: string;
  fechaCreacion: string;
  fechaRevision: string;
  resolucionAdmin?: string;
}

interface PerfilState {
  seguridad: Seguridad;
  configuracionApp: ConfiguracionApp;
  reclamos: Reclamo[];
  alias: string;
  usaAliasCuadroHonor: boolean;
  usaAliasZonas: boolean;
  pagosMantenimiento: Record<number, boolean>;
  comitePropietarios: Record<string, boolean>;
  guestbook: Record<string, { wifiName?: string; wifiPassword?: string; doorPassword?: string; instructions?: string; notes?: string }>;

  actualizarSeguridad: (datos: Partial<Seguridad>) => void;
  pausarCuenta: () => void;
  actualizarConfiguracionApp: (datos: Partial<ConfiguracionApp>) => void;
  agregarReclamo: (datos: Omit<Reclamo, 'id' | 'numero' | 'nombre' | 'ci' | 'estado' | 'fechaCreacion' | 'fechaRevision'>) => Reclamo;
  actualizarEstadoReclamo: (id: number, estado: string) => void;
  actualizarEstadoReclamoConMensaje: (id: number, estado: string, mensaje: string) => void;
  actualizarAlias: (datos: { alias?: string; cuadroHonor?: boolean; zonas?: boolean }) => void;
  marcarPagoMantenimiento: (unidadId: number, pagado: boolean) => void;
  cargarPagosExcel: (deptos: string[]) => void;
  toggleComite: (email: string) => void;
  actualizarGuestbook: (ubicacionId: string, datos: Partial<{ wifiName: string; wifiPassword: string; doorPassword: string; instructions: string; notes: string }>) => void;
  setSeguridad: (seguridad: Seguridad) => void;
  setConfiguracionApp: (config: ConfiguracionApp) => void;
  setReclamos: (reclamos: Reclamo[]) => void;
  setAlias: (alias: string) => void;
  setPagosMantenimiento: (pagos: Record<number, boolean>) => void;
  setComitePropietarios: (comite: Record<string, boolean>) => void;
  setGuestbook: (guestbook: Record<string, { wifiName?: string; wifiPassword?: string; doorPassword?: string; instructions?: string; notes?: string }>) => void;
}

export const usePerfilStore = create<PerfilState>((set) => ({
  seguridad: {
    correoRespaldo: 'marialalu@gmail.com',
    faceId: false,
    huellaDactilar: false,
    f2a: false,
    pausarCuenta: false,
  },
  configuracionApp: {
    codigoPais: '+59',
    telefono: '946376164',
    correo: 'guillermix@gmail.com',
    alias: 'Guilleelpeluca',
    usarAltNotif: false,
    telefonoAlt: '',
    correoAlt: '',
    modoDaltonico: false,
    fuenteAumentada: false,
    modoOscuro: false,
  },
  reclamos: reclamosInit,
  alias: '',
  usaAliasCuadroHonor: true,
  usaAliasZonas: true,
  pagosMantenimiento: {},
  comitePropietarios: {},
  guestbook: {},

  actualizarSeguridad: (datos) =>
    set((state) => ({
      seguridad: { ...state.seguridad, ...datos },
    })),

  pausarCuenta: () =>
    set((state) => ({
      seguridad: { ...state.seguridad, pausarCuenta: true },
    })),

  actualizarConfiguracionApp: (datos) =>
    set((state) => ({
      configuracionApp: { ...state.configuracionApp, ...datos },
    })),

  agregarReclamo: (datos) => {
    const numero = String(Math.floor(100000000000 + Math.random() * 900000000000));
    const fecha = new Date().toLocaleDateString('es-PE');
    const nuevo: Reclamo = {
      id: Date.now(),
      numero,
      nombre: 'Guillermo Paredes',
      ci: '1782753581',
      estado: 'Pendiente',
      fechaCreacion: fecha,
      fechaRevision: fecha,
      ...datos,
    };
    set((state) => ({
      reclamos: [nuevo, ...state.reclamos],
    }));
    return nuevo;
  },

  actualizarEstadoReclamo: (id, estado) =>
    set((state) => ({
      reclamos: state.reclamos.map((r) => (r.id === id ? { ...r, estado } : r)),
    })),

  actualizarEstadoReclamoConMensaje: (id, estado, mensaje) => {
    const fecha = new Date().toLocaleDateString('es-PE');
    set((state) => ({
      reclamos: state.reclamos.map((r) =>
        r.id === id ? { ...r, estado, fechaRevision: fecha, resolucionAdmin: mensaje } : r
      ),
    }));
  },

  actualizarAlias: (datos) =>
    set((state) => ({
      alias: typeof datos.alias === 'string' ? datos.alias : state.alias,
      usaAliasCuadroHonor: typeof datos.cuadroHonor === 'boolean' ? datos.cuadroHonor : state.usaAliasCuadroHonor,
      usaAliasZonas: typeof datos.zonas === 'boolean' ? datos.zonas : state.usaAliasZonas,
    })),

  marcarPagoMantenimiento: (unidadId, pagado) =>
    set((state) => ({
      pagosMantenimiento: { ...state.pagosMantenimiento, [unidadId]: pagado },
    })),

  cargarPagosExcel: (deptos) =>
    set((state) => {
      const next = { ...state.pagosMantenimiento };
      deptos.forEach((codigo) => {
        const u = state.pagosMantenimiento;
        if (codigo) next[Number(codigo)] = true;
      });
      return { pagosMantenimiento: next };
    }),

  toggleComite: (email) =>
    set((state) => ({
      comitePropietarios: { ...state.comitePropietarios, [email]: !state.comitePropietarios[email] },
    })),

  actualizarGuestbook: (ubicacionId, datos) =>
    set((state) => ({
      guestbook: {
        ...state.guestbook,
        [ubicacionId]: { ...state.guestbook[ubicacionId], ...datos },
      },
    })),

  setSeguridad: (seguridad) => set({ seguridad }),
  setConfiguracionApp: (configuracionApp) => set({ configuracionApp }),
  setReclamos: (reclamos) => set({ reclamos }),
  setAlias: (alias) => set({ alias }),
  setPagosMantenimiento: (pagosMantenimiento) => set({ pagosMantenimiento }),
  setComitePropietarios: (comitePropietarios) => set({ comitePropietarios }),
  setGuestbook: (guestbook) => set({ guestbook }),
}));
