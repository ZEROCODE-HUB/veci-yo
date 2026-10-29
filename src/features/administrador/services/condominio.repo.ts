import { supabase } from "@/shared/services/supabase";
import { paisPorDefecto, policiaDelPais } from "@/shared/constants";
import type { UbicacionFormValues } from "../types/ubicacion";

/**
 * Datos del condominio.
 *
 * `pais` se guarda en ISO 3166-1 alfa-2 (`CO`, `PE`) porque de ahi dependen
 * cosas del dominio: el tipo de documento que se pide, la etiqueta del
 * identificador fiscal y el formato de los reportes legales. El nombre
 * completo es solo presentacion.
 */

/*
  Aqui habia dos mapas --`PAISES` de codigo a nombre y `PAIS_DESDE_NOMBRE` al
  reves-- porque el campo «Pais» del formulario era **texto libre** y habia que
  adivinar que codigo guardar. El reverso tenia un atajo:

      PAIS_DESDE_NOMBRE[valores.pais] ?? valores.pais.slice(0, 2).toUpperCase()

  o sea que cualquier nombre que no estuviera en el mapa --los veinticinco
  restantes-- se guardaba como **sus dos primeras letras**: «Estados Unidos»
  quedaba en `ES`, que es España, y «Portugal» en `PO`, que no es ningun pais.
  Y de esta columna dependen el documento que se pide en la puerta, la etiqueta
  del identificador fiscal y el formato de los reportes al ministerio.

  Desde el 05/10/2026 el formulario manda el codigo ISO, elegido de una lista
  --`CampoPais`-- asi que no hay nada que adivinar ni dos listas que mantener:
  los nombres salen del catalogo de `@/shared/constants`.
*/

/** RUC en Peru, NIT en Colombia. */
export function etiquetaIdentificacionFiscal(pais: string): string {
  return pais === "PE" ? "RUC" : "NIT";
}

