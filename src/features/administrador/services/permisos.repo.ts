import { supabase } from "@/shared/services/supabase";
import type { EstanciaConfig, PermisoVivienda } from "@/shared/types";

/**
 * Permisos de vivienda.
 *
 * El prototipo guardaba los campos de estancia como texto: `permiteVisitas`
 * valía "Si" o "No" —y el store sembraba "Sí" con tilde, o sea tres grafías
 * del mismo valor— y los días eran frases como "2 dias" de las que la
 * pantalla sacaba el número con una expresión regular.
 *
 * Ya no: en la base son `boolean` e `integer` y en la aplicación también. Lo
 * único que sigue traduciéndose es el horario de check-in, que la interfaz
 * ofrece como rango ("14:00 a 20:00", "24 horas") y la base guarda en dos
 * columnas `time`.
 *
 * Desde 20260923130000 las banderas admiten NULL, que significa **nadie lo ha
 * decidido**, y la base lo trata como permitido: un condominio que no ha dicho
 * nada no está prohibiendo nada. Un interruptor no sabe decir tres cosas, así
 * que muestra lo que de verdad pasa —permitido— y cuando la administración
 * guarda, la decisión queda escrita. Traducir NULL a `false` habría enseñado
 * "prohibido" donde no lo está, y un guardado sin tocar nada habría prohibido
 * las visitas de todo el edificio.
 */

/** NULL = sin decidir, y sin decidir no se prohíbe. */
const permitido = (valor: boolean | null | undefined) => valor ?? true;

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
    permiteVisitas: permitido(fila[`${prefijo}_permite_visitas`]),
    permiteHuespedNinos: permitido(fila[`${prefijo}_permite_ninos`]),
    permiteMascotas: permitido(fila[`${prefijo}_permite_mascotas`]),
    permiteCocherasVisit: permitido(fila[`${prefijo}_permite_cocheras`]),
    estanciaMinima: fila[`${prefijo}_estancia_minima`] ?? 1,
    estanciaMaxima: fila[`${prefijo}_estancia_maxima`] ?? null,
    horarioCheckin: rango(
      fila[`${prefijo}_checkin_desde`],
      fila[`${prefijo}_checkin_hasta`],
    ),
  };
}

function mapear(fila: any): PermisoVivienda {
  return {
    entregaDirecta: permitido(fila.entrega_directa),
    huespedesTemporales: permitido(fila.huespedes_temporales),
    diferenciaEstancia: Boolean(fila.diferencia_estancia),
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

    corta_permite_visitas: Boolean(datos.estanciaCorta?.permiteVisitas),
    corta_permite_ninos: Boolean(datos.estanciaCorta?.permiteHuespedNinos),
    corta_permite_mascotas: Boolean(datos.estanciaCorta?.permiteMascotas),
    corta_permite_cocheras: Boolean(datos.estanciaCorta?.permiteCocherasVisit),
    corta_estancia_minima: datos.estanciaCorta?.estanciaMinima ?? 1,
    corta_estancia_maxima: datos.estanciaCorta?.estanciaMaxima ?? null,
    corta_checkin_desde: corta.desde,
    corta_checkin_hasta: corta.hasta,

    larga_permite_visitas: Boolean(datos.estanciaLarga?.permiteVisitas),
    larga_permite_ninos: Boolean(datos.estanciaLarga?.permiteHuespedNinos),
    larga_permite_mascotas: Boolean(datos.estanciaLarga?.permiteMascotas),
    larga_permite_cocheras: Boolean(datos.estanciaLarga?.permiteCocherasVisit),
    larga_estancia_minima: datos.estanciaLarga?.estanciaMinima ?? 1,
    larga_estancia_maxima: datos.estanciaLarga?.estanciaMaxima ?? null,
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
