import { create } from 'zustand';
import { formatDate } from "@/shared/utils";

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
  usarAltNotif: boolean;
  telefonoAlt: string;
  correoAlt: string;
  modoDaltonico: boolean;
  fuenteAumentada: boolean;
  modoOscuro: boolean;
}

// `Reclamo` vive ahora en `features/perfil/services/pqrs.repo.ts`, junto a la
// consulta que lo produce. Aqui guardaba ademas `ci`, la cedula de quien la
// abria, que la lista publicaba en cada tarjeta.

interface PerfilState {
  seguridad: Seguridad;
  configuracionApp: ConfiguracionApp;
  pagosMantenimiento: Record<number, boolean>;
  comitePropietarios: Record<string, boolean>;
  guestbook: Record<string, { wifiName?: string; wifiPassword?: string; doorPassword?: string; instructions?: string; notes?: string }>;

  actualizarSeguridad: (datos: Partial<Seguridad>) => void;
  pausarCuenta: () => void;
  actualizarConfiguracionApp: (datos: Partial<ConfiguracionApp>) => void;
  marcarPagoMantenimiento: (unidadId: number, pagado: boolean) => void;
  toggleComite: (email: string) => void;
  actualizarGuestbook: (ubicacionId: string, datos: Partial<{ wifiName: string; wifiPassword: string; doorPassword: string; instructions: string; notes: string }>) => void;
  setSeguridad: (seguridad: Seguridad) => void;
  setConfiguracionApp: (config: ConfiguracionApp) => void;
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
  // Estos valores son los de una persona inventada y se mostraban a cualquiera
  // que abriera Configuracion. Las preferencias siguen sin persistir: migrarlas
  // es su propio bloque (ver RIESGOS-Y-DUDAS R-29).
  configuracionApp: {
    codigoPais: '',
    telefono: '',
    correo: '',
    usarAltNotif: false,
    telefonoAlt: '',
    correoAlt: '',
    modoDaltonico: false,
    fuenteAumentada: false,
    modoOscuro: false,
  },
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


  marcarPagoMantenimiento: (unidadId, pagado) =>
    set((state) => ({
      pagosMantenimiento: { ...state.pagosMantenimiento, [unidadId]: pagado },
    })),

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
  setPagosMantenimiento: (pagosMantenimiento) => set({ pagosMantenimiento }),
  setComitePropietarios: (comitePropietarios) => set({ comitePropietarios }),
  setGuestbook: (guestbook) => set({ guestbook }),
}));