export async function obtenerCondominio(condominioId: string) {
  const { data, error } = await supabase
    .from("condominio")
    .select(
      "id, nombre, direccion, ciudad, pais, moneda, identificacion_fiscal, telefono, codigo_pais, email, telefono_policia, zona_horaria, horario_atencion",
    )
    .eq("id", condominioId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const valores: UbicacionFormValues = {
    nombre: data.nombre,
    direccion: data.direccion,
    ciudad: data.ciudad ?? "",
    // El codigo tal cual: el nombre lo pone el selector al pintarlo.
    pais: data.pais ?? "",
    ruc: data.identificacion_fiscal ?? "",
    telefono: data.telefono ?? "",
    /*
      Sin pais guardado se cae al del edificio, que es la suposicion razonable
      y mejor que dejarlo vacio: `condominio.codigo_pais` existe desde el
      principio y **nadie la escribia**, asi que todas las filas lo tienen en
      null y el numero que hay guardado no se puede marcar desde fuera.
    */
    codigoPais: data.codigo_pais ?? data.pais ?? paisPorDefecto(),
    email: data.email ?? "",
    // Sin numero propio, el del pais: es lo que la porteria marcaria igual.
    telefonoPolicia: data.telefono_policia ?? policiaDelPais(data.pais),
    moneda: data.moneda,
    // La base la pone al crear el edificio, según su país.
    zonaHoraria: data.zona_horaria ?? "",
    horarioAtencion: data.horario_atencion ?? "",
  };
  return { valores, paisIso: data.pais, moneda: data.moneda };
}

export async function actualizarCondominio(
  condominioId: string,
  valores: UbicacionFormValues,
) {
  const { error } = await supabase
    .from("condominio")
    .update({
      nombre: valores.nombre,
      direccion: valores.direccion,
      ciudad: valores.ciudad || null,
      pais: valores.pais,
      identificacion_fiscal: valores.ruc || null,
      telefono: valores.telefono || null,
      codigo_pais: valores.codigoPais || null,
      email: valores.email || null,
      telefono_policia: valores.telefonoPolicia.trim() || null,
      moneda: valores.moneda,
      zona_horaria: valores.zonaHoraria,
      horario_atencion: valores.horarioAtencion.trim() || null,
    })
    .eq("id", condominioId);
  if (error) throw error;
}

/**
 * El numero de la policia que marca la porteria de este edificio: el que puso
 * la administracion o, si no puso ninguno, el del pais (15/10/2026).
 */
export async function telefonoDePolicia(condominioId: string): Promise<string> {
  const { data, error } = await supabase
    .from("condominio")
    .select("pais, telefono_policia")
    .eq("id", condominioId)
    .maybeSingle();
  if (error) throw error;
  return data?.telefono_policia || policiaDelPais(data?.pais);
}

/**
 * Si la portería tiene que comparar el documento del invitado al entrar.
 *
 * Lo decide el edificio para todas sus visitas, por decisión del cliente del
 * 29/09/2026. Antes lo decidía el formulario por el tipo de visita --amigos
 * nunca, el resto siempre-- mientras a quien invitaba se le pedía el documento
 * y se le decía que su invitado lo presentara en portería. Punto 66 de
 * `REVISAR-A-OJO.md`.
 *
 * Lo puede leer cualquier miembro del condominio: el residente que crea la
 * visita necesita saberlo para guardarla con la instrucción correcta.
 */
export async function obtenerVerificacionDeDocumento(
  condominioId: string,
): Promise<boolean> {
  if (!condominioId) return true;
  const { data, error } = await supabase
    .from("condominio")
    .select("verificar_documento_visitas")
    .eq("id", condominioId)
    .maybeSingle();
  if (error) throw error;
  // Sin dato se verifica: es lo prudente en la puerta.
  return data?.verificar_documento_visitas ?? true;
}

/** Solo la administración; lo sujeta `condominio_escritura`. */
export async function guardarVerificacionDeDocumento(
  condominioId: string,
  verificar: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("condominio")
    .update({ verificar_documento_visitas: verificar })
    .eq("id", condominioId);
  if (error) throw error;
}

/** Lo que el edificio pide a toda vivienda de renta corta. `null` = no lo pide. */
export interface LimitesRentaCorta {
  estanciaMinimaNoches: number | null;
  capacidadMaxima: number | null;
}

/**
 * Los límites de renta corta del edificio (16/10/2026).
 *
 * `limite_renta_corta_condominio` existe desde el 23/09/2026 y el anfitrión los
 * ve como advertencia al configurar su vivienda (KT, flujo 4.1: advertencia,
 * no bloqueo). Nadie los podía escribir: la tabla estaba vacía.
 */
export async function obtenerLimitesRentaCorta(
  condominioId: string,
): Promise<LimitesRentaCorta> {
  const { data, error } = await supabase
    .from("limite_renta_corta_condominio")
    .select("estancia_minima_noches, capacidad_maxima")
    .eq("condominio_id", condominioId)
    .maybeSingle();
  if (error) throw error;
  return {
    estanciaMinimaNoches: data?.estancia_minima_noches ?? null,
    capacidadMaxima: data?.capacidad_maxima ?? null,
  };
}

export async function guardarLimitesRentaCorta(
  condominioId: string,
  limites: LimitesRentaCorta,
) {
  const { error } = await supabase.from("limite_renta_corta_condominio").upsert(
    {
      condominio_id: condominioId,
      estancia_minima_noches: limites.estanciaMinimaNoches,
      capacidad_maxima: limites.capacidadMaxima,
    },
    { onConflict: "condominio_id" },
  );
  if (error) throw error;
}

export interface TerminosDelEdificio {
  titulo: string;
  contenido: string;
  version: number;
}

/** Los términos vigentes del edificio: los que acepta el huésped al preregistrarse. */
export async function obtenerTerminosDelEdificio(
  condominioId: string,
): Promise<TerminosDelEdificio | null> {
  const { data, error } = await supabase
    .from("documento_legal")
    .select("titulo, contenido, version")
    .eq("condominio_id", condominioId)
    .eq("tipo", "terminos_condominio")
    .eq("vigente", true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Publica una versión nueva (16/10/2026). La anterior no se borra: es la
 * constancia de lo que aceptó cada huésped hasta hoy.
 */
export async function publicarTerminosDelEdificio(
  condominioId: string,
  titulo: string,
  contenido: string,
): Promise<number> {
  const { data, error } = await supabase.rpc("publicar_terminos_condominio", {
    p_condominio_id: condominioId,
    p_titulo: titulo,
    p_contenido: contenido,
  });
  if (error) throw error;
  return data;
}
