import { supabase } from "@/shared/services/supabase";
import type { EstanciaConfig, PermisoVivienda } from "@/shared/types";

/**
 * Permisos de vivienda.
 *
 * El prototipo guardaba los campos de estancia como texto: `permiteVisitas`
 * valía "Si" o "No", y convivían DOS grafías del mismo valor porque el store
 * sembraba una con tilde y los datos de prueba la otra sin ella; la interfaz
 * estaba parchada para leer ambas. Los días eran frases como "2 dias", de las
 * que la pantalla extraía el número con una expresión regular.
 *
 * En la base son `boolean` e `integer`. Esta traducción existe solo mientras
 * las pantallas sigan hablando el vocabulario viejo.
 */

const SI = "Sí";
const NO = "No";

const bool = (v?: string) => v === SI || v === "Si";
const texto = (v: boolean) => (v ? SI : NO);

const dias = (v?: string) => {
  const n = Number(String(v ?? "").match(/\d+/)?.[0]);
  return Number.isFinite(n) && n > 0 ? n : 1;
};
const frase = (n?: number | null) => (n ? `${n} dias` : "");
const hhmm = (v?: string | null) => (v ? v.slice(0, 5) : "");

function rango(desde?: string | null, hasta?: string | null) {
  if (!desde || !hasta) return "";
  return `${hhmm(desde)} a ${hhmm(hasta)}`;
}

function partirRango(valor?: string) {
  if (!valor) return { desde: null, hasta: null };
  // "24 horas" no es un rango; se representa como el dia completo.
  if (/24\s*horas/i.test(valor)) return { desde: "00:00", hasta: "23:59" };
  const partes = valor.split(/\s+a\s+/).map((v) => v.trim());
  return { desde: partes[0] || null, hasta: partes[1] || null };
}

function estancia(fila: any, prefijo: "corta" | "larga"): EstanciaConfig {
  return {
    permiteVisitas: texto(fila[`${prefijo}_permite_visitas`]),
    permiteHuespedNinos: texto(fila[`${prefijo}_permite_ninos`]),
    permiteMascotas: texto(fila[`${prefijo}_permite_mascotas`]),
    permiteCocherasVisit: texto(fila[`${prefijo}_permite_cocheras`]),
    estanciaMinima: frase(fila[`${prefijo}_estancia_minima`]),
    estanciaMaxima: frase(fila[`${prefijo}_estancia_maxima`]),
    horarioCheckin: rango(
      fila[`${prefijo}_checkin_desde`],
      fila[`${prefijo}_checkin_hasta`],
    ),
  };
}

function mapear(fila: any): PermisoVivienda {
  return {
    entregaDirecta: fila.entrega_directa,
    huespedesTemporales: fila.huespedes_temporales,
    diferenciaEstancia: fila.diferencia_estancia,
    estanciaCorta: estancia(fila, "corta"),
    estanciaLarga: estancia(fila, "larga"),
  };
}

function haciaFila(datos: PermisoVivienda) {
  const corta = partirRango(datos.estanciaCorta?.horarioCheckin);
  const larga = partirRango(datos.estanciaLarga?.horarioCheckin);

  return {
    entrega_directa: datos.entregaDirecta,
    huespedes_temporales: datos.huespedesTemporales,
    diferencia_estancia: datos.diferenciaEstancia ?? false,

    corta_permite_visitas: bool(datos.estanciaCorta?.permiteVisitas),
    corta_permite_ninos: bool(datos.estanciaCorta?.permiteHuespedNinos),
    corta_permite_mascotas: bool(datos.estanciaCorta?.permiteMascotas),
    corta_permite_cocheras: bool(datos.estanciaCorta?.permiteCocherasVisit),
    corta_estancia_minima: dias(datos.estanciaCorta?.estanciaMinima),
    corta_estancia_maxima: datos.estanciaCorta?.estanciaMaxima
      ? dias(datos.estanciaCorta.estanciaMaxima)
      : null,
    corta_checkin_desde: corta.desde,
    corta_checkin_hasta: corta.hasta,

    larga_permite_visitas: bool(datos.estanciaLarga?.permiteVisitas),
    larga_permite_ninos: bool(datos.estanciaLarga?.permiteHuespedNinos),
    larga_permite_mascotas: bool(datos.estanciaLarga?.permiteMascotas),
    larga_permite_cocheras: bool(datos.estanciaLarga?.permiteCocherasVisit),
    larga_estancia_minima: dias(datos.estanciaLarga?.estanciaMinima),
    larga_estancia_maxima: datos.estanciaLarga?.estanciaMaxima
      ? dias(datos.estanciaLarga.estanciaMaxima)
      : null,
    larga_checkin_desde: larga.desde,
    larga_checkin_hasta: larga.hasta,
  };
}

/** Valor por defecto del condominio: la fila sin unidad. */
export async function obtenerPermisos(
  condominioId: string,
): Promise<PermisoVivienda | null> {
  const { data, error } = await supabase
    .from("permiso_vivienda")
    .select("*")
    .eq("condominio_id", condominioId)
    .is("unidad_id", null)
    .maybeSingle();

  if (error) throw error;
  return data ? mapear(data) : null;
}

/**
 * No se usa `upsert`: la unicidad la garantizan indices PARCIALES
 * (`where unidad_id is null` y `where unidad_id is not null`), y `onConflict`
 * no puede referirse a un indice parcial. Se resuelve leyendo primero.
 */
export async function guardarPermisos(
  condominioId: string,
  datos: PermisoVivienda,
) {
  const { data: existente, error: errorLectura } = await supabase
    .from("permiso_vivienda")
    .select("id")
    .eq("condominio_id", condominioId)
    .is("unidad_id", null)
    .maybeSingle();
  if (errorLectura) throw errorLectura;

  if (existente) {
    const { error } = await supabase
      .from("permiso_vivienda")
      .update(haciaFila(datos))
      .eq("id", existente.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from("permiso_vivienda")
    .insert({ condominio_id: condominioId, unidad_id: null, ...haciaFila(datos) });
  if (error) throw error;
}

/** Excepción para una unidad concreta, por encima del valor del condominio. */
export async function guardarPermisosDeUnidad(
  condominioId: string,
  unidadId: string,
  datos: PermisoVivienda,
) {
  const { data: existente, error: errorLectura } = await supabase
    .from("permiso_vivienda")
    .select("id")
    .eq("unidad_id", unidadId)
    .maybeSingle();
  if (errorLectura) throw errorLectura;

  if (existente) {
    const { error } = await supabase
      .from("permiso_vivienda")
      .update(haciaFila(datos))
      .eq("id", existente.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from("permiso_vivienda")
    .insert({ condominio_id: condominioId, unidad_id: unidadId, ...haciaFila(datos) });
  if (error) throw error;
}

/** Los permisos que aplican a una unidad: su excepción, o el del condominio. */
export async function permisosDeUnidad(unidadId: string) {
  const { data, error } = await supabase.rpc("permisos_de_unidad", {
    p_unidad_id: unidadId,
  });
  if (error) throw error;
  return data ? mapear(data) : null;
}
