import { supabase } from "@/shared/services/supabase";
import { paisPorDefecto } from "@/shared/constants";
import type { Fila } from "@/shared/types";
import type {
  Deposito,
  Porteria,
  Torre,
  Unidad,
} from "@/stores/admin-store";
import type { Database } from "@/shared/types/database.types";

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

export interface Arquitectura {
  torres: Torre[];
  unidades: Unidad[];
  depositos: Deposito[];
  porterias: Porteria[];
  estacionamientos: Array<{
    uuid: string;
    codigo: string;
    ubicacion: string;
    tipo: TipoEstacionamientoDB;
    unidadId: string | null;
    torreNumero: number | null;
    ocupado: boolean;
  }>;
}

export async function obtenerArquitectura(): Promise<Arquitectura> {
  const [torres, unidades, depositos, porterias, estacionamientos] =
    await Promise.all([
      supabase.from("torre").select("*").is("deleted_at", null).order("numero"),
      supabase
        .from("unidad")
        .select("id, codigo, piso, estado, tipologia_id, torre:torre_id ( id, numero )")
        .is("deleted_at", null)
        .order("codigo"),
      supabase
        .from("deposito")
        .select("id, codigo, ubicacion, unidad_id, torre:torre_id ( numero ), unidad:unidad_id ( codigo )")
        .order("codigo"),
      supabase.from("porteria").select("*").is("deleted_at", null).order("nombre"),
      supabase
        .from("estacionamiento")
        /*
          En una sola pieza y no concatenando: Supabase deduce el tipo de la
          respuesta **del literal** del `select`, asi que partido en dos cadenas
          devolvia `GenericStringError` y el mapeo de abajo tenia que ir con
          `any` para compilar.
        */
        .select(
          `id, codigo, ubicacion, tipo, unidad_id,
           torre:torre_id ( numero ),
           asignaciones:asignacion_estacionamiento ( liberado_en )`,
        )
        .order("codigo"),
    ]);

  for (const r of [torres, unidades, depositos, porterias, estacionamientos]) {
    if (r.error) throw r.error;
  }

  return {
    torres: (torres.data ?? []).map(mapearTorre),
    unidades: (unidades.data ?? []).map((f) => ({
      uuid: f.id,
      id: idNumerico(f.id),
      codigo: f.codigo,
      torreNumero: f.torre?.numero ?? 0,
      torreId: f.torre?.id,
      piso: f.piso,
      tipologiaId: f.tipologia_id ?? undefined,
      estado: f.estado,
    })) as Unidad[],
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
    })) as unknown as Porteria[],
    estacionamientos: (estacionamientos.data ?? []).map((f) => ({
      uuid: f.id,
      codigo: f.codigo,
      ubicacion: f.ubicacion ?? "",
      tipo: f.tipo,
      unidadId: f.unidad_id,
      torreNumero: f.torre?.numero ?? null,
      // Ocupado = tiene una asignacion sin liberar.
      ocupado: (f.asignaciones ?? []).some((a) => a.liberado_en === null),
    })),
  };
}

// ---------------------------------------------------------------------------
// Torres
// ---------------------------------------------------------------------------

/**
 * Las dos reglas con que se genera una torre. Las pone la base y las pasa
 * quien llama: eran un 500 y un 100 escritos aquí.
 */
export interface ReglasDeTorre {
  /** Cuántas viviendas se generan como mucho de una vez (`torre_viviendas_maximo`). */
  viviendasMaximo: number;
  /** Entre cuánto se divide el código para sacar el piso (`torre_divisor_piso`). */
  divisorPiso: number;
}

