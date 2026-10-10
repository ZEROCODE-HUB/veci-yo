// Se importa por el alias `@/`, como el resto del codigo, y no con ruta
// relativa: las pruebas de recorrido sustituyen ese modulo por un cliente
// sin React Native, y un `./supabase` se les escapa.
import { supabase } from "@/shared/services/supabase";
import type { RolActivo, Ubicacion, Usuario } from "@/shared/types";
import type { Database } from "@/shared/types/database.types";
import { soloEstanciasTerminadas } from "./estanciaTerminada";
import { ordenarPorPreferencia } from "./viviendaPorDefecto";

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
  /** Como llama esta persona a esta vivienda, si le puso un nombre. */
  apodo: string | null;
  /** Cuando la eligio como activa, o `null`. La mas reciente es por la que entra. */
  elegidaEn: string | null;
  /** Cuando se dio de alta en ella. Desempata siempre igual. */
  creadaEn: string;
}

export interface ContextoUsuario {
  /** Id en auth.users. Es la identidad del usuario en todo el sistema. */
  usuarioId: string;
  usuario: Usuario;
  condominios: MembresiaCondominio[];
  unidades: MembresiaUnidad[];
  rolesDisponibles: RolActivo[];
  ubicaciones: Ubicacion[];
  /**
   * Tenia vivienda y su estancia ya termino.
   *
   * Sin esto, un huesped cuya estadia acabo se queda sin roles y la aplicacion
   * cae en `propietario-sin-propiedades`, que es la vista de **un dueño que
   * todavia no ha registrado su piso**: menu completo de residente y un boton
   * de «Agregar propiedad». O sea que a alguien que se alojo tres noches en un
   * edificio ajeno se le ofrece dar de alta una propiedad ahi.
   *
   * No es un agujero --la base no le deja ver nada-- pero le miente sobre lo
   * que le pasa y le ofrece lo que no le corresponde.
   */
  estanciaTerminada: boolean;
  /**
   * Si esta persona opera la plataforma, y con qué alcance.
   *
   * `null` para todo el mundo salvo un puñado de cuentas. No es una membresía
   * de condominio: no cuelga de ninguno, por eso no está en `condominios`.
   *
   * Los dos valores comparten el panel; `dueno` además da de alta edificios y
   * reparte este mismo rol. La base lo vuelve a comprobar en cada función, así
   * que esto solo decide qué botones se pintan.
   */
  rolPlataforma: RolPlataforma | null;
}

/** Los dos alcances del rol de plataforma, tal como están en la base. */
export type RolPlataforma = Database["public"]["Enums"]["rol_plataforma"];

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

/**
 * Crea el perfil de quien entró por un proveedor externo, si no lo tiene.
 *
 * El perfil **lo inserta la aplicación**, no un disparador de la base --eso ya
 * se comprobó una vez y costó que dos cuentas sembradas vivieran sin nombre--.
 * Y lo insertaba solo `registrarConCorreo`: quien entra con Google **no pasa
 * por ahí**, así que se quedaba sin fila de perfil y la aplicación lo saludaba
 * con «Hola, ».
 *
 * El nombre sale de lo que manda Google. Si no manda nada, se queda vacío y la
 * persona lo pone en su perfil: inventarle un nombre a partir del correo es
 * peor que dejarlo en blanco.
 *
 * **Solo inserta.** Nunca actualiza: si la persona ya editó su nombre en
 * Veciyo, el de Google no manda. Un `upsert` lo pisaría en cada entrada.
 */
