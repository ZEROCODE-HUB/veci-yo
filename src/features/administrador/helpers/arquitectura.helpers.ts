/**
 * Las cuentas de la arquitectura que se pueden hacer sin la base (16/11/2026):
 * qué departamentos salen de una torre, qué códigos llevan los
 * estacionamientos de un nivel, qué niveles sugerir y qué garitas faltan.
 *
 * Puras a propósito: la vista previa del formulario y el guardado usan la
 * misma función, así que lo que se promete en pantalla es lo que se crea.
 */

// ---------------------------------------------------------------------------
// Departamentos de una torre
// ---------------------------------------------------------------------------

/** `numero`: 501, 502, 503… · `letra`: 5A, 5B, 5C… */
export type Numeracion = "numero" | "letra";

export interface PedidoDeTorre {
  desde: string | number;
  hasta: string | number;
  porPiso: string | number;
  numeracion: Numeracion;
}

export interface ViviendaPlaneada {
  codigo: string;
  piso: number;
}

const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const vacio = (v: string | number) => `${v}`.trim() === "";

/**
 * Los departamentos que salen de «del piso X al Y, N por piso».
 *
 * El cliente (16/11/2026): «pone 3 departamentos del piso 5 al 7, ah entonces
 * se van a crear 9». Antes se pedía un rango de códigos («101 a 105») y el
 * piso se sacaba dividiendo el código entre 100, que con letras (5A) no
 * funciona y con un rango largo creaba «150» en el piso 1. Ahora cada
 * departamento sale con su piso escrito.
 *
 * Todo vacío es válido: una torre se puede crear sin departamentos. Lo que no
 * vale es escribir algo y que no genere nada sin decir por qué.
 */
export function planDeTorre(
  pedido: PedidoDeTorre,
  tope: number,
  /** `torre_viviendas_por_piso_maximo` (17/11/2026). */
  topePorPiso = 99,
): { viviendas: ViviendaPlaneada[]; motivo: string } {
  const { desde, hasta, porPiso, numeracion } = pedido;
  if (vacio(desde) && vacio(hasta) && vacio(porPiso)) return { viviendas: [], motivo: "" };

  const inicio = Number(desde);
  const fin = Number(hasta);
  const cuantos = Number(porPiso);
  if (vacio(desde) || vacio(hasta) || vacio(porPiso)) {
    return { viviendas: [], motivo: "Completa los tres datos: desde qué piso, hasta qué piso y cuántos por piso." };
  }
  if (![inicio, fin, cuantos].every(Number.isInteger) || inicio < 1 || cuantos < 1) {
    return { viviendas: [], motivo: "Los pisos y la cantidad van con números enteros, desde 1." };
  }
  if (fin < inicio) {
    return { viviendas: [], motivo: "El último piso no puede ser menor que el primero." };
  }
  const maximoPorPiso = Math.min(numeracion === "letra" ? LETRAS.length : 99, topePorPiso);
  if (cuantos > maximoPorPiso) {
    return {
      viviendas: [],
      motivo:
        maximoPorPiso === topePorPiso
          ? `Caben ${topePorPiso} departamentos por piso como mucho.`
          : `Con letras caben ${LETRAS.length} por piso (de la A a la Z).`,
    };
  }
  const total = (fin - inicio + 1) * cuantos;
  if (total > tope) {
    return {
      viviendas: [],
      motivo: `Son demasiados departamentos de una vez (${total}; máximo ${tope}). Revisa los pisos.`,
    };
  }

  const viviendas: ViviendaPlaneada[] = [];
  for (let piso = inicio; piso <= fin; piso++) {
    for (let n = 1; n <= cuantos; n++) {
      const puerta = numeracion === "letra" ? LETRAS[n - 1] : String(n).padStart(2, "0");
      viviendas.push({ codigo: `${piso}${puerta}`, piso });
    }
  }
  return { viviendas, motivo: "" };
}

/**
 * «Se crearán 9 departamentos: pisos 5 a 7, 3 por piso (501–503, 601–603,
 * 701–703)». Con muchos pisos se recorta el medio con «…».
 */
