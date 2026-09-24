// Se importa por el alias `@/`, como el resto del codigo, y no con ruta
// relativa: las pruebas de recorrido sustituyen ese modulo por un cliente
// sin React Native, y un `./supabase` se les escapa.
import { supabase } from "@/shared/services/supabase";
import type { RolActivo, Ubicacion, Usuario } from "@/shared/types";
import type { Database } from "@/shared/types/database.types";

type RolCondominioDB = Database["public"]["Enums"]["rol_condominio"];
type RolUnidadDB = Database["public"]["Enums"]["rol_unidad"];

export interface MembresiaCondominio {
  condominioId: string;
  condominioNombre: string;
  rol: RolCondominioDB;
  porteriaId: string | null;
  /**
   * Permisos granulares de esta membresia.
   *
   * Para la porteria son `chat` y `llamadas`, que el administrador enciende o
   * apaga desde su pantalla de Seguridad. El KT lo dice sin rodeos: el guardia
   * tiene «chat/llamadas **si el Administrador se lo habilita**».
   *
   * No se cargaban. La consulta de sesion pedia `rol` y `porteria_id` y nada
   * mas, asi que la aplicacion no tenia forma de saberlo y el boton flotante de
   * comunicaciones se le ofrecia a todo el mundo: los dos interruptores del
   * administrador eran decoracion.
   */
  permisos: Record<string, unknown>;
}

export interface MembresiaUnidad {
  membresiaId: string;
  /**
   * Primer dia de la estancia; solo lo usa el huesped temporal. Si es futuro,
   * la persona ya tiene acceso al alojamiento pero **todavia no a las
   * credenciales de entrada**: la base se lo niega y la pantalla lo explica.
   */
  vigenteDesde: string | null;
  /** Ultimo dia de la estancia; solo lo usa el huesped temporal. */
  vigenteHasta: string | null;
  unidadId: string;
  codigo: string;
  torreNumero: number;
  condominioId: string;
  condominioNombre: string;
  rol: RolUnidadDB;
  esAnfitrionPrimario: boolean;
  esAdminPrimario: boolean;
  esResidente: boolean;
}

export interface ContextoUsuario {
  /** Id en auth.users. Es la identidad del usuario en todo el sistema. */
  usuarioId: string;
  usuario: Usuario;
  condominios: MembresiaCondominio[];
  unidades: MembresiaUnidad[];
  rolesDisponibles: RolActivo[];
  ubicaciones: Ubicacion[];
}

/**
 * Traducción entre los roles de la base y los `RolActivo` de la app.
 *
 * Este es el ÚNICO lugar donde conviven los dos vocabularios. Las dudas de
 * producto abiertas (D-01, D-02, D-09 en docs/RIESGOS-Y-DUDAS.md) se resuelven
 * aquí y en ningún otro sitio: cuando el cliente cierre el modelo de roles,
 * este archivo es el que cambia.
 */

const ROL_CONDOMINIO_A_ACTIVO: Record<RolCondominioDB, RolActivo> = {
  administrador: "administrador",
  // D-02 sin cerrar: el coadministrador de condominio opera como administrador
  // con permisos recortados. Los permisos granulares viajan en
  // `membresia_condominio.permisos`.
  coadministrador: "administrador",
  guardia: "guardia",
};

const ROL_UNIDAD_A_ACTIVO: Record<RolUnidadDB, RolActivo> = {
  propietario: "propietario",
  inquilino_lider: "inquilino-lider",
  // El huesped temporal no existia como rol de la base: la app tenia toda su
  // navegacion pero ninguna membresia lo producia, asi que solo se podia
  // entrar con el en modo demo.
  huesped_temporal: "huesped-temporal",
  // D-01 sin cerrar: hoy un residente con cuenta entra con la misma vista que
  // el inquilino líder. `membresia_unidad.puede_acceder` ya decide si llega a
  // tener cuenta; esto solo decide qué ve si la tiene.
  residente: "inquilino-lider",
  corresidente: "inquilino-lider",
  coadministrador: "inquilino-lider",
};

/** El propietario que declaró no vivir en su unidad tiene una vista distinta. */
function refinarRolPropietario(m: MembresiaUnidad): RolActivo {
  if (m.rol !== "propietario") return ROL_UNIDAD_A_ACTIVO[m.rol];
  return m.esResidente ? "propietario" : "propietario-no-residente";
}

