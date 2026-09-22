import { supabase } from "./supabase";
import type { RolActivo, Ubicacion, Usuario } from "@/shared/types";
import type { Database } from "@/shared/types/database.types";

type RolCondominioDB = Database["public"]["Enums"]["rol_condominio"];
type RolUnidadDB = Database["public"]["Enums"]["rol_unidad"];

export interface MembresiaCondominio {
  condominioId: string;
  condominioNombre: string;
  rol: RolCondominioDB;
  porteriaId: string | null;
}

export interface MembresiaUnidad {
  membresiaId: string;
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
      .select("rol, porteria_id, condominio:condominio_id (id, nombre)")
      .eq("usuario_id", user.id)
      .eq("activo", true),

    supabase
      .from("membresia_unidad")
      .select(
        "id, rol, es_anfitrion_primario, es_admin_primario, es_residente," +
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
    }),
  );

  const unidades: MembresiaUnidad[] = (unidadesRes.data ?? []).map((fila: any) => ({
    membresiaId: fila.id,
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
  }));

  return {
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
