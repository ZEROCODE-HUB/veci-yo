import { supabase } from "@/shared/services/supabase";
import type { Fila } from "@/shared/types";
import { permitido } from "./permisosSinDecidir";
import type { EstanciaConfig, PermisoVivienda } from "@/shared/types";
import { partirRango, rango } from "./horarioDeEntrada";

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

function estancia(
  fila: Fila<"permiso_vivienda">,
  prefijo: "corta" | "larga",
): EstanciaConfig {
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

function mapear(fila: Fila<"permiso_vivienda">): PermisoVivienda {
  return {
    entregaDirecta: permitido(fila.entrega_directa),
    huespedesTemporales: permitido(fila.huespedes_temporales),
    diferenciaEstancia: Boolean(fila.diferencia_estancia),
    cortaHastaNoches: fila.corta_hasta_noches ?? null,
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
    corta_hasta_noches: datos.cortaHastaNoches ?? null,

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

type FilaDePermisos = ReturnType<typeof haciaFila>;

/**
 * La excepción de una vivienda guarda **solo lo que difiere** del edificio, y
 * deja en NULL el resto: `permisos_de_unidad` combina campo a campo con
 * `coalesce`, así que un NULL sigue la regla del edificio también cuando el
 * edificio la cambie después.
 *
 * Hasta el 17/10/2026 se escribían todos los campos, con el valor que el
 * formulario mostraba en ese momento. Una vivienda guardada una vez quedaba
 * congelada: ningún cambio posterior del edificio le llegaba, y la pantalla
 * decía «lo que dejes sin tocar sigue la regla del edificio».
 */
export function soloLoQueDifiere(
  fila: FilaDePermisos,
  delEdificio: FilaDePermisos | null,
): { [K in keyof FilaDePermisos]: FilaDePermisos[K] | null } {
  if (!delEdificio) return fila;
  const resultado = { ...fila } as { [K in keyof FilaDePermisos]: FilaDePermisos[K] | null };
  for (const clave of Object.keys(fila) as (keyof FilaDePermisos)[]) {
    if (fila[clave] === delEdificio[clave]) {
      (resultado as Record<string, unknown>)[clave] = null;
    }
  }
  return resultado;
}

async function escribirExcepcion(
  condominioId: string,
  unidadId: string,
  fila: Partial<{ [K in keyof FilaDePermisos]: FilaDePermisos[K] | null }>,
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
      .update(fila)
      .eq("id", existente.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from("permiso_vivienda")
    .insert({ condominio_id: condominioId, unidad_id: unidadId, ...fila });
  if (error) throw error;
}

/** Excepción para una unidad concreta, por encima del valor del condominio. */
export async function guardarPermisosDeUnidad(
  condominioId: string,
  unidadId: string,
  datos: PermisoVivienda,
) {
  const delEdificio = await obtenerPermisos(condominioId);
  await escribirExcepcion(
    condominioId,
    unidadId,
    soloLoQueDifiere(haciaFila(datos), delEdificio ? haciaFila(delEdificio) : null),
  );
}

/** Quita la excepción: la vivienda vuelve a seguir la regla del edificio en todo. */
export async function volverALaReglaDelEdificio(
  condominioId: string,
  unidadId: string,
) {
  const vacia = Object.fromEntries(
    Object.keys(haciaFila({} as PermisoVivienda)).map((k) => [k, null]),
  ) as { [K in keyof FilaDePermisos]: null };
  await escribirExcepcion(condominioId, unidadId, vacia);
}

/** Los permisos que aplican a una unidad: su excepción, o el del condominio. */
export async function permisosDeUnidad(unidadId: string) {
  const { data, error } = await supabase.rpc("permisos_de_unidad", {
    p_unidad_id: unidadId,
  });
  if (error) throw error;
  return data ? mapear(data) : null;
}
