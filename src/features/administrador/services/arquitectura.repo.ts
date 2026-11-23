import { supabase } from "@/shared/services/supabase";
import { ahora, haciaLaBase } from "@/shared/utils/reloj.util";
import { paisPorDefecto } from "@/shared/constants";
import type { Fila } from "@/shared/types";
import type {
  Deposito,
  Porteria,
  Torre,
  Unidad,
} from "@/stores/admin-store";
import type { Database } from "@/shared/types/database.types";
import {
  planDeEstacionamientos,
  planDeTorre,
  type PedidoDeNivel,
  type PedidoDeTorre,
} from "../helpers/arquitectura.helpers";

type TipoPorteriaDB = Database["public"]["Enums"]["tipo_porteria"];
type EstadoUnidadDB = Database["public"]["Enums"]["estado_unidad"];
type TipoEstacionamientoDB = Database["public"]["Enums"]["tipo_estacionamiento"];

/**
 * Arquitectura del condominio: torres, unidades, depósitos, estacionamientos y
 * porterías.
 *
 * Dos cosas cambian respecto del prototipo:
 *
 * 1. Los conteos (pisos, sótanos, cocheras, entradas) eran `string`. En la base
 *    son enteros, así que la traducción ocurre aquí y no en cada pantalla.
 * 2. Los estacionamientos eran un contador global `{total, ocupados}` más un
 *    mapa `spot -> clave`. Ahora son filas, así que la ocupación se puede
 *    auditar y liberar sin condiciones de carrera.
 */

const num = (v?: string | null) => {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(String(v).match(/-?\d+/)?.[0]);
  return Number.isFinite(n) ? n : undefined;
};

const txt = (v?: number | null) => (v === null || v === undefined ? "" : String(v));

