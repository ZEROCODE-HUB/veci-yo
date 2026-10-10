import { create } from 'zustand';
import { Usuario, ModoAuth, RolActivo } from '@/shared/types';
import { useUbicacionStore } from './ubicacion-store';
import {
  cargarContextoUsuario,
  cerrarSesionSupabase,
  iniciarSesionConCorreo,
  registrarConCorreo,
  type MembresiaCondominio,
  type MembresiaUnidad,
  type RolPlataforma,
} from '@/shared/services/sesion';

interface AuthState {
  autenticado: boolean;
  modo: ModoAuth;
  usuario: Usuario | null;
  /** Id en auth.users del usuario autenticado. */
  usuarioId: string | null;
  rolActivo: RolActivo;
  turnoTerminado: boolean;
  mostrarBienvenida: boolean;

  /** Roles que el usuario puede asumir segun sus membresias reales. */
  rolesDisponibles: RolActivo[];
  /** Tenia vivienda y su estancia ya termino. Ver `ContextoUsuario`. */
  estanciaTerminada: boolean;
  /**
   * Con que alcance opera la plataforma, si la opera. `null` para casi todos.
   *
   * Aparte de `rolActivo` porque los dos alcances --`dueno` y `soporte`--
   * comparten el panel: lo que cambia es lo que se puede hacer dentro. La base
   * lo vuelve a comprobar en cada funcion, asi que esto solo decide que botones
   * se pintan.
   */
  rolPlataforma: RolPlataforma | null;
  condominios: MembresiaCondominio[];
  unidades: MembresiaUnidad[];
  /** True mientras se restaura la sesion guardada al abrir la app. */
  restaurando: boolean;

  /** Autenticacion real contra Supabase. */
  iniciarSesionReal: (correo: string, password: string) => Promise<void>;
  registrarReal: (p: { correo: string; password: string; nombre: string; apellido: string }) => Promise<void>;
  /** Carga perfil, membresias y ubicaciones del usuario autenticado. */
  sincronizarContexto: () => Promise<void>;
  restaurarSesion: () => Promise<void>;

  iniciarSesion: (data: { correo: string }) => void;
  registrarUsuario: (data: Omit<Usuario, 'verificado'>) => void;
  completarVerificacion: () => void;
  cerrarSesion: () => void;
  /** Solo limpia el estado local; la usa el manejador de `SIGNED_OUT`. */
  limpiarSesion: () => void;
  cerrarBienvenida: () => void;
  terminarTurno: () => void;
  setRolActivo: (rol: RolActivo) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  autenticado: false,
  modo: null,
  usuario: null,
  usuarioId: null,
  rolActivo: null,
  turnoTerminado: false,
  mostrarBienvenida: false,
  rolesDisponibles: [],
  estanciaTerminada: false,
  rolPlataforma: null,
  condominios: [],
  unidades: [],
  restaurando: true,

  iniciarSesionReal: async (correo, password) => {
    await iniciarSesionConCorreo(correo, password);
    await get().sincronizarContexto();
  },

  registrarReal: async (datos) => {
    await registrarConCorreo(datos);
    await get().sincronizarContexto();
    set({ mostrarBienvenida: true });
  },

  sincronizarContexto: async () => {
    const contexto = await cargarContextoUsuario();
    if (!contexto) {
      set({ autenticado: false, modo: null, usuario: null, rolActivo: null });
      return;
    }
    useUbicacionStore.getState().setUbicaciones(contexto.ubicaciones);
    set({
      usuario: contexto.usuario,
      usuarioId: contexto.usuarioId,
      modo: 'cuenta',
      autenticado: true,
      rolesDisponibles: contexto.rolesDisponibles,
      estanciaTerminada: contexto.estanciaTerminada,
      rolPlataforma: contexto.rolPlataforma,
      condominios: contexto.condominios,
      unidades: contexto.unidades,
      // Si solo hay un rol posible, se asume; si hay varios, la app pregunta.
      rolActivo: contexto.rolesDisponibles.length === 1 ? contexto.rolesDisponibles[0] : null,
    });
  },

  restaurarSesion: async () => {
    try {
      await get().sincronizarContexto();
    } catch {
      set({ autenticado: false, modo: null, usuario: null, rolActivo: null });
    } finally {
      set({ restaurando: false });
    }
  },

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


  /**
   * Se llama al terminar de tomar las fotos del documento.
   *
   * **No marca la cuenta como verificada**, porque nadie la ha verificado: las
   * fotos no se suben y no hay quien las revise todavia. Antes lo hacia, y la
   * app mostraba a esa persona como verificada mientras la base decia que no.
   * Quien la verifica es la administracion, con `verificar_perfil`.
   */
  completarVerificacion: () => set((state) => state),

  /**
   * Limpia el estado local. No cierra la sesion en Supabase: para eso esta
   * `cerrarSesion`. Separarlas rompe el bucle descrito abajo.
   */
  limpiarSesion: () => {
    set({
      usuario: null,
      usuarioId: null,
      modo: null,
      rolActivo: null,
      autenticado: false,
      turnoTerminado: false,
      rolesDisponibles: [],
      // Que no se quede el rol de plataforma puesto al salir: el siguiente que
      // entre en este dispositivo no lo opera.
      rolPlataforma: null,
      condominios: [],
      unidades: [],
    });
  },

  /**
   * Cierra la sesion de verdad.
   *
   * `signOut` dispara `onAuthStateChange('SIGNED_OUT')`, que el navegador
   * atiende llamando a `limpiarSesion`. Cuando ambas cosas vivian en la misma
   * funcion, ese manejador volvia a llamar a `signOut`, que disparaba el
   * evento otra vez: React acababa con "Maximum update depth exceeded" y la
   * pantalla quedaba congelada en el login.
   */
  cerrarSesion: () => {
    void cerrarSesionSupabase().catch(() => undefined);
    useAuthStore.getState().limpiarSesion();
  },

  cerrarBienvenida: () => set({ mostrarBienvenida: false }),
  terminarTurno: () => set({ turnoTerminado: true }),
  /**
   * Al elegir rol, la vivienda activa pasa a ser una de ese rol.
   *
   * Sin esto, quien es inquilina de una vivienda y huesped de otra entraba
   * como huesped y la app le mostraba la primera de la lista: "Mi alojamiento"
   * presentaba la vivienda equivocada y anunciaba que su guestbook estaba
   * vacio, cuando el libro estaba cargado en la otra.
   */
  setRolActivo: (rol) => {
    set({ rolActivo: rol });

    const ubicaciones = useUbicacionStore.getState().ubicaciones;
    /*
      Si la activa ya es de ese rol, se queda: es la que la persona eligio.
      Antes se saltaba siempre a la primera de ese rol, asi que cambiar de rol
      y volver deshacia la eleccion.
    */
    if (ubicaciones.some((u) => u.favorito && u.rol === rol)) return;
    const deEseRol = ubicaciones.find((u) => u.rol === rol);
    if (!deEseRol) return;

    useUbicacionStore.getState().setUbicaciones(
      ubicaciones.map((u) => ({ ...u, favorito: u.id === deEseRol.id })),
    );
  },
}));
