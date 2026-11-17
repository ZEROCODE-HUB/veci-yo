import type { Database } from "@/shared/types/database.types";
import type { RolActivo } from "@/shared/types";

type RolConPermisos = Database["public"]["Enums"]["rol_con_permisos"];
type AccionDeRol = Database["public"]["Enums"]["accion_de_rol"];
type RolUnidad = Database["public"]["Enums"]["rol_unidad"];

/**
 * Qué puede y qué no cada rol que se da de alta en una vivienda (17/11/2026,
 * aprobado por el cliente): el resumen «Podrá / No podrá» del formulario de
 * invitar sale de aquí, y la navegación del trabajador permanente también
 * (`veLasPantallasDeLaVivienda`). Una sola lista: si el resumen y lo que la
 * app enseña salieran de sitios distintos, se separarían en silencio.
 *
 * Hay dos clases de capacidad:
 *
 *   · las tres que se configuran por rol desde el panel de la plataforma
 *     (`permiso_de_rol`: registrar visitas, reservar zonas, invitar). Esas no
 *     se escriben aquí: llegan de la base con la misma regla que aplica al
 *     guardar (`permisos_de_los_roles_de_la_vivienda` → `rol_puede`);
 *   · las fijas de cada rol, que dependen de qué es: un residente ve la
 *     correspondencia de su vivienda; un trabajador permanente no es miembro
 *     de la vivienda, así que la base no le deja ver nada de ella y solo le
 *     suena el intercomunicador (`trabajador_de_la_vivienda`,
 *     `le_suena_la_llamada`).
 */

/** Los roles que se pueden crear en una vivienda, con el trabajador en sus dos formas. */
export type RolQueSeCrea =
  | Extract<RolUnidad, "propietario" | "inquilino_lider" | "residente" | "coadministrador">
  | "trabajador_con_app"
  | "trabajador_sin_app";

export type AccionConfigurable = Extract<
  AccionDeRol,
  "registrar_visitas" | "reservar_zonas" | "invitar_a_la_vivienda"
>;

type CapacidadFija =
  | "entrar_a_la_app"
  | "contestar_intercomunicador"
  | "figurar_en_el_directorio"
  | "ver_visitas"
  | "ver_correspondencia"
  | "ver_zonas_comunes"
  | "ver_anuncios"
  | "cuadro_de_honor"
  | "configurar_renta_corta";

type Capacidad = CapacidadFija | AccionConfigurable;

/** Cómo se dice cada capacidad, en el orden en que se enseña. */
const TEXTO: { clave: Capacidad; texto: string }[] = [
  { clave: "entrar_a_la_app", texto: "Entrar a la app con su cuenta" },
  { clave: "contestar_intercomunicador", texto: "Contestar el intercomunicador y autorizar la visita que anuncia la portería" },
  { clave: "figurar_en_el_directorio", texto: "Figurar en el directorio de la vivienda, para que la portería lo llame" },
  { clave: "ver_visitas", texto: "Ver las visitas de la vivienda" },
  { clave: "registrar_visitas", texto: "Registrar visitas" },
  { clave: "ver_correspondencia", texto: "Ver la correspondencia" },
  { clave: "ver_zonas_comunes", texto: "Ver las zonas comunes" },
  { clave: "reservar_zonas", texto: "Reservar zonas comunes" },
  { clave: "ver_anuncios", texto: "Ver los anuncios de la administración" },
  { clave: "cuadro_de_honor", texto: "Participar en el Cuadro de Honor" },
  { clave: "invitar_a_la_vivienda", texto: "Invitar a otras personas a la vivienda" },
  { clave: "configurar_renta_corta", texto: "Configurar la renta corta" },
];

const VECINO: Record<CapacidadFija, boolean> = {
  entrar_a_la_app: true,
  contestar_intercomunicador: true,
  figurar_en_el_directorio: true,
  ver_visitas: true,
  ver_correspondencia: true,
  ver_zonas_comunes: true,
  ver_anuncios: true,
  cuadro_de_honor: true,
  configurar_renta_corta: false,
};

const NADA: Record<CapacidadFija, boolean> = {
  entrar_a_la_app: false,
  contestar_intercomunicador: false,
  figurar_en_el_directorio: true,
  ver_visitas: false,
  ver_correspondencia: false,
  ver_zonas_comunes: false,
  ver_anuncios: false,
  cuadro_de_honor: false,
  configurar_renta_corta: false,
};