function idNumerico(uuid: string): number {
  let hash = 0;
  for (let i = 0; i < uuid.length; i += 1) hash = (hash * 31 + uuid.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

// ---------------------------------------------------------------------------
// Torres
// ---------------------------------------------------------------------------

function mapearTorre(fila: Fila<"torre">): Torre {
  return {
    uuid: fila.id,
    id: idNumerico(fila.id),
    numero: fila.numero,
    nombre: fila.nombre,
    descripcion: fila.descripcion ?? "",
    pisos: txt(fila.pisos),
    sotanos: txt(fila.sotanos),
    cocherasVisitas: txt(fila.cocheras_visitas),
    cocherasPrivadas: txt(fila.cocheras_privadas),
    almacenPrivados: txt(fila.almacenes_privados),
    entradasPeatonales: txt(fila.entradas_peatonales),
    entradasVehiculares: txt(fila.entradas_vehiculares),
    depto: txt(fila.departamentos_declarados),
    penthouse: txt(fila.penthouses),
    nomenclaturaDesde: fila.nomenclatura_desde ?? "",
    nomenclaturaHasta: fila.nomenclatura_hasta ?? "",
    ubicacionParkingVisitas: fila.ubicacion_cocheras_visitas ?? "",
  } as Torre;
}

function torreHaciaFila(datos: Partial<Torre>) {
  return {
    nombre: datos.nombre,
    descripcion: datos.descripcion || null,
    pisos: num(datos.pisos),
    sotanos: num(datos.sotanos),
    cocheras_visitas: num(datos.cocherasVisitas) ?? 0,
    cocheras_privadas: num(datos.cocherasPrivadas) ?? 0,
    almacenes_privados: num(datos.almacenPrivados) ?? 0,
    entradas_peatonales: num(datos.entradasPeatonales) ?? 0,
    entradas_vehiculares: num(datos.entradasVehiculares) ?? 0,
    // Solo se muestran en la tarjeta (29/10/2026).
    departamentos_declarados: num(datos.depto),
    penthouses: num(datos.penthouse),
    nomenclatura_desde: datos.nomenclaturaDesde || null,
    nomenclatura_hasta: datos.nomenclaturaHasta || null,
    // Se escribía en la ficha y no tenía columna (16/10/2026).
    ubicacion_cocheras_visitas: datos.ubicacionParkingVisitas?.trim() || null,
  };
}

// ---------------------------------------------------------------------------
// Consulta única
// ---------------------------------------------------------------------------

/** Un nivel de estacionamiento del edificio (16/11/2026). */
export interface NivelDeEstacionamiento {
  uuid: string;
  nombre: string;
  nomenclatura: string;
  orden: number;
  /** La torre del sótano (17/11/2026); vacía en los de antes. */
  torreId: string | null;
}

export interface Arquitectura {
  torres: Torre[];
  unidades: Unidad[];
  depositos: Deposito[];
  porterias: Porteria[];
  niveles: NivelDeEstacionamiento[];
  estacionamientos: Array<{
    uuid: string;
    codigo: string;
    ubicacion: string;
    tipo: TipoEstacionamientoDB;
    unidadId: string | null;
    torreNumero: number | null;
    ocupado: boolean;
    /** El nivel donde está; vacío en los de antes del 16/11/2026. */
    nivelId: string | null;
    /** Su nombre («Sótano 1»), para enseñarlo junto al código. */
    nivel: string;
  }>;
}

/**
 * `condominioId`: el edificio del rol activo. Sin él trae **todo lo que RLS
 * deja ver**, y quien administra un edificio y además vive o es guardia en
 * otro veía las torres y viviendas de los dos mezcladas: varios «101», y el
 * índice de votación se editaba en la vivienda del otro edificio (20/11/2026,
 * cuenta multirol del cliente).
 */
export async function obtenerArquitectura(condominioId?: string): Promise<Arquitectura> {
  let torreQ = supabase.from("torre").select("*").is("deleted_at", null);
  let unidadQ = supabase
    .from("unidad")
    .select("id, codigo, piso, estado, tipologia_id, indice_votacion, torre:torre_id ( id, numero )")
    .is("deleted_at", null);
  let depositoQ = supabase
    .from("deposito")
    .select("id, codigo, ubicacion, unidad_id, torre:torre_id ( numero ), unidad:unidad_id ( codigo )");
  let porteriaQ = supabase.from("porteria").select("*").is("deleted_at", null);
  let estacionamientoQ = supabase
    .from("estacionamiento")
    /*
      En una sola pieza y no concatenando: Supabase deduce el tipo de la
      respuesta **del literal** del `select`.
    */
    .select(
      `id, codigo, ubicacion, tipo, unidad_id, nivel_id,
       torre:torre_id ( numero ),
       asignaciones:asignacion_estacionamiento ( liberado_en )`,
    );
  let nivelQ = supabase.from("nivel_estacionamiento").select("id, nombre, nomenclatura, orden, torre_id");
  if (condominioId) {
    torreQ = torreQ.eq("condominio_id", condominioId);
    unidadQ = unidadQ.eq("condominio_id", condominioId);
    depositoQ = depositoQ.eq("condominio_id", condominioId);
    porteriaQ = porteriaQ.eq("condominio_id", condominioId);
    estacionamientoQ = estacionamientoQ.eq("condominio_id", condominioId);
    nivelQ = nivelQ.eq("condominio_id", condominioId);
  }

  const [torres, unidades, depositos, porterias, estacionamientos, niveles] =
    await Promise.all([
      torreQ.order("numero"),
      unidadQ.order("codigo"),
      depositoQ.order("codigo"),
      porteriaQ.order("nombre"),
      estacionamientoQ.order("codigo"),
      nivelQ.order("orden").order("nombre"),
    ]);
  for (const r of [torres, unidades, depositos, porterias, estacionamientos, niveles]) {
    if (r.error) throw r.error;
  }

  // El nombre del nivel va junto al código en todas partes (16/11/2026): se
  // pide aparte y se cruza aquí, una vez.
  const nombreDelNivel = new Map((niveles.data ?? []).map((n) => [n.id, n.nombre]));

  /*
    Los estacionamientos privados de cada vivienda (09/11/2026, Correcciones
    fila 8): ya se cargaban aquí, pero a la vivienda no le llegaban y el
    directorio decía «Estac: 0» en todas.
  */
  const privadosPorUnidad = new Map<string, { codigo: string; ubicacion: string; nivel: string }[]>();
  for (const e of estacionamientos.data ?? []) {
    if (e.tipo === "visitante" || !e.unidad_id) continue;
    const lista = privadosPorUnidad.get(e.unidad_id) ?? [];
    lista.push({
      codigo: e.codigo,
      ubicacion: e.ubicacion ?? "",
      nivel: e.nivel_id ? nombreDelNivel.get(e.nivel_id) ?? "" : "",
    });
    privadosPorUnidad.set(e.unidad_id, lista);
  }

  return {
    torres: (torres.data ?? []).map(mapearTorre),
    unidades: (unidades.data ?? []).map((f) => {
      const privados = privadosPorUnidad.get(f.id) ?? [];
      return {
        uuid: f.id,
        id: idNumerico(f.id),
        codigo: f.codigo,
        torreNumero: f.torre?.numero ?? 0,
        torreId: f.torre?.id,
        piso: f.piso,
        tipologiaId: f.tipologia_id ?? undefined,
        indiceVotacion: f.indice_votacion == null ? null : Number(f.indice_votacion),
        estado: f.estado,
        estacionamientos: privados.length,
        codigosEstacionamiento: privados.map((p) => p.codigo),
        // En el mismo orden que los códigos (16/11/2026).
        nivelesEstacionamiento: privados.map((p) => p.nivel),
        ubicacionParking: privados.map((p) => p.ubicacion).filter(Boolean).join(", "),
      };
    }) as Unidad[],
    depositos: (depositos.data ?? []).map((f) => ({
      uuid: f.id,
      id: idNumerico(f.id),
      codigo: f.codigo,
      torreNumero: f.torre?.numero ?? 0,
      ubicacion: f.ubicacion ?? "",
      unidadId: f.unidad_id,
      departamentoCodigo: f.unidad?.codigo ?? "",
    })) as unknown as Deposito[],
    porterias: (porterias.data ?? []).map((f) => ({
      uuid: f.id,
      id: idNumerico(f.id),
      nombre: f.nombre,
      tipo: f.tipo,
      ubicacion: f.ubicacion ?? "",
      telefono: f.telefono ?? "",
      codigoPais: f.codigo_pais ?? paisPorDefecto(),
      torreId: f.torre_id ?? undefined,
    })) as unknown as Porteria[],
    niveles: (niveles.data ?? []).map((n) => ({
      uuid: n.id,
      nombre: n.nombre,
      nomenclatura: n.nomenclatura,
      orden: n.orden,
      torreId: n.torre_id,
    })),
    estacionamientos: (estacionamientos.data ?? []).map((f) => ({
      uuid: f.id,
      codigo: f.codigo,
      ubicacion: f.ubicacion ?? "",
      tipo: f.tipo,
      unidadId: f.unidad_id,
      torreNumero: f.torre?.numero ?? null,
      // Ocupado = tiene una asignacion sin liberar.
      ocupado: (f.asignaciones ?? []).some((a) => a.liberado_en === null),
      nivelId: f.nivel_id,
      nivel: f.nivel_id ? nombreDelNivel.get(f.nivel_id) ?? "" : "",
    })),
  };
}

// ---------------------------------------------------------------------------
// Torres
// ---------------------------------------------------------------------------

/**
 * La regla con que se genera una torre. La pone la base y la pasa quien
 * llama: era un 500 escrito aquí.
 *
 * `torre_divisor_piso` ya no se usa al crear (16/11/2026): el piso de cada
 * departamento sale escrito del formulario, no de dividir el código.
 */
export interface ReglasDeTorre {
  /** Cuántas viviendas se generan como mucho de una vez (`torre_viviendas_maximo`). */
  viviendasMaximo: number;
}

/** Lo que el alta de una torre construye además de la torre (16/11/2026). */
export interface ConstruccionDeTorre {
  /** «Del piso X al Y, N por piso», con números o letras. */
  departamentos?: PedidoDeTorre;
  /**
   * Las filas «Nivel · privados · de visita». Un nivel que no existe todavía
   * se crea con su nombre y su nomenclatura.
   */
  estacionamientos?: PedidoDeNivel[];
}

export async function crearTorre(
  condominioId: string,
  datos: Partial<Torre>,
  reglas: ReglasDeTorre,
  construccion: ConstruccionDeTorre = {},
) {
  /*
    Antes de crear nada, se mira si los departamentos caben.

    La torre se insertaba primero y las viviendas después. El código de una
    vivienda es único en todo el condominio, no por torre, así que «Torre B,
    101 a 110» con la Torre A ya numerada así dejaba **la torre creada y sin
    viviendas**, un «no se pudo guardar», y otra torre igual al reintentar
    (13/10/2026). Las dadas de baja cuentan: su código sigue ocupado.
  */
  const plan = construccion.departamentos
    ? planDeTorre(construccion.departamentos, reglas.viviendasMaximo)
    : { viviendas: [], motivo: "" };
  if (plan.motivo) throw new Error(plan.motivo);
  if (plan.viviendas.length > 0) {
    const { data: ocupados, error: errorOcupados } = await supabase
      .from("unidad")
      .select("codigo")
      .eq("condominio_id", condominioId)
      .in("codigo", plan.viviendas.map((v) => v.codigo));
    if (errorOcupados) throw errorOcupados;
    if (ocupados?.length) {
      const lista = ocupados
        .map((u) => u.codigo)
        .sort()
        .slice(0, 6)
        .join(", ");
      throw new Error(
        `Ya hay viviendas con esos números en el edificio (${lista}${
          ocupados.length > 6 ? "…" : ""
        }). Elige otros pisos o la otra numeración.`,
      );
    }
  }

  // Los códigos de estacionamiento siguen los que ya hay en el edificio: el
  // código es único en el condominio, no en la torre.
  const filas = (construccion.estacionamientos ?? []).filter(
    (f) => f.privados > 0 || f.visita > 0,
  );
  let existentes: string[] = [];
  if (filas.length) {
    const { data, error: errorCodigos } = await supabase
      .from("estacionamiento")
      .select("codigo")
      .eq("condominio_id", condominioId);
    if (errorCodigos) throw errorCodigos;
    existentes = (data ?? []).map((e) => e.codigo);
  }
  const planCocheras = planDeEstacionamientos(filas, existentes);
  const privados = planCocheras.reduce((s, n) => s + n.codigosPrivados.length, 0);
  const deVisita = planCocheras.reduce((s, n) => s + n.codigosVisita.length, 0);

  // El numero es correlativo dentro del condominio; lo calcula la base al leer
  // el maximo actual, no el cliente.
  const { data: ultimas } = await supabase
    .from("torre")
    .select("numero")
    .eq("condominio_id", condominioId)
    .order("numero", { ascending: false })
    .limit(1);

  const siguiente = (ultimas?.[0]?.numero ?? 0) + 1;
  const primera = plan.viviendas[0]?.codigo;
  const ultima = plan.viviendas[plan.viviendas.length - 1]?.codigo;

  const { data: creada, error } = await supabase
    .from("torre")
    .insert({
      ...torreHaciaFila(datos),
      condominio_id: condominioId,
      numero: siguiente,
      nombre: datos.nombre || `Torre ${siguiente}`,
      // Lo que la tarjeta de la torre enseña; ya no genera nada por sí solo.
      nomenclatura_desde: primera ?? null,
      nomenclatura_hasta: ultima ?? null,
      cocheras_privadas: privados,
      cocheras_visitas: deVisita,
    })
    .select("id")
    .single();
  if (error) throw error;

  /*
    Se generan **solo al crear**, nunca al editar. Reconciliar un numero con
    filas que ya existen es destructivo --bajar de diez a cinco tendria que
    borrar cinco plazas, quiza asignadas-- y nadie pidio eso. Para un piso con
    otra cantidad, se agregan o quitan departamentos uno a uno en la torre.
  */
  if (plan.viviendas.length > 0) {
    const { error: errorViviendas } = await supabase.from("unidad").insert(
      plan.viviendas.map((v) => ({
        condominio_id: condominioId,
        torre_id: creada.id,
        codigo: v.codigo,
        piso: v.piso,
      })),
    );
    if (errorViviendas) throw errorViviendas;
  }

  if (planCocheras.length > 0) {
    const idDelNivel = await asegurarNiveles(condominioId, planCocheras);
    const nuevas = planCocheras.flatMap((n) => [
      ...n.codigosPrivados.map((codigo) => ({ codigo, tipo: "privado" as const, nivel: n.nomenclatura })),
      ...n.codigosVisita.map((codigo) => ({ codigo, tipo: "visitante" as const, nivel: n.nomenclatura })),
    ]);
    const { error: errorCocheras } = await supabase.from("estacionamiento").insert(
      nuevas.map((n) => ({
        condominio_id: condominioId,
        torre_id: creada.id,
        codigo: n.codigo,
        tipo: n.tipo,
        nivel_id: idDelNivel.get(n.nivel) ?? null,
      })),
    );
    if (errorCocheras) throw errorCocheras;
  }
}

/**
 * Los niveles de las filas pedidas, creando los que falten. Devuelve
 * nomenclatura → id.
 */
async function asegurarNiveles(
  condominioId: string,
  filas: Array<{ nombre: string; nomenclatura: string }>,
): Promise<Map<string, string>> {
  const { data: hay, error } = await supabase
    .from("nivel_estacionamiento")
    .select("id, nomenclatura, orden")
    .eq("condominio_id", condominioId);
  if (error) throw error;
  const ids = new Map((hay ?? []).map((n) => [n.nomenclatura, n.id]));
  let orden = Math.max(0, ...(hay ?? []).map((n) => n.orden));
  const faltan = filas.filter(
    (f, i) => !ids.has(f.nomenclatura) && filas.findIndex((g) => g.nomenclatura === f.nomenclatura) === i,
  );
  if (faltan.length) {
    const { data: creados, error: errorCrear } = await supabase
      .from("nivel_estacionamiento")
      .insert(
        faltan.map((f) => ({
          condominio_id: condominioId,
          nombre: f.nombre.trim(),
          nomenclatura: f.nomenclatura,
          orden: (orden += 1),
        })),
      )
      .select("id, nomenclatura");
    if (errorCrear) throw errorCrear;
    for (const n of creados ?? []) ids.set(n.nomenclatura, n.id);
  }
  return ids;
}

/**
 * Crea las cocheras que la torre declara y todavía no existen (29/10/2026).
 *
 * Desde el 16/11/2026 la torre nueva crea sus estacionamientos por nivel
 * (`crearTorre`); esto queda para **editar** las torres de antes, que se
 * dieron de alta con los dos números: subir el número crea las que faltan.
 *
 * El cliente volvió a pedir «Cocheras privadas» y «Cocheras de visitas» en la
 * torre, y que el número que se ponga **cree** esas cocheras con su código:
 * `T{n}-P01…` las privadas y `V{n}-01…` las de visita (el número de la torre
 * va delante porque el código es único en el edificio). Al editar subiendo el
 * número se crean las que faltan; bajando no se borra ninguna, que podría
 * estar asignada.
 */
async function completarCocheras(condominioId: string, torreId: string, datos: Partial<Torre>) {
  const { data: torre, error: errorTorre } = await supabase
    .from("torre")
    .select("numero")
    .eq("id", torreId)
    .single();
  if (errorTorre) throw errorTorre;
  const { data: existentes, error: errorExistentes } = await supabase
    .from("estacionamiento")
    .select("codigo, tipo")
    .eq("torre_id", torreId);
  if (errorExistentes) throw errorExistentes;

  const pedidos: Array<{ tipo: "visitante" | "privado"; cuantas: number; prefijo: string }> = [
    { tipo: "visitante", cuantas: Number(datos.cocherasVisitas || 0), prefijo: `V${torre.numero}-` },
    { tipo: "privado", cuantas: Number(datos.cocherasPrivadas || 0), prefijo: `T${torre.numero}-P` },
  ];
  const usados = new Set((existentes ?? []).map((e) => e.codigo));
  const nuevas: Array<{ condominio_id: string; torre_id: string; codigo: string; tipo: "visitante" | "privado" }> = [];
  for (const { tipo, cuantas, prefijo } of pedidos) {
    let faltan = cuantas - (existentes ?? []).filter((e) => e.tipo === tipo).length;
    for (let i = 1; faltan > 0 && i < 1000; i++) {
      const codigo = `${prefijo}${String(i).padStart(2, "0")}`;
      if (usados.has(codigo)) continue;
      usados.add(codigo);
      nuevas.push({ condominio_id: condominioId, torre_id: torreId, codigo, tipo });
      faltan--;
    }
  }
  if (nuevas.length === 0) return;
  const { error } = await supabase.from("estacionamiento").insert(nuevas);
  if (error) throw error;
}

export async function actualizarTorre(uuid: string, datos: Partial<Torre>) {
  const { data, error } = await supabase
    .from("torre")
    .update(torreHaciaFila(datos))
    .eq("id", uuid)
    .select("condominio_id")
    .single();
  if (error) throw error;
  // Subir el número de cocheras crea las que faltan (29/10/2026).
  await completarCocheras(data.condominio_id, uuid, datos);
}

/** Borrado logico: las unidades historicas siguen apuntando a la torre. */
export async function eliminarTorre(uuid: string) {
  const { error } = await supabase
    .from("torre")
    .update({ deleted_at: haciaLaBase(ahora()) })
    .eq("id", uuid);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Unidades
// ---------------------------------------------------------------------------

/**
 * Da de alta un departamento y devuelve su id.
 *
 * El código es único en el edificio aunque el departamento esté eliminado
 * (eliminar es un borrado lógico). Volver a crear el 102 después de
 * eliminarlo fallaba con «no se pudo guardar» (29/10/2026): ahora se recupera
 * el eliminado, en esta torre y con estos datos. Si existe y está vivo, se dice.
 */
export async function crearUnidad(
  condominioId: string,
  datos: { torreId: string; codigo: string; piso: number; tipologiaId?: string; indiceVotacion?: number | null },
): Promise<string> {
  const codigo = datos.codigo.trim();
  const { data: existente, error: errorExistente } = await supabase
    .from("unidad")
    .select("id, deleted_at")
    .eq("condominio_id", condominioId)
    .eq("codigo", codigo)
    .maybeSingle();
  if (errorExistente) throw errorExistente;

  if (existente && !existente.deleted_at) {
    throw new Error(`Ya existe un departamento ${codigo} en el edificio.`);
  }
  if (existente) {
    const { error } = await supabase
      .from("unidad")
      .update({
        torre_id: datos.torreId,
        piso: datos.piso,
        tipologia_id: datos.tipologiaId ?? null,
        indice_votacion: datos.indiceVotacion ?? null,
        estado: "disponible",
        deleted_at: null,
      })
      .eq("id", existente.id);
    if (error) throw error;
    return existente.id;
  }

  const { data, error } = await supabase
    .from("unidad")
    .insert({
      condominio_id: condominioId,
      torre_id: datos.torreId,
      codigo,
      piso: datos.piso,
      tipologia_id: datos.tipologiaId ?? null,
      indice_votacion: datos.indiceVotacion ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function actualizarUnidad(
  uuid: string,
  datos: {
    codigo?: string;
    piso?: number;
    estado?: EstadoUnidadDB;
    tipologiaId?: string | null;
    /** Índice de votación, en % (18/11/2026). `undefined` no lo toca; `null` lo vacía. */
    indiceVotacion?: number | null;
  },
) {
  const { error } = await supabase
    .from("unidad")
    .update({
      codigo: datos.codigo,
      piso: datos.piso,
      estado: datos.estado,
      tipologia_id: datos.tipologiaId,
      indice_votacion: datos.indiceVotacion,
    })
    .eq("id", uuid);
  if (error) throw error;
}

export async function eliminarUnidad(uuid: string) {
  /*
    Una vivienda con gente dentro no se da de baja. La torre ya tenía este
    guarda; la vivienda no, y se borraba a un toque con sus residentes
    colgando de una fila que deja de verse (13/10/2026).
  */
  const { count, error: errorConteo } = await supabase
    .from("membresia_unidad")
    .select("id", { count: "exact", head: true })
    .eq("unidad_id", uuid)
    .eq("activo", true);
  if (errorConteo) throw errorConteo;
  if ((count ?? 0) > 0) {
    throw new Error(
      "Esta vivienda tiene residentes. Dalos de baja antes de eliminarla.",
    );
  }

  const { data, error } = await supabase
    .from("unidad")
    .update({ deleted_at: haciaLaBase(ahora()) })
    .eq("id", uuid)
    .select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("No tienes permiso para eliminar esa vivienda.");
}

// ---------------------------------------------------------------------------
// Depositos
// ---------------------------------------------------------------------------

export async function crearDeposito(
  condominioId: string,
  datos: { codigo: string; torreId?: string; ubicacion?: string; unidadId?: string },
) {
  const { error } = await supabase.from("deposito").insert({
    condominio_id: condominioId,
    codigo: datos.codigo,
    torre_id: datos.torreId ?? null,
    ubicacion: datos.ubicacion || null,
    unidad_id: datos.unidadId ?? null,
  });
  if (error) throw error;
}

export async function actualizarDeposito(
  uuid: string,
  datos: { codigo?: string; ubicacion?: string; unidadId?: string | null },
) {
  const { error } = await supabase
    .from("deposito")
    .update({
      codigo: datos.codigo,
      ubicacion: datos.ubicacion,
      unidad_id: datos.unidadId,
    })
    .eq("id", uuid);
  if (error) throw error;
}

export async function eliminarDeposito(uuid: string) {
  const { error } = await supabase.from("deposito").delete().eq("id", uuid);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Porterias
// ---------------------------------------------------------------------------

interface DatosPorteria {
  nombre?: string;
  tipo?: TipoPorteriaDB;
  ubicacion?: string;
  telefono?: string;
  /**
   * El pais del telefono. `porteria.codigo_pais` existe desde el primer dia y
   * **nadie la escribia**: el numero se guardaba como texto suelto, asi que
   * llamar a la garita desde fuera del pais era imposible.
   */
  codigoPais?: string;
  /** La torre de una garita de torre; vacía en las demás (16/11/2026). */
  torreId?: string | null;
}

/** Solo la garita de torre lleva torre: en las demás se guarda vacía. */
const torreDeLaPorteria = (datos: DatosPorteria) =>
  datos.tipo === "garita_torre" ? datos.torreId || null : null;

export async function crearPorteria(
  condominioId: string,
  datos: DatosPorteria & { nombre: string; tipo: TipoPorteriaDB },
) {
  const { error } = await supabase.from("porteria").insert({
    condominio_id: condominioId,
    nombre: datos.nombre,
    tipo: datos.tipo,
    torre_id: torreDeLaPorteria(datos),
    ubicacion: datos.ubicacion || null,
    telefono: datos.telefono || null,
    codigo_pais: datos.codigoPais || null,
  });
  if (error) throw error;
}

/**
 * Las garitas del modelo elegido que faltaban, de una vez y con los nombres
 * que se dejaron escritos (16/11/2026).
 */
export async function crearGaritas(
  condominioId: string,
  garitas: Array<{ nombre: string; tipo: TipoPorteriaDB; torreId: string | null }>,
) {
  if (!garitas.length) return;
  const { error } = await supabase.from("porteria").insert(
    garitas.map((g) => ({
      condominio_id: condominioId,
      nombre: g.nombre.trim(),
      tipo: g.tipo,
      torre_id: g.tipo === "garita_torre" ? g.torreId : null,
    })),
  );
  if (error) throw error;
}

export async function actualizarPorteria(uuid: string, datos: DatosPorteria) {
  /*
    Columna a columna y no `update(datos)`: ese atajo exige que cada campo del
    formulario se llame **igual** que su columna, y `codigoPais` no se llama
    `codigo_pais`. Un campo que no coincide no da error: se ignora en silencio,
    que es como la mitad de los defectos de este proyecto llegaron a produccion.
  */
  const fila: Partial<Fila<"porteria">> = {};
  if (datos.nombre !== undefined) fila.nombre = datos.nombre;
  if (datos.tipo !== undefined) {
    fila.tipo = datos.tipo;
    fila.torre_id = torreDeLaPorteria(datos);
  }
  if (datos.ubicacion !== undefined) fila.ubicacion = datos.ubicacion || null;
  if (datos.telefono !== undefined) fila.telefono = datos.telefono || null;
  if (datos.codigoPais !== undefined) fila.codigo_pais = datos.codigoPais || null;

  const { error } = await supabase.from("porteria").update(fila).eq("id", uuid);
  if (error) throw error;
}

export async function eliminarPorteria(uuid: string) {
  const { error } = await supabase
    .from("porteria")
    .update({ deleted_at: haciaLaBase(ahora()) })
    .eq("id", uuid);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Estacionamientos
// ---------------------------------------------------------------------------

/*
  Estaba escrita desde el primer dia y **nadie la llamaba**: el hook la exponia
  como `createEstacionamiento` y ninguna pantalla la usaba. Es la cadena de tres
  eslabones rota en el ultimo, otra vez.

  Mientras tanto la ficha de la torre pedia «cocheras de visitas» y «cocheras
  privadas», y ese numero se guardaba en `torre` sin crear nada: en todo el
  condominio habia una sola cochera, metida a mano, y la portada decia «1 de 1
  disponibles» sin que nadie pudiera anadir otra. El numero declarado se retira
  (REVISAR-A-OJO 72).
*/
export async function crearEstacionamiento(
  condominioId: string,
  datos: {
    codigo: string;
    tipo: TipoEstacionamientoDB;
    torreId?: string;
    /**
     * Obligatorio desde el 16/11/2026 (el cliente: «Ubicación obligatoria al
     * crear Estacionamiento»). La base lo deja vacío por las filas de antes;
     * la puerta se cierra aquí, no solo en el formulario.
     */
    nivelId: string;
    ubicacion?: string;
    unidadId?: string;
  },
) {
  if (!datos.nivelId) throw new Error("Elige el nivel del estacionamiento.");
  const { error } = await supabase.from("estacionamiento").insert({
    condominio_id: condominioId,
    codigo: datos.codigo,
    tipo: datos.tipo,
    torre_id: datos.torreId ?? null,
    nivel_id: datos.nivelId,
    ubicacion: datos.ubicacion || null,
    unidad_id: datos.unidadId ?? null,
  });
  if (error) throw error;
}

export async function actualizarEstacionamiento(
  uuid: string,
  datos: {
    codigo?: string;
    tipo?: TipoEstacionamientoDB;
    /** Sin tocar si no viene; una cochera de antes puede seguir sin nivel. */
    nivelId?: string | null;
    ubicacion?: string;
    unidadId?: string | null;
  },
) {
  const { error } = await supabase
    .from("estacionamiento")
    .update({
      codigo: datos.codigo,
      tipo: datos.tipo,
      nivel_id: datos.nivelId === undefined ? undefined : datos.nivelId || null,
      ubicacion: datos.ubicacion,
      unidad_id: datos.unidadId,
    })
    .eq("id", uuid);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Niveles de estacionamiento (16/11/2026)
// ---------------------------------------------------------------------------

export interface DatosNivel {
  nombre: string;
  nomenclatura: string;
  /** Primero la torre, después el sótano (17/11/2026). */
  torreId?: string | null;
}

/** Crea uno o varios («Crear los sugeridos»), al final del orden. */
export async function crearNiveles(condominioId: string, niveles: DatosNivel[]) {
  if (!niveles.length) return;
  const { data: hay, error: errorHay } = await supabase
    .from("nivel_estacionamiento")
    .select("orden")
    .eq("condominio_id", condominioId);
  if (errorHay) throw errorHay;
  let orden = Math.max(0, ...(hay ?? []).map((n) => n.orden));
  const { error } = await supabase.from("nivel_estacionamiento").insert(
    niveles.map((n) => ({
      condominio_id: condominioId,
      nombre: n.nombre.trim(),
      nomenclatura: n.nomenclatura,
      orden: (orden += 1),
      torre_id: n.torreId ?? null,
    })),
  );
  if (error?.code === "23505") {
    throw new Error("Ya hay un nivel con esa nomenclatura en el edificio.");
  }
  if (error) throw error;
}

export async function actualizarNivel(uuid: string, datos: DatosNivel) {
  const { error } = await supabase
    .from("nivel_estacionamiento")
    .update({
      nombre: datos.nombre.trim(),
      nomenclatura: datos.nomenclatura,
      ...(datos.torreId === undefined ? {} : { torre_id: datos.torreId }),
    })
    .eq("id", uuid);
  if (error?.code === "23505") {
    throw new Error("Ya hay un nivel con esa nomenclatura en el edificio.");
  }
  if (error) throw error;
}

/** Un nivel con estacionamientos no se quita: se dice cuántos tiene. */
export async function eliminarNivel(uuid: string) {
  const { count, error: errorConteo } = await supabase
    .from("estacionamiento")
    .select("id", { count: "exact", head: true })
    .eq("nivel_id", uuid);
  if (errorConteo) throw errorConteo;
  if ((count ?? 0) > 0) {
    throw new Error(
      `Este nivel tiene ${count} ${count === 1 ? "estacionamiento" : "estacionamientos"}. Muévelos o elimínalos antes.`,
    );
  }
  const { data, error } = await supabase
    .from("nivel_estacionamiento")
    .delete()
    .eq("id", uuid)
    .select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("No tienes permiso para quitar ese nivel.");
}

export async function eliminarEstacionamiento(uuid: string) {
  // Ocupada no se borra: quien está dentro se queda sin sitio registrado, y
  // el borrado arrastra el historial de asignaciones.
  const { count, error: errorConteo } = await supabase
    .from("asignacion_estacionamiento")
    .select("id", { count: "exact", head: true })
    .eq("estacionamiento_id", uuid)
    .is("liberado_en", null);
  if (errorConteo) throw errorConteo;
  if ((count ?? 0) > 0) {
    throw new Error("Esa cochera está ocupada ahora. Libérala antes de eliminarla.");
  }

  const { error } = await supabase
    .from("estacionamiento")
    .delete()
    .eq("id", uuid);
  if (error) throw error;
}

/**
 * Asigna un lugar de visita. El índice único parcial de la base impide que dos
 * visitas ocupen el mismo lugar a la vez, cosa que el mapa en memoria del
 * prototipo no podía garantizar.
 */
export async function asignarEstacionamiento(
  estacionamientoUuid: string,
  visitaUuid: string,
) {
  const { error } = await supabase.from("asignacion_estacionamiento").insert({
    estacionamiento_id: estacionamientoUuid,
    visita_id: visitaUuid,
  });
  if (error) throw error;
}

export async function liberarEstacionamiento(estacionamientoUuid: string) {
  const { error } = await supabase
    .from("asignacion_estacionamiento")
    .update({ liberado_en: haciaLaBase(ahora()) })
    .eq("estacionamiento_id", estacionamientoUuid)
    .is("liberado_en", null);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Tipologias y personal de porteria
// ---------------------------------------------------------------------------
// No estaban aqui porque la pantalla de Arquitectura no las edita, pero el
// store las servia desde `adminMockData` y las leen el directorio, el
// alojamiento del huesped y el perfil del guardia.

export async function obtenerTipologias(condominioId: string) {
  const { data, error } = await supabase
    .from("tipologia")
    .select("id, nombre, metros_cuadrados, habitaciones, banos")
    .eq("condominio_id", condominioId)
    .order("nombre");

  if (error) throw error;

  return (data ?? []).map((f) => ({
    uuid: f.id,
    id: idNumerico(f.id),
    nombre: f.nombre,
    metrosCuadrados: Number(f.metros_cuadrados ?? 0),
    habitaciones: f.habitaciones ?? 0,
    banos: f.banos ?? 0,
  }));
}

/** Lo que se escribe de una tipología. Vacío = no se dice. */
export interface DatosTipologia {
  nombre: string;
  habitaciones: number | null;
  banos: number | null;
  metrosCuadrados: number | null;
}

/*
  Las tipologías se leían y nadie las podía crear (16/10/2026): el edificio
  sembrado tenía una, «2 ambientes», y cualquier otro ninguna.
*/
export async function crearTipologia(condominioId: string, datos: DatosTipologia) {
  const { error } = await supabase.from("tipologia").insert({
    condominio_id: condominioId,
    nombre: datos.nombre.trim(),
    habitaciones: datos.habitaciones,
    banos: datos.banos,
    metros_cuadrados: datos.metrosCuadrados,
  });
  if (error) throw error;
}

export async function actualizarTipologia(uuid: string, datos: DatosTipologia) {
  const { error } = await supabase
    .from("tipologia")
    .update({
      nombre: datos.nombre.trim(),
      habitaciones: datos.habitaciones,
      banos: datos.banos,
      metros_cuadrados: datos.metrosCuadrados,
    })
    .eq("id", uuid);
  if (error) throw error;
}

/** Las viviendas que la tenían se quedan sin tipología (`on delete set null`). */
export async function eliminarTipologia(uuid: string) {
  const { error } = await supabase.from("tipologia").delete().eq("id", uuid);
  if (error) throw error;
}

const DIAS_SEMANA = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

/**
 * Los guardias no son una tabla aparte: son membresias de condominio con rol
 * 'guardia'. En el prototipo eran dos personas fijas ("Roberto Hornado" y
 * "Juan Franco") con cedula y correo inventados, y la garita era texto libre.
 */
export async function obtenerGuardias(condominioId: string) {
  const { data, error } = await supabase
    .from("membresia_condominio")
    .select(
      `id, nombre, telefono,
       porteria:porteria_id ( nombre ),
       turnos:turno_guardia ( dia_semana, hora_inicio, hora_fin )`,
    )
    .eq("condominio_id", condominioId)
    .eq("rol", "guardia")
    .eq("activo", true)
    .order("nombre");

  if (error) throw error;

  const hhmm = (h: string | null) => (h ? h.slice(0, 5) : "");

  return (data ?? []).map((f) => ({
    uuid: f.id,
    id: idNumerico(f.id),
    nombre: f.nombre ?? "",
    telefono: f.telefono ?? "",
    garita: f.porteria?.nombre ?? "",
    turnos: [...(f.turnos ?? [])]
      .sort((a, b) => a.dia_semana - b.dia_semana)
      .map((t) => ({
        dia: DIAS_SEMANA[t.dia_semana] ?? "",
        horaInicio: hhmm(t.hora_inicio),
        horaFin: hhmm(t.hora_fin),
      })),
  }));
}

/**
 * Quien responde por cada unidad: propietario, anfitrion primario y admin
 * primario, con su telefono.
 *
 * El directorio los mostraba fijos -- "Juan Lopez", "Maria Perez" y "Carlos
 * Gomez" con tres telefonos peruanos -- en TODAS las unidades, asi que la
 * pantalla de contactos de la administracion no servia para llamar a nadie.
 *
 * Solo lo lee el personal del condominio: la politica de `membresia_unidad`
 * ya lo impone.
 */
export async function obtenerContactosPorUnidad(condominioId: string) {
  const { data, error } = await supabase
    .from("membresia_unidad")
    .select(
      `unidad_id, usuario_id, nombre, telefono, rol,
       es_anfitrion_primario, es_admin_primario,
       unidad:unidad_id ( condominio_id )`,
    )
    .eq("activo", true);

  if (error) throw error;

  // El nombre completo sale del perfil de quien tiene cuenta (10/11/2026: la
  // lista decía «Xander» y el detalle «Xander Montes»); el de la membresía es
  // lo que se escribió al invitarlo, a veces solo el nombre de pila.
  const ids = [...new Set((data ?? []).map((f) => f.usuario_id).filter((id): id is string => Boolean(id)))];
  const completos = new Map<string, string>();
  if (ids.length) {
    const perfiles = await supabase.from("perfil").select("id, nombre, apellido").in("id", ids);
    if (perfiles.error) throw perfiles.error;
    for (const p of perfiles.data ?? []) {
      const completo = [p.nombre, p.apellido].filter(Boolean).join(" ").trim();
      if (completo) completos.set(p.id, completo);
    }
  }

  const vacio = { nombre: "Sin asignar", telefono: "" };
  const porUnidad: Record<
    string,
    {
      propietario: typeof vacio;
      anfitrion: typeof vacio;
      administrador: typeof vacio;
      /** Todas, con su rol: propietarios, copropietarios, residentes, huéspedes... */
      personas: { nombre: string; rol: string }[];
    }
  > = {};

  for (const f of data ?? []) {
    if (f.unidad?.condominio_id !== condominioId) continue;
    const actual = (porUnidad[f.unidad_id] ??= {
      propietario: { ...vacio },
      anfitrion: { ...vacio },
      administrador: { ...vacio },
      personas: [],
    });
    const nombre = (f.usuario_id ? completos.get(f.usuario_id) : undefined) ?? f.nombre ?? "";
    const contacto = { nombre, telefono: f.telefono ?? "" };
    if (nombre) actual.personas.push({ nombre, rol: f.rol });
    // El primero que aparezca; los demás son copropietarios y salen en `personas`.
    if (f.rol === "propietario" && actual.propietario.nombre === vacio.nombre) actual.propietario = contacto;
    if (f.es_anfitrion_primario) actual.anfitrion = contacto;
    if (f.es_admin_primario) actual.administrador = contacto;
  }

  return porUnidad;
}

/**
 * El propietario de cada departamento de una torre, para la lista (29/10/2026).
 * La fila decía siempre «Sin propietario»: leía un campo que nadie llenaba.
 */
export async function propietariosDeLaTorre(torreId: string): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from("membresia_unidad")
    .select("unidad_id, nombre, unidad:unidad_id!inner ( torre_id )")
    .eq("rol", "propietario")
    .eq("activo", true)
    .eq("unidad.torre_id", torreId);
  if (error) throw error;
  const porUnidad: Record<string, string> = {};
  for (const fila of data ?? []) {
    porUnidad[fila.unidad_id] = porUnidad[fila.unidad_id]
      ? `${porUnidad[fila.unidad_id]}, ${fila.nombre}`
      : fila.nombre;
  }
  return porUnidad;
}