export function resumenDeTorre(viviendas: ViviendaPlaneada[]): string {
  if (!viviendas.length) return "";
  const porPiso = new Map<number, string[]>();
  for (const v of viviendas) porPiso.set(v.piso, [...(porPiso.get(v.piso) ?? []), v.codigo]);
  const pisos = [...porPiso.keys()];
  const cuantos = porPiso.get(pisos[0])?.length ?? 0;
  const tramo = (piso: number) => {
    const codigos = porPiso.get(piso) ?? [];
    return codigos.length > 1 ? `${codigos[0]}–${codigos[codigos.length - 1]}` : codigos[0];
  };
  const tramos =
    pisos.length > 4
      ? [tramo(pisos[0]), tramo(pisos[1]), "…", tramo(pisos[pisos.length - 1])]
      : pisos.map(tramo);
  const deLosPisos =
    pisos.length === 1 ? `piso ${pisos[0]}` : `pisos ${pisos[0]} a ${pisos[pisos.length - 1]}`;
  const palabra = viviendas.length === 1 ? "departamento" : "departamentos";
  return `Se crearán ${viviendas.length} ${palabra}: ${deLosPisos}, ${cuantos} por piso (${tramos.join(", ")})`;
}

// ---------------------------------------------------------------------------
// Estacionamientos por nivel
// ---------------------------------------------------------------------------