async function crearPerfilSiFalta(user: {
  id: string;
  user_metadata?: Record<string, unknown>;
}): Promise<void> {
  const meta = user.user_metadata ?? {};
  const completo = String(meta.full_name ?? meta.name ?? "").trim();
  const [nombre = "", ...resto] = completo.split(/\s+/);

  /*
    `ignoreDuplicates` y no un `select` previo: entre mirar y escribir caben
    dos pestañas abriendo sesión a la vez, y la segunda chocaría contra la
    clave primaria. Así el choque no es un error, es un no-hacer-nada.
  */
  const { error } = await supabase
    .from("perfil")
    .upsert(
      {
        id: user.id,
        nombre: nombre || String(meta.given_name ?? "").trim(),
        apellido: resto.join(" ") || String(meta.family_name ?? "").trim(),
      },
      { onConflict: "id", ignoreDuplicates: true },
    );

  // Si falla, no se tumba la sesión: la persona entra sin nombre, que es
  // molesto y recuperable, en vez de no entrar.
  if (error) console.warn("No se pudo crear el perfil inicial:", error.message);
}

export async function cargarContextoUsuario(): Promise<ContextoUsuario | null> {
  const { data: sesion } = await supabase.auth.getSession();
  const user = sesion.session?.user;
  if (!user) return null;

  /*
    Antes de pedir el perfil, no después: si entró con Google y es la primera
    vez, la fila no existe todavía y la consulta de abajo devolvería nada.
  */
  await crearPerfilSiFalta(user);

  const [perfilRes, condominiosRes, unidadesRes, plataformaRes] = await Promise.all([
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
        `id, rol, es_anfitrion_primario, es_admin_primario, es_residente,
         vigente_desde, vigente_hasta, apodo, elegida_en, created_at,
         unidad:unidad_id (
           id, codigo, condominio_id,
           torre:torre_id (numero),
           condominio:condominio_id (nombre)
         )`,
      )
      .eq("usuario_id", user.id)
      .eq("activo", true),

    /*
      Si opera la plataforma. `maybeSingle` porque hay una fila por persona como
      mucho --`usuario_id` es unico-- y lo normal es que no haya ninguna.

      La politica de `staff_plataforma` deja leer la fila propia, asi que esto
      no depende de tener ya el rol: cualquiera pregunta y casi todo el mundo
      recibe nada.
    */
    supabase
      .from("staff_plataforma")
      .select("rol")
      .eq("usuario_id", user.id)
      .eq("activo", true)
      .maybeSingle(),
  ]);

  if (perfilRes.error) throw perfilRes.error;
  if (condominiosRes.error) throw condominiosRes.error;
  if (unidadesRes.error) throw unidadesRes.error;
  if (plataformaRes.error) throw plataformaRes.error;

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
    (fila) => ({
      condominioId: fila.condominio?.id ?? "",
      condominioNombre: fila.condominio?.nombre ?? "",
      rol: fila.rol,
      porteriaId: fila.porteria_id ?? null,
      permisos: (fila.permisos ?? {}) as Record<string, unknown>,
    }),
  );

  const hoy = new Date().toISOString().slice(0, 10);

  const filasDeUnidad = unidadesRes.data ?? [];
  const unidadesSinOrden: MembresiaUnidad[] = filasDeUnidad
    // Solo se descarta la estancia **terminada**, aunque la membresia siga
    // activa. La que aun no ha empezado si entra: desde que se acepta la
    // invitacion se ve el alojamiento —direccion, edificio, zonas comunes,
    // chat con la porteria— y es justo cuando mas se mira. Lo unico que
    // espera al dia de entrada son las credenciales de acceso, y de eso se
    // encarga la base.
    .filter((fila) => !fila.vigente_hasta || fila.vigente_hasta >= hoy)
    .map((fila) => ({
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
    apodo: fila.apodo ?? null,
    elegidaEn: fila.elegida_en ?? null,
    creadaEn: fila.created_at,
  }));

  /*
    El orden decide por cual se entra: la primera es la activa. Venian en el
    orden en que Postgres las devolviera, o sea ninguno: quien vive en una
    vivienda y alquila otra entraba a veces en cada una. Ahora: la que eligio
    la ultima vez, si no la que habita, si no la mas antigua.
  */
  const unidades = ordenarPorPreferencia(unidadesSinOrden);

  // Un mismo usuario puede tener varios roles (p. ej. administrador del
  // edificio y propietario de una unidad). La app elige uno activo.
  const roles = new Set<RolActivo>();
  condominios.forEach((c) => roles.add(ROL_CONDOMINIO_A_ACTIVO[c.rol]));
  unidades.forEach((m) => roles.add(refinarRolPropietario(m)));

  /*
    Operar la plataforma es un rol mas, no un permiso que se suma a otro: se
    elige al entrar, como cualquiera. Quien ademas vive en un edificio tiene
    los dos y cambia entre ellos.

    Va **antes** del `if (roles.size === 0)` de abajo a proposito. Quien solo
    opera la plataforma no tiene ninguna vivienda, asi que sin esto caeria en
    `propietario-sin-propiedades` --la vista de un dueño que todavia no
    registro su piso, con su boton de «Agregar propiedad»-- y el panel no
    existiria.
  */
  const rolPlataforma = plataformaRes.data?.rol ?? null;
  if (rolPlataforma) roles.add("plataforma");

  /*
    Quien tenia estancia y se le acabo, frente a quien nunca tuvo nada. Las dos
    llegan aqui sin roles; la diferencia esta en el dato. La regla vive en
    `estanciaTerminada.ts` para poder probarla sin montar la aplicacion.
  */
  const estanciaTerminada =
    roles.size === 0 && soloEstanciasTerminadas(filasDeUnidad, hoy);

  // Un propietario sin ninguna unidad tiene una vista propia.
  if (roles.size === 0) roles.add("propietario-sin-propiedades");

  const ubicaciones: Ubicacion[] = unidades.map((m, i) => ({
    id: i + 1,
    direccion: m.condominioNombre,
    alias: `Torre ${m.torreNumero} · ${m.codigo}`,
    // Como llama esta persona a esta vivienda, si le puso un nombre.
    apodo: m.apodo ?? undefined,
    membresiaId: m.membresiaId,
    unidadId: m.unidadId,
    // La primera **por preferencia**, no la primera que llegara: ver arriba.
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
    estanciaTerminada,
    rolPlataforma,
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

/**
 * Entrar con Google.
 *
 * Abre la pantalla de Google, y al volver **no hay que hacer nada más**: el
 * `onAuthStateChange` de `RootNavigator` ya escucha `SIGNED_IN` y sincroniza el
 * contexto. Por eso esto no devuelve una sesión: cuando la promesa termina, la
 * página todavía está yendo a Google.
 *
 * ## Esta es la de web. La del teléfono es otra
 *
 * `redirectTo` es la dirección a la que Google devuelve a la persona, y en web
 * es la propia página. En el teléfono no hay página a la que volver: hace falta
 * la dirección propia de la aplicación y abrir el navegador a mano, y eso vive
 * en `features/onboarding/services/googleNativo.ts`.
 *
 * Quien elige entre las dos es `useLogin`. Aquí se comprueba igualmente, para
 * que llamar a esta por el camino equivocado **diga por qué** en vez de abrir
 * una pantalla de la que no se vuelve.
 */
export async function iniciarSesionConGoogle() {
  /*
    Se mira si hay `location` en vez de preguntarle a `Platform`, **a
    proposito**: importar `react-native` aqui mata las pruebas de recorrido,
    que corren en Node y no es una prueba roja sino un archivo con cero casos y
    un «Flow is not supported». Ya costo una vez con `reportes.repo`, y volvio
    a pasar al escribir esto: el archivo temporal que lo comprobaba no
    arrancaba.

    Y la pregunta que de verdad importa aqui no es «que sistema es» sino «hay
    una direccion a la que Google pueda devolver a esta persona», que es
    exactamente lo que `location` responde.
  */
  if (!globalThis.location?.origin) {
    throw new Error(
      "Entrar con Google funciona por ahora solo en la versión web. " +
        "En la aplicación del teléfono, usá tu correo y contraseña.",
    );
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      // De vuelta a donde estaba. La lista de direcciones permitidas vive en
      // Supabase: una que no esté en ella se rechaza y la persona acaba en la
      // portada sin sesión y sin explicación.
      redirectTo: globalThis.location?.origin,
    },
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
