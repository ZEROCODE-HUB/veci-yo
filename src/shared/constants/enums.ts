import type { Database } from "@/shared/types/database.types";

/**
 * Etiquetas de los enums de la base.
 *
 * Existe porque varias pantallas tenían su propia lista y se desincronizaban:
 * el selector de tipo de documento ofrecía `['Cédula', 'Pasaporte', 'DNI']`
 * mientras la base aceptaba seis valores, así que un extranjero con carné o
 * con PEP no podía registrarse, y "Cédula" era ambiguo entre la de ciudadanía
 * y la de extranjería.
 *
 * Cada diccionario es un `Record<EnumDeLaBase, string>`: si alguien agrega un
 * valor al enum y regenera los tipos, el `typecheck` falla hasta que aquí haya
 * una etiqueta. Ese es el punto de este archivo — no ahorrar líneas, sino que
 * el desfase no pueda pasar inadvertido.
 */

type Enums = Database["public"]["Enums"];

export const TIPO_DOCUMENTO: Record<Enums["tipo_documento"], string> = {
  cedula_ciudadania: "Cédula de ciudadanía",
  cedula_extranjeria: "Cédula de extranjería",
  dni: "DNI",
  carne_extranjeria: "Carné de extranjería",
  ppt: "PPT (Permiso por Protección Temporal)",
  pep: "PEP (ya no vigente)",
  pasaporte: "Pasaporte",
  /*
    Los dos de un menor en Colombia. Faltaban: al decidir el 09/10/2026 que a
    un menor también se le pide documento --el ministerio lo exige por cada
    persona-- la lista no tenía ninguno que le sirviera, así que obligaba a
    marcar uno falso. Registro civil hasta los siete; tarjeta de identidad de
    los siete a los diecisiete.
  */
  registro_civil: "Registro civil de nacimiento",
  tarjeta_identidad: "Tarjeta de identidad",
};

/**
 * Los que se le **ofrecen** a quien se registra.
 *
 * No es lo mismo que `TIPO_DOCUMENTO`: ese traduce lo que hay guardado —y
 * tiene que seguir sabiendo leer un `pep` viejo— mientras esto es la lista que
 * se elige.
 *
 * El **PEP queda fuera**. Lo dice la documentación de Migración Colombia a
 * través de tusdatos: *«dejó de tener validez a partir del mes de marzo de
 * 2023, de acuerdo al Artículo 38 de la Resolución 0971 de 2021»*. Ofrecer un
 * documento que ya no identifica a nadie termina en una persona rechazada en la
 * puerta y en un reporte al ministerio con un documento inválido.
 *
 * Lo que esa gente lleva hoy es el **PPT**, que hasta el 06/10/2026 no estaba
 * en la lista: no se podían registrar. Ese es el defecto de verdad; sacar el
 * PEP es la otra mitad.
 *
 * El valor **no se borra del enum**: hay que poder leer lo ya guardado. Hoy no
 * lo usa ninguna fila —comprobado contando— así que no hay dato que arreglar.
 */
export const TIPO_DOCUMENTO_OFRECIDOS: Record<string, string> = Object.fromEntries(
  Object.entries(TIPO_DOCUMENTO).filter(([clave]) => clave !== "pep"),
);

/**
 * En que punto esta una vivienda.
 *
 * El selector del formulario de unidad llevaba su propia lista con
 * `config-pendiente` y `config-completado` **con guion medio**, y el enum de la
 * base los tiene con guion bajo. Al guardar iba con `as any`, asi que elegir
 * uno de esos dos estados hacia que Postgres rechazara la actualizacion --y el
 * administrador no tenia forma de saber por que--.
 */
export const ESTADO_UNIDAD: Record<Enums["estado_unidad"], string> = {
  disponible: "Disponible",
  invitado: "Invitado",
  aceptado: "Aceptado",
  config_pendiente: "Configuración pendiente",
  config_completado: "Configuración completada",
};

export const TIPO_VEHICULO: Record<Enums["tipo_vehiculo"], string> = {
  auto: "Automóvil",
  camioneta: "Camioneta",
  moto: "Moto",
  bus: "Bus",
  van: "Van",
};

export const CATEGORIA_CORRESPONDENCIA: Record<
  Enums["categoria_correspondencia"],
  string
> = {
  delivery: "Delivery",
  sobres: "Sobres",
  paqueteria: "Paquetería",
};

export const ESTADO_ENCOMIENDA: Record<Enums["estado_encomienda"], string> = {
  buen_estado: "Buen estado",
  estado_intermedio: "Estado intermedio",
  mal_estado: "Mal estado",
};

/** Las etiquetas, para alimentar un `Select`. */
export const etiquetasDe = (diccionario: Record<string, string>) =>
  Object.values(diccionario);

/**
 * La clave del enum a partir de la etiqueta elegida.
 *
 * Devuelve `null` si no coincide ninguna, en vez de inventar un valor: un enum
 * inexistente lo rechazaría la base con un error poco claro.
 */
export function claveDeEtiqueta<T extends string>(
  diccionario: Record<T, string>,
  etiqueta: string,
): T | null {
  const par = Object.entries(diccionario).find(([, valor]) => valor === etiqueta);
  return par ? (par[0] as T) : null;
}

/**
 * Qué clase de acceso es una portería.
 *
 * El enum tiene dos valores desde la primera migración y la pantalla creaba
 * **todas** con `entrada_principal`, escrito a fuego: `acceso_vehicular` no
 * aparecía en ningún sitio de la aplicación. Un edificio con garaje no podía
 * registrar su acceso vehicular, que es justo donde más falta hace distinguir
 * una portería de otra --el guardia de la barrera no hace lo mismo que el de
 * la puerta--.
 */
export const TIPO_PORTERIA: Record<Enums["tipo_porteria"], string> = {
  entrada_principal: "Entrada peatonal",
  acceso_vehicular: "Acceso vehicular",
};

/**
 * Que es el responsable de un menor.
 *
 * Padre y madre no necesitan papel --su vinculo no se acredita con un permiso
 * de viaje-- y los otros dos si. Lo pidio el cliente el 02/10/2026.
 */
export const PARENTESCO: Record<string, string> = {
  padre: "Su padre",
  madre: "Su madre",
  tutor_legal: "Su tutor legal",
  otro: "Otra persona",
};