/**
 * Lo fijo de cada rol. `configurar_renta_corta` es lo que deja
 * `puede_configurar_alojamiento` (propietario, inquilino líder y anfitrión).
 */
export const CAPACIDADES_FIJAS: Record<RolQueSeCrea, Record<CapacidadFija, boolean>> = {
  propietario: { ...VECINO, configurar_renta_corta: true },
  inquilino_lider: { ...VECINO, configurar_renta_corta: true },
  residente: VECINO,
  coadministrador: { ...VECINO, configurar_renta_corta: true },
  trabajador_con_app: { ...NADA, entrar_a_la_app: true, contestar_intercomunicador: true },
  trabajador_sin_app: NADA,
};

/** El rol de la regla configurable que corresponde a cada uno. */
const ROL_CONFIGURABLE: Partial<Record<RolQueSeCrea, RolConPermisos>> = {
  inquilino_lider: "inquilino_lider",
  residente: "residente",
  coadministrador: "coadministrador_vivienda",
};

/** Lo que llega de `permisos_de_los_roles_de_la_vivienda`. */
export type PermisosConfigurables = Partial<
  Record<RolConPermisos, Partial<Record<AccionConfigurable, boolean>>>
>;

function puedeLaConfigurable(
  rol: RolQueSeCrea,
  accion: AccionConfigurable,
  configurables: PermisosConfigurables | undefined,
): boolean | null {
  // El propietario siempre puede (`puedo_en_la_vivienda`).
  if (rol === "propietario") return true;
  // El trabajador no es miembro: la base no le deja nada de esto, sin regla que lo cambie.
  if (rol === "trabajador_con_app" || rol === "trabajador_sin_app") return false;
  const deLaBase = configurables?.[ROL_CONFIGURABLE[rol] as RolConPermisos]?.[accion];
  // Mientras no se sabe, no se afirma nada: se omite.
  return deLaBase ?? null;
}

const CONFIGURABLES: AccionConfigurable[] = ["registrar_visitas", "reservar_zonas", "invitar_a_la_vivienda"];

export interface ResumenDelRol {
  podra: string[];
  noPodra: string[];
}

/**
 * «Podrá: … / No podrá: …» de un rol. Sin los permisos configurables todavía
 * (cargando), esas tres líneas no salen en ninguna de las dos listas.
 */
export function resumenDelRol(
  rol: RolQueSeCrea,
  configurables?: PermisosConfigurables,
): ResumenDelRol {
  const fijas = CAPACIDADES_FIJAS[rol];
  const podra: string[] = [];
  const noPodra: string[] = [];
  for (const { clave, texto } of TEXTO) {
    const valor = (CONFIGURABLES as string[]).includes(clave)
      ? puedeLaConfigurable(rol, clave as AccionConfigurable, configurables)
      : fijas[clave as CapacidadFija];
    if (valor === null) continue;
    // El directorio solo se dice del trabajador: a un vecino no le aporta nada.
    if (clave === "figurar_en_el_directorio" && !rol.startsWith("trabajador")) continue;
    (valor ? podra : noPodra).push(texto);
  }
  return { podra, noPodra };
}

/** Las filas de la base, en el mapa que entiende `resumenDelRol`. */
export function permisosConfigurablesDe(
  filas: { rol: RolConPermisos; accion: AccionDeRol; permitido: boolean }[],
): PermisosConfigurables {
  const mapa: PermisosConfigurables = {};
  for (const f of filas) {
    if (!(CONFIGURABLES as string[]).includes(f.accion)) continue;
    mapa[f.rol] = { ...(mapa[f.rol] ?? {}), [f.accion]: f.permitido };
  }
  return mapa;
}

/** El rol del desplegable de invitar, en la forma de esta lista. */
export function rolQueSeCreaDe(rol: RolUnidad): RolQueSeCrea | null {
  if (rol === "corresidente") return "residente";
  if (rol === "huesped_temporal") return null;
  return rol;
}

/**
 * Si un rol de la app tiene pantallas de vivienda (Inicio y Viviendas). El
 * trabajador permanente no: no ve visitas, correspondencia, zonas comunes,
 * anuncios ni cuadro de honor, así que solo le queda Perfil, y el
 * intercomunicador, que suena encima de todo.
 */
export function veLasPantallasDeLaVivienda(rol: RolActivo): boolean {
  if (rol !== "trabajador") return true;
  const f = CAPACIDADES_FIJAS.trabajador_con_app;
  return f.ver_visitas || f.ver_correspondencia || f.ver_zonas_comunes || f.ver_anuncios || f.cuadro_de_honor;
}
