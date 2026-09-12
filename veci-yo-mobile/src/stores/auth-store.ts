import { create } from 'zustand';
import { Usuario, ModoAuth, RolActivo } from '@/shared/types';
import { usePropietarioStore } from './propietario-store';
import { useUbicacionStore, ubicacionesDemoInit } from './ubicacion-store';

interface AuthState {
  autenticado: boolean;
  modo: ModoAuth;
  usuario: Usuario | null;
  rolActivo: RolActivo;
  turnoTerminado: boolean;
  mostrarBienvenida: boolean;

  iniciarSesion: (data: { correo: string }) => void;
  registrarUsuario: (data: Omit<Usuario, 'verificado'>) => void;
  ingresarIncognito: () => void;
  ingresarComoDemo: (rol: string) => void;
  completarVerificacion: () => void;
  cerrarSesion: () => void;
  cerrarBienvenida: () => void;
  terminarTurno: () => void;
  setRolActivo: (rol: RolActivo) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  autenticado: false,
  modo: null,
  usuario: null,
  rolActivo: null,
  turnoTerminado: false,
  mostrarBienvenida: false,

  iniciarSesion: ({ correo }) =>
    set({
      usuario: {
        nombre: 'Guillermo',
        apellido: 'Paredes',
        correo: correo || 'guillermo@veciyo.com',
        tipoDocumento: 'Cedula',
        verificado: true,
      },
      modo: 'cuenta',
      rolActivo: null,
      autenticado: true,
    }),

  registrarUsuario: (datos) =>
    set({
      usuario: { ...datos, verificado: false },
      modo: 'cuenta',
      rolActivo: null,
      autenticado: true,
      mostrarBienvenida: true,
    }),

  ingresarIncognito: () =>
    (() => {
      useUbicacionStore.getState().setUbicaciones(ubicacionesDemoInit);
      set({
        usuario: null,
        modo: 'incognito',
        rolActivo: null,
        autenticado: true,
      });
    })(),

  ingresarComoDemo: (rol) => {
    const sinProps = rol === 'propietario-sin-propiedades';
    const noResidente = rol === 'propietario-no-residente';
    const correoDemo = 'guillermo@veciyo.com';
    const residentesDeclarados = usePropietarioStore.getState().residentesDeclarados;
    usePropietarioStore.getState().setResidentesDeclarados({
      ...residentesDeclarados,
      [correoDemo]: !noResidente,
    });
    useUbicacionStore.getState().setUbicaciones(
      sinProps ? [] : ubicacionesDemoInit,
    );
    set({
      usuario: rol === 'propietario' || noResidente
        ? { nombre: 'Guillermo', apellido: 'Paredes', correo: correoDemo, tipoDocumento: 'Cedula', verificado: true }
        : rol === 'huesped-temporal'
        ? { nombre: 'María Fernanda', apellido: 'López', correo: 'maria.lopez@example.com', tipoDocumento: 'Pasaporte', verificado: true }
        : null,
      modo: 'demo',
      rolActivo: sinProps ? 'propietario' : (noResidente ? 'propietario' : rol as RolActivo),
      autenticado: true,
    });
  },

  completarVerificacion: () =>
    set((state) => ({
      usuario: state.usuario ? { ...state.usuario, verificado: true } : null,
    })),

  cerrarSesion: () =>
    set({
      usuario: null,
      modo: null,
      rolActivo: null,
      autenticado: false,
      turnoTerminado: false,
    }),

  cerrarBienvenida: () => set({ mostrarBienvenida: false }),
  terminarTurno: () => set({ turnoTerminado: true }),
  setRolActivo: (rol) => set({ rolActivo: rol }),
}));