export async function cargarContextoUsuario(): Promise<ContextoUsuario | null> {
  const { data: sesion } = await supabase.auth.getSession();
  const user = sesion.session?.user;
  if (!user) return null;

  const [perfilRes, condominiosRes, unidadesRes] = await Promise.all([
    supabase
      .from("perfil")
      .select("nombre, apellido, telefono, tipo_documento, identificacion, verificado, alias")
      .eq("id", user.id)
      .maybeSingle(),

    supabase
      .from("membresia_condominio")
      .select("rol, porteria_id, permisos, condominio:condominio_id (id, nombre)")
      .eq("usuario_id", user.id)
      .eq("activo", true),

    supabase
      .from("membresia_unidad")
      .select(
        "id, rol, es_anfitrion_primario, es_admin_primario, es_residente," +
          " vigente_desde, vigente_hasta," +
          " unidad:unidad_id (id, codigo, condominio_id, torre:torre_id (numero), condominio:condominio_id (nombre))",
      )
      .eq("usuario_id", user.id)
      .eq("activo", true),
  ]);

  if (perfilRes.error) throw perfilRes.error;
  if (condominiosRes.error) throw condominiosRes.error;
  if (unidadesRes.error) throw unidadesRes.error;

  const perfil = perfilRes.data;

  const usuario: Usuario = {
    nombre: perfil?.nombre ?? "",
    apellido: perfil?.apellido ?? "",
    correo: user.email ?? "",
    telefono: perfil?.telefono ?? undefined,
    tipoDocumento: perfil?.tipo_documento ?? "",
    identificacion: perfil?.identificacion ?? undefined,
    verificado: perfil?.verificado ?? false,
    alias: perfil?.alias ?? undefined,
  };

  const condominios: MembresiaCondominio[] = (condominiosRes.data ?? []).map(
    (fila: any) => ({
      condominioId: fila.condominio?.id ?? "",
      condominioNombre: fila.condominio?.nombre ?? "",
      rol: fila.rol,
      porteriaId: fila.porteria_id ?? null,
      permisos: (fila.permisos ?? {}) as Record<string, unknown>,
    }),
  );

  const hoy = new Date().toISOString().slice(0, 10);

  const unidades: MembresiaUnidad[] = (unidadesRes.data ?? [])
    // Solo se descarta la estancia **terminada**, aunque la membresia siga
    // activa. La que aun no ha empezado si entra: desde que se acepta la
    // invitacion se ve el alojamiento —direccion, edificio, zonas comunes,
    // chat con la porteria— y es justo cuando mas se mira. Lo unico que
    // espera al dia de entrada son las credenciales de acceso, y de eso se
    // encarga la base.
    .filter((fila: any) => !fila.vigente_hasta || fila.vigente_hasta >= hoy)
    .map((fila: any) => ({
    membresiaId: fila.id,
    vigenteDesde: fila.vigente_desde ?? null,
    vigenteHasta: fila.vigente_hasta ?? null,
    unidadId: fila.unidad?.id ?? "",
    codigo: fila.unidad?.codigo ?? "",
    torreNumero: fila.unidad?.torre?.numero ?? 0,
    condominioId: fila.unidad?.condominio_id ?? "",
    condominioNombre: fila.unidad?.condominio?.nombre ?? "",
    rol: fila.rol,
    esAnfitrionPrimario: fila.es_anfitrion_primario,
    esAdminPrimario: fila.es_admin_primario,
    esResidente: fila.es_residente,
  }));

  // Un mismo usuario puede tener varios roles (p. ej. administrador del
  // edificio y propietario de una unidad). La app elige uno activo.
  const roles = new Set<RolActivo>();
  condominios.forEach((c) => roles.add(ROL_CONDOMINIO_A_ACTIVO[c.rol]));
  unidades.forEach((m) => roles.add(refinarRolPropietario(m)));

  // Un propietario sin ninguna unidad tiene una vista propia.
  if (roles.size === 0) roles.add("propietario-sin-propiedades");

  const ubicaciones: Ubicacion[] = unidades.map((m, i) => ({
    id: i + 1,
    direccion: m.condominioNombre,
    alias: `Torre ${m.torreNumero} · ${m.codigo}`,
    favorito: i === 0,
    torreNumero: m.torreNumero,
    codigo: m.codigo,
    imagen: null,
    // Cuando empieza la estancia, para que "Mi alojamiento" pueda decir que
    // las instrucciones de entrada llegan ese dia en vez de parecer vacio.
    vigenteDesde: m.vigenteDesde,
    // Con que rol se opera esta vivienda. Sin esto, alguien que es inquilina
    // de una y huesped de otra entraba como huesped y veia la primera: "Mi
    // alojamiento" mostraba la vivienda equivocada y su guestbook vacio.
    rol: refinarRolPropietario(m),
  }));

  return {
    usuarioId: user.id,
    usuario,
    condominios,
    unidades,
    rolesDisponibles: [...roles],
    ubicaciones,
  };
}

export async function iniciarSesionConCorreo(correo: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: correo.trim().toLowerCase(),
    password,
  });
  if (error) throw error;
  return data;
}

export async function registrarConCorreo(params: {
  correo: string;
  password: string;
  nombre: string;
  apellido: string;
}) {
  const { data, error } = await supabase.auth.signUp({
    email: params.correo.trim().toLowerCase(),
    password: params.password,
  });
  if (error) throw error;

  // El perfil se crea con el id de auth: la identidad es auth.users.id, nunca
  // el correo (regla 3 de AGENTS.md).
  if (data.user) {
    const { error: errorPerfil } = await supabase.from("perfil").insert({
      id: data.user.id,
      nombre: params.nombre,
      apellido: params.apellido,
    });
    if (errorPerfil) throw errorPerfil;
  }
  return data;
}

export async function solicitarRecuperacion(correo: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(
    correo.trim().toLowerCase(),
  );
  if (error) throw error;
  return { correo };
}

export async function cerrarSesionSupabase() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
