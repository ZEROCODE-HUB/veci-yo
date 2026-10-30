import { leerRolRecordado, recordarRol } from "@/shared/services/rolRecordado";
import { create } from 'zustand';
import { Usuario, ModoAuth, RolActivo } from '@/shared/types';
import { useUbicacionStore } from './ubicacion-store';
import {
  cargarContextoUsuario,
  cerrarSesionSupabase,
  esCuentaBloqueada,
  leerMiSuspension,
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
  /** Devuelve si la sesión quedó abierta; si no, falta confirmar el correo. */
  registrarReal: (p: {
    correo: string;
    password: string;
    nombre: string;
    apellido: string;
    telefono?: string;
    codigoPais?: string;
    tipoDocumento?: string;
    identificacion?: string;
    volverA?: string;
  }) => Promise<boolean>;
  /** Carga perfil, membresias y ubicaciones del usuario autenticado. */
  sincronizarContexto: () => Promise<void>;
  /**
   * Vuelve a leer membresías y viviendas sin cambiar el rol elegido. Para
   * cuando algo de la sesión cambia estando dentro: declararse residente o
   * no cambiaba el menú solo al volver a entrar (QA 23/10/2026).
   */
  refrescarContexto: () => Promise<void>;
  restaurarSesion: () => Promise<void>;
  /**
   * La cuenta está suspendida desde el panel (24/10/2026). `motivo` solo se
   * conoce si había sesión abierta; al intentar entrar, Supabase no deja leerlo.
   */
  suspension: { motivo: string | null } | null;
  /** Cierra la pantalla de cuenta suspendida y la sesión que quedara. */
  cerrarAvisoDeSuspension: () => Promise<void>;

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
  suspension: null,

  iniciarSesionReal: async (correo, password) => {
    try {
      await iniciarSesionConCorreo(correo, password);
    } catch (error) {
      // Suspendida desde el panel: en vez de un error suelto, su pantalla.
      if (esCuentaBloqueada(error)) {
        set({ suspension: { motivo: null } });
        return;
      }
      throw error;
    }
    await get().sincronizarContexto();
  },

  registrarReal: async (datos) => {
    const { sesionAbierta } = await registrarConCorreo(datos);
    if (!sesionAbierta) return false;
    await get().sincronizarContexto();
    set({ mostrarBienvenida: true });
    return true;
  },

  sincronizarContexto: async () => {
    const contexto = await cargarContextoUsuario();
    if (!contexto) {
      set({ autenticado: false, modo: null, usuario: null, rolActivo: null });
      return;
    }
    // Con la sesión todavía abierta, la suspensión se lee con su motivo.
    const suspendida = await leerMiSuspension();
    if (suspendida) {
      set({ suspension: { motivo: suspendida.motivo } });
      return;
    }
    useUbicacionStore.getState().setUbicaciones(contexto.ubicaciones);
    /*
      Se entra directo con el último rol que usó, o con el primero que tenga
      (Para Claude 174, 30/10/2026): ya no se pregunta al entrar. Se cambia
      desde la barra de arriba.
    */
    const recordado = contexto.usuarioId ? await leerRolRecordado(contexto.usuarioId) : null;
    const rolDeEntrada =
      recordado && contexto.rolesDisponibles.includes(recordado)
        ? recordado
        : (contexto.rolesDisponibles[0] ?? null);
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
      rolActivo: rolDeEntrada,
    });
    // Que la vivienda activa sea una de ese rol, como al elegirlo a mano.
    if (rolDeEntrada) get().setRolActivo(rolDeEntrada);
  },

  refrescarContexto: async () => {
    const contexto = await cargarContextoUsuario();
    if (!contexto) return;
    useUbicacionStore.getState().setUbicaciones(contexto.ubicaciones);
    const rolActual = get().rolActivo;
    set({
      usuario: contexto.usuario,
      rolesDisponibles: contexto.rolesDisponibles,
      estanciaTerminada: contexto.estanciaTerminada,
      condominios: contexto.condominios,
      unidades: contexto.unidades,
      // El rol elegido se queda mientras siga siendo posible.
      rolActivo:
        rolActual && contexto.rolesDisponibles.includes(rolActual)
          ? rolActual
          : (contexto.rolesDisponibles[0] ?? rolActual),
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

  cerrarAvisoDeSuspension: async () => {
    set({ suspension: null });
    await cerrarSesionSupabase().catch(() => undefined);
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
    const usuarioId = get().usuarioId;
    if (usuarioId && rol) void recordarRol(usuarioId, rol);

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
