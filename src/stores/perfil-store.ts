import { create } from 'zustand';

/**
 * Lo que queda del store de perfil.
 *
 * `ConfiguracionApp` vivía aquí —código de país, teléfono, correo y contacto
 * alternativos, y las tres casillas de apariencia— sembrado con los datos de
 * alguien inventado, y se perdía al cerrar la aplicación (R-29). Ahora son
 * columnas de `perfil` y las lee
 * `features/perfil/services/configuracion.repo.ts`.
 *
 * `Reclamo` se fue antes, a `features/perfil/services/pqrs.repo.ts`: aquí
 * guardaba además la cédula de quien abría la PQRS, que la lista publicaba en
 * cada tarjeta.
 *
 * Lo que sigue aquí es lo que todavía no tiene su sitio en la base. Está
 * anotado; no es que se haya decidido dejarlo en memoria.
 */

export interface Seguridad {
  correoRespaldo: string;
  faceId: boolean;
  huellaDactilar: boolean;
  f2a: boolean;
  pausarCuenta: boolean;
}

type Guestbook = Record<
  string,
  {
    wifiName?: string;
    wifiPassword?: string;
    doorPassword?: string;
    instructions?: string;
    notes?: string;
  }
>;

interface PerfilState {
  seguridad: Seguridad;
  pagosMantenimiento: Record<number, boolean>;
  comitePropietarios: Record<string, boolean>;
  guestbook: Guestbook;

  actualizarSeguridad: (datos: Partial<Seguridad>) => void;
  marcarPagoMantenimiento: (unidadId: number, pagado: boolean) => void;
  toggleComite: (email: string) => void;
  actualizarGuestbook: (
    ubicacionId: string,
    datos: Partial<Guestbook[string]>,
  ) => void;
  setSeguridad: (seguridad: Seguridad) => void;
  setPagosMantenimiento: (pagos: Record<number, boolean>) => void;
  setComitePropietarios: (comite: Record<string, boolean>) => void;
  setGuestbook: (guestbook: Guestbook) => void;
}

export const usePerfilStore = create<PerfilState>((set) => ({
  seguridad: {
    // Era 'marialalu@gmail.com', el correo de una persona inventada, y se
    // mostraba a cualquiera que abriera Seguridad.
    correoRespaldo: '',
    faceId: false,
    huellaDactilar: false,
    f2a: false,
    pausarCuenta: false,
  },
  pagosMantenimiento: {},
  comitePropietarios: {},
  guestbook: {},

  actualizarSeguridad: (datos) =>
    set((state) => ({
      seguridad: { ...state.seguridad, ...datos },
    })),

  marcarPagoMantenimiento: (unidadId, pagado) =>
    set((state) => ({
      pagosMantenimiento: { ...state.pagosMantenimiento, [unidadId]: pagado },
    })),

  toggleComite: (email) =>
    set((state) => ({
      comitePropietarios: {
        ...state.comitePropietarios,
        [email]: !state.comitePropietarios[email],
      },
    })),

  actualizarGuestbook: (ubicacionId, datos) =>
    set((state) => ({
      guestbook: {
        ...state.guestbook,
        [ubicacionId]: { ...state.guestbook[ubicacionId], ...datos },
      },
    })),

  setSeguridad: (seguridad) => set({ seguridad }),
  setPagosMantenimiento: (pagosMantenimiento) => set({ pagosMantenimiento }),
  setComitePropietarios: (comitePropietarios) => set({ comitePropietarios }),
  setGuestbook: (guestbook) => set({ guestbook }),
}));