export async function crearTorre(
  condominioId: string,
  datos: Partial<Torre>,
  reglas: ReglasDeTorre,
) {
  /*
    Antes de crear nada, se mira si las viviendas caben.

    La torre se insertaba primero y las viviendas después. El código de una
    vivienda es único en todo el condominio, no por torre, así que «Torre B,
    101 a 110» con la Torre A ya numerada así dejaba **la torre creada y sin
    viviendas**, un «no se pudo guardar», y otra torre igual al reintentar
    (13/10/2026). Las dadas de baja cuentan: su código sigue ocupado.
  */
  const pedido = rangoPedido(
    datos.nomenclaturaDesde,
    datos.nomenclaturaHasta,
    reglas.viviendasMaximo,
  );
  if (pedido.motivo) throw new Error(pedido.motivo);
  if (pedido.codigos.length > 0) {
    const { data: ocupados, error: errorOcupados } = await supabase
      .from("unidad")
      .select("codigo")
      .eq("condominio_id", condominioId)
      .in("codigo", pedido.codigos.map(String));
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
        }). Elige otra numeración.`,
      );
    }
  }

  // El numero es correlativo dentro del condominio; lo calcula la base al leer
  // el maximo actual, no el cliente.
  const { data: ultimas } = await supabase
    .from("torre")
    .select("numero")
    .eq("condominio_id", condominioId)
    .order("numero", { ascending: false })
    .limit(1);

  const siguiente = (ultimas?.[0]?.numero ?? 0) + 1;

  const { data: creada, error } = await supabase
    .from("torre")
    .insert({
      ...torreHaciaFila(datos),
      condominio_id: condominioId,
      numero: siguiente,
      nombre: datos.nombre || `Torre ${siguiente}`,
    })
    .select("id")
    .single();
  if (error) throw error;

  /*
    Y ahora se construye lo que el formulario promete.

    Hasta el 02/10/2026 el alta pedia tres cosas que no producian nada: el
    rango de numeracion --con una vista previa que decia «Se generaran 5
    unidades: 101 a 105»--, las cocheras de visita y los almacenes. Se
    guardaban como numeros en la torre y ahi se quedaban: la Torre 3 declaraba
    diez cocheras y existia **una** plaza de visitante en todo el edificio, sin
    torre. Los dos numeros no se hablaban (R-35).

    La consecuencia se discute en la puerta: la administracion escribe diez y
    las ve en su pantalla; la porteria solo puede asignar las que existan.

    Se generan **solo al crear**, nunca al editar. Reconciliar un numero con
    filas que ya existen es destructivo --bajar de diez a cinco tendria que
    borrar cinco plazas, quiza asignadas-- y nadie pidio eso. Al editar, los
    numeros no vuelven a generar nada y lo que vale son las filas.
  */
  await generarEstructuraDeTorre(condominioId, creada.id, datos, reglas);
}

/**
 * Los codigos de vivienda que salen de un rango.
 *
 * Llegan como texto porque el formulario los recoge en dos `Input`. Un rango
 * vacio, al reves o no numerico no genera nada: no se adivina.
 */
/**
 * El rango que se pidió, o por qué no vale.
 *
 * Vacío es válido: una torre se puede crear sin viviendas. Lo que no puede
 * es **escribirse un rango y que no genere nada sin decirlo**: más del tope
 * se ignoraba en silencio mientras la pantalla decía «Se generarán 10000».
 *
 * El tope es `torre_viviendas_maximo` (hoy 500), y lo pasa quien llama.
 */
export function rangoPedido(
  desde: string | null | undefined,
  hasta: string | null | undefined,
  tope: number,
): { codigos: number[]; motivo: string } {
  const sinDesde = desde === undefined || desde === null || `${desde}`.trim() === "";
  const sinHasta = hasta === undefined || hasta === null || `${hasta}`.trim() === "";
  if (sinDesde && sinHasta) return { codigos: [], motivo: "" };

  const inicio = Number(desde);
  const fin = Number(hasta);
  if (!Number.isInteger(inicio) || !Number.isInteger(fin) || inicio <= 0) {
    return { codigos: [], motivo: "La numeración va con números enteros: desde y hasta." };
  }
  if (fin < inicio) {
    return { codigos: [], motivo: "La numeración termina antes de empezar." };
  }
  if (fin - inicio + 1 > tope) {
    return {
      codigos: [],
      motivo: `Son demasiadas viviendas de una vez (máximo ${tope}). Revisa la numeración.`,
    };
  }
  return { codigos: unidadesDelRango(desde, hasta, tope), motivo: "" };
}

function unidadesDelRango(
  desde: string | null | undefined,
  hasta: string | null | undefined,
  tope: number,
) {
  const inicio = Number(desde);
  const fin = Number(hasta);
  if (!Number.isInteger(inicio) || !Number.isInteger(fin)) return [];
  if (inicio <= 0 || fin < inicio) return [];

  /*
    Un tope, porque esto lo teclea una persona: «101» y «10100» por un cero de
    mas serian diez mil viviendas insertadas de golpe y sin vuelta atras.
  */
  if (fin - inicio + 1 > tope) return [];

  return Array.from({ length: fin - inicio + 1 }, (_, i) => inicio + i);
}

/**
 * El piso al que pertenece un codigo de vivienda.
 *
 * Con el divisor de hoy (100, `torre_divisor_piso`): `101` es el primero,
 * `205` el segundo, `1203` el doceavo: las dos ultimas cifras son la puerta y
 * lo de delante el piso. Un edificio con tres cifras de puerta pone 1000.
 *
 * Un codigo menor que el divisor no tiene piso que deducir, y entonces es el
 * primero: mas vale un piso 1 discutible que un piso 0, que no existe.
 */
function pisoDelCodigo(codigo: number, divisor: number): number {
  return Math.max(1, Math.floor(codigo / divisor));
}

/**
 * Crea las viviendas y las cocheras de visita que declara una torre nueva.
 *
 * Los fallos no tumban el alta: la torre ya existe y es lo que se pidio. Si
 * algo de esto falla, se lanza para que la pantalla lo diga, pero despues de
 * haber dejado la torre creada.
 */
async function generarEstructuraDeTorre(
  condominioId: string,
  torreId: string,
  datos: Partial<Torre>,
  reglas: ReglasDeTorre,
) {
  const codigos = unidadesDelRango(
    datos.nomenclaturaDesde,
    datos.nomenclaturaHasta,
    reglas.viviendasMaximo,
  );

  if (codigos.length > 0) {
    const { error } = await supabase.from("unidad").insert(
      codigos.map((codigo) => ({
        condominio_id: condominioId,
        torre_id: torreId,
        codigo: String(codigo),
        piso: pisoDelCodigo(codigo, reglas.divisorPiso),
      })),
    );
    if (error) throw error;
  }

  await completarCocheras(condominioId, torreId, datos);
}

/**
 * Crea las cocheras que la torre declara y todavía no existen (29/10/2026).
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
    .update({ deleted_at: new Date().toISOString() })
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
  datos: { torreId: string; codigo: string; piso: number; tipologiaId?: string },
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
  },
) {
  const { error } = await supabase
    .from("unidad")
    .update({
      codigo: datos.codigo,
      piso: datos.piso,
      estado: datos.estado,
      tipologia_id: datos.tipologiaId,
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
    .update({ deleted_at: new Date().toISOString() })
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
}

export async function crearPorteria(
  condominioId: string,
  datos: DatosPorteria & { nombre: string; tipo: TipoPorteriaDB },
) {
  const { error } = await supabase.from("porteria").insert({
    condominio_id: condominioId,
    nombre: datos.nombre,
    tipo: datos.tipo,
    ubicacion: datos.ubicacion || null,
    telefono: datos.telefono || null,
    codigo_pais: datos.codigoPais || null,
  });
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
  if (datos.tipo !== undefined) fila.tipo = datos.tipo;
  if (datos.ubicacion !== undefined) fila.ubicacion = datos.ubicacion || null;
  if (datos.telefono !== undefined) fila.telefono = datos.telefono || null;
  if (datos.codigoPais !== undefined) fila.codigo_pais = datos.codigoPais || null;

  const { error } = await supabase.from("porteria").update(fila).eq("id", uuid);
  if (error) throw error;
}

export async function eliminarPorteria(uuid: string) {
  const { error } = await supabase
    .from("porteria")
    .update({ deleted_at: new Date().toISOString() })
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
    ubicacion?: string;
    unidadId?: string;
  },
) {
  const { error } = await supabase.from("estacionamiento").insert({
    condominio_id: condominioId,
    codigo: datos.codigo,
    tipo: datos.tipo,
    torre_id: datos.torreId ?? null,
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
    ubicacion?: string;
    unidadId?: string | null;
  },
) {
  const { error } = await supabase
    .from("estacionamiento")
    .update({
      codigo: datos.codigo,
      tipo: datos.tipo,
      ubicacion: datos.ubicacion,
      unidad_id: datos.unidadId,
    })
    .eq("id", uuid);
  if (error) throw error;
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
    .update({ liberado_en: new Date().toISOString() })
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
      `unidad_id, nombre, telefono, rol,
       es_anfitrion_primario, es_admin_primario,
       unidad:unidad_id ( condominio_id )`,
    )
    .eq("activo", true);

  if (error) throw error;

  const vacio = { nombre: "Sin asignar", telefono: "" };
  const porUnidad: Record<
    string,
    { propietario: typeof vacio; anfitrion: typeof vacio; administrador: typeof vacio }
  > = {};

  for (const f of data ?? []) {
    if (f.unidad?.condominio_id !== condominioId) continue;
    const actual = (porUnidad[f.unidad_id] ??= {
      propietario: { ...vacio },
      anfitrion: { ...vacio },
      administrador: { ...vacio },
    });
    const contacto = { nombre: f.nombre ?? "", telefono: f.telefono ?? "" };
    if (f.rol === "propietario") actual.propietario = contacto;
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