/** Mayúsculas, sin espacios ni guiones: es lo que acepta la base. */
export function limpiarNomenclatura(texto: string): string {
  return texto.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * El número más alto ya usado con ese prefijo: «S1-07» → 7 para privados,
 * «S1-V03» → 3 para los de visita. Lo que no sigue la forma no cuenta.
 */
function ultimoNumero(prefijo: string, existentes: Iterable<string>): number {
  const forma = new RegExp(`^${escapar(prefijo)}(\\d+)$`);
  let maximo = 0;
  for (const codigo of existentes) {
    const n = Number(forma.exec(codigo)?.[1] ?? 0);
    if (n > maximo) maximo = n;
  }
  return maximo;
}

const prefijoDe = (nomenclatura: string, tipo: "privado" | "visitante") =>
  tipo === "privado" ? `${nomenclatura}-` : `${nomenclatura}-V`;

/**
 * Los próximos `cuantos` códigos de un nivel, siguiendo la numeración que ya
 * haya: con S1-01…S1-20 creados, los siguientes son S1-21… (el cliente: «la
 * nomenclatura del nivel»). Los privados van «S1-01», los de visita «S1-V01».
 */
export function siguientesCodigos(
  nomenclatura: string,
  tipo: "privado" | "visitante",
  cuantos: number,
  existentes: Iterable<string>,
): string[] {
  const usados = new Set(existentes);
  const prefijo = prefijoDe(nomenclatura, tipo);
  let n = ultimoNumero(prefijo, usados);
  const codigos: string[] = [];
  while (codigos.length < cuantos) {
    n += 1;
    const codigo = `${prefijo}${String(n).padStart(2, "0")}`;
    if (usados.has(codigo)) continue;
    usados.add(codigo);
    codigos.push(codigo);
  }
  return codigos;
}

export interface PedidoDeNivel {
  nombre: string;
  nomenclatura: string;
  privados: number;
  visita: number;
}

export interface NivelPlaneado extends PedidoDeNivel {
  codigosPrivados: string[];
  codigosVisita: string[];
}

/**
 * Los códigos de cada fila «Nivel · privados · de visita». Las filas en cero
 * no generan nada; dos filas con el mismo nivel siguen la numeración una de
 * otra en vez de chocar.
 */
export function planDeEstacionamientos(
  filas: PedidoDeNivel[],
  existentes: Iterable<string>,
): NivelPlaneado[] {
  const usados = new Set(existentes);
  const plan: NivelPlaneado[] = [];
  for (const fila of filas) {
    if (fila.privados <= 0 && fila.visita <= 0) continue;
    const codigosPrivados = siguientesCodigos(fila.nomenclatura, "privado", fila.privados, usados);
    codigosPrivados.forEach((c) => usados.add(c));
    const codigosVisita = siguientesCodigos(fila.nomenclatura, "visitante", fila.visita, usados);
    codigosVisita.forEach((c) => usados.add(c));
    plan.push({ ...fila, codigosPrivados, codigosVisita });
  }
  return plan;
}

const rango = (codigos: string[]) =>
  codigos.length > 1 ? `${codigos[0]} a ${codigos[codigos.length - 1]}` : codigos[0];

/** «Se crearán 20 estacionamientos: S1-01 a S1-20, S1-V01 a S1-V05». */
export function resumenDeEstacionamientos(plan: NivelPlaneado[]): string {
  const total = plan.reduce((s, n) => s + n.codigosPrivados.length + n.codigosVisita.length, 0);
  if (!total) return "";
  const tramos = plan.flatMap((n) =>
    [n.codigosPrivados, n.codigosVisita].filter((c) => c.length).map(rango),
  );
  const palabra = total === 1 ? "estacionamiento" : "estacionamientos";
  return `Se crearán ${total} ${palabra}: ${tramos.join(", ")}`;
}

/**
 * «Crear los sugeridos»: Sótano 1…N y Primer piso, sin repetir lo que ya hay.
 * N son los sótanos de la torre que más tiene.
 */
export function nivelesSugeridos(
  sotanos: number,
  existentes: Array<{ nomenclatura: string }>,
): Array<{ nombre: string; nomenclatura: string; orden: number }> {
  const ya = new Set(existentes.map((e) => e.nomenclatura));
  const n = Number.isInteger(sotanos) && sotanos > 0 ? Math.min(sotanos, 20) : 0;
  const todos = [
    ...Array.from({ length: n }, (_, i) => ({
      nombre: `Sótano ${i + 1}`,
      nomenclatura: `S${i + 1}`,
      orden: i + 1,
    })),
    { nombre: "Primer piso", nomenclatura: "P1", orden: n + 1 },
  ];
  return todos.filter((t) => !ya.has(t.nomenclatura));
}

/**
 * Las filas «Nivel · privados · de visita» del alta de una torre: los niveles
 * que ya hay, los sugeridos que faltan y los escritos a mano, sin repetir
 * nomenclatura. `nuevo` dice cuáles se crearán al guardar.
 */
export function nivelesDelAlta(
  existentes: Array<{ nombre: string; nomenclatura: string }>,
  sotanos: number,
  escritos: Array<{ nombre: string; nomenclatura: string }>,
): Array<{ nombre: string; nomenclatura: string; nuevo: boolean }> {
  const filas = existentes.map((n) => ({ nombre: n.nombre, nomenclatura: n.nomenclatura, nuevo: false }));
  const ya = new Set(filas.map((f) => f.nomenclatura));
  for (const n of [...nivelesSugeridos(sotanos, existentes), ...escritos]) {
    if (!n.nomenclatura || ya.has(n.nomenclatura)) continue;
    ya.add(n.nomenclatura);
    filas.push({ nombre: n.nombre, nomenclatura: n.nomenclatura, nuevo: true });
  }
  return filas;
}

/** Las filas con sus cantidades, como las pide `crearTorre`. */
export function pedidoDeCocheras(
  filas: Array<{ nombre: string; nomenclatura: string }>,
  cantidades: Record<string, { privados: string; visita: string }>,
): PedidoDeNivel[] {
  return filas.map((f) => ({
    nombre: f.nombre,
    nomenclatura: f.nomenclatura,
    privados: Number(cantidades[f.nomenclatura]?.privados || 0),
    visita: Number(cantidades[f.nomenclatura]?.visita || 0),
  }));
}

/** «S1-03 · Sótano 1», o solo el código si no tiene nivel. */
export function codigoConNivel(codigo: string, nivel?: string | null): string {
  return nivel ? `${codigo} · ${nivel}` : codigo;
}

// ---------------------------------------------------------------------------
// Garitas
// ---------------------------------------------------------------------------

/**
 * Los dos modelos del cliente (16/11/2026): «Hay 1 garita principal y luego
 * las torres tienen garitas, o solo hay una garita principal y una
 * vehicular».
 */
export type ModeloDeGaritas = "por_torre" | "vehicular";

export type TipoDeGarita = "entrada_principal" | "acceso_vehicular" | "garita_torre";

export interface GaritaQueFalta {
  clave: string;
  nombre: string;
  tipo: TipoDeGarita;
  torreId: string | null;
}

/** Las garitas que el modelo pide y el edificio todavía no tiene. */
export function garitasQueFaltan(
  modelo: ModeloDeGaritas,
  torres: Array<{ uuid?: string; numero: number; nombre: string }>,
  porterias: Array<{ tipo: string; torreId?: string | null }>,
): GaritaQueFalta[] {
  const faltan: GaritaQueFalta[] = [];
  if (!porterias.some((p) => p.tipo === "entrada_principal")) {
    faltan.push({ clave: "principal", nombre: "Garita principal", tipo: "entrada_principal", torreId: null });
  }
  if (modelo === "vehicular") {
    if (!porterias.some((p) => p.tipo === "acceso_vehicular")) {
      faltan.push({ clave: "vehicular", nombre: "Garita vehicular", tipo: "acceso_vehicular", torreId: null });
    }
    return faltan;
  }
  for (const torre of torres) {
    if (!torre.uuid) continue;
    const tiene = porterias.some((p) => p.tipo === "garita_torre" && p.torreId === torre.uuid);
    if (tiene) continue;
    const nombreTorre = torre.nombre?.trim() || `Torre ${torre.numero}`;
    faltan.push({
      clave: `torre:${torre.uuid}`,
      nombre: `Garita ${nombreTorre}`,
      tipo: "garita_torre",
      torreId: torre.uuid,
    });
  }
  return faltan;
}
