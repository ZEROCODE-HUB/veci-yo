/**
 * El resultado de una encuesta, tal como lo calcula la base
 * (`resultado_de_encuesta`, 17/11/2026), y lo que la pantalla dice de él.
 *
 * El celular no cuenta votos ni decide si algo se aprueba: lee lo que la base
 * devuelve y lo pone en palabras y en una barra. Si lo contara aquí, cada
 * teléfono con una versión distinta podría decir un resultado distinto.
 */

export type QuienVota = "vivienda" | "residente";
export type ComoSeCuenta = "igual" | "indice";
export type ReglaDeAprobacion = "mayoria" | "umbral";

export interface OpcionDelResultado {
  id: string;
  etiqueta: string;
  /** Votantes que la eligieron. Null si los resultados están ocultos. */
  votos: number | null;
  /** Lo que pesan esos votos (1 cada uno, o el índice de la vivienda). */
  peso: number | null;
  esAbstencion: boolean;
}

export interface ResultadoDeEncuesta {
  quienVota: QuienVota;
  comoSeCuenta: ComoSeCuenta;
  regla: ReglaDeAprobacion;
  /** El % del umbral, si la regla es «umbral». */
  umbralPorcentaje: number | null;
  cerrada: boolean;
  /** Si se pueden enseñar los números por opción. */
  visibles: boolean;
  /** Viviendas del edificio, o residentes con derecho a voto. */
  electores: number;
  /** Lo que suma todo: electores, o el índice total del edificio. */
  totalPosible: number;
  participantes: number;
  pesoEmitido: number;
  /** Votos sin vivienda (portería, administración): no cuentan para aprobar. */
  sinContar: number;
  umbralNecesario: number | null;
  esSiNo: boolean;
  opciones: OpcionDelResultado[];
  objetivoId: string | null;
  objetivoEtiqueta: string | null;
  empate: boolean | null;
  aprobada: boolean | null;
  falta: number | null;
}

function numero(valor: unknown): number {
  const n = typeof valor === "number" ? valor : Number(valor);
  return Number.isFinite(n) ? n : 0;
}

function numeroONulo(valor: unknown): number | null {
  return valor === null || valor === undefined ? null : numero(valor);
}

/** Lee el JSON de la base. Null si no llega nada (encuesta que no se ve). */
export function leerResultado(json: unknown): ResultadoDeEncuesta | null {
  if (!json || typeof json !== "object") return null;
  const r = json as Record<string, unknown>;
  const opciones = Array.isArray(r.opciones) ? (r.opciones as Record<string, unknown>[]) : [];
  return {
    quienVota: r.quien_vota === "residente" ? "residente" : "vivienda",
    comoSeCuenta: r.como_se_cuenta === "indice" ? "indice" : "igual",
    regla: r.regla === "umbral" ? "umbral" : "mayoria",
    umbralPorcentaje: numeroONulo(r.umbral_porcentaje),
    cerrada: Boolean(r.cerrada),
    visibles: Boolean(r.resultados_visibles),
    electores: numero(r.electores),
    totalPosible: numero(r.total_posible),
    participantes: numero(r.participantes),
    pesoEmitido: numero(r.peso_emitido),
    sinContar: numero(r.sin_contar),
    umbralNecesario: numeroONulo(r.umbral_necesario),
    esSiNo: Boolean(r.es_si_no),
    opciones: opciones.map((o) => ({
      id: String(o.id ?? ""),
      etiqueta: String(o.etiqueta ?? ""),
      votos: numeroONulo(o.votos),
      peso: numeroONulo(o.peso),
      esAbstencion: Boolean(o.es_abstencion),
    })),
    objetivoId: typeof r.objetivo_id === "string" ? r.objetivo_id : null,
    objetivoEtiqueta: typeof r.objetivo_etiqueta === "string" ? r.objetivo_etiqueta : null,
    empate: typeof r.empate === "boolean" ? r.empate : null,
    aprobada: typeof r.aprobada === "boolean" ? r.aprobada : null,
    falta: numeroONulo(r.falta),
  };
}

/**
 * Un número para leer: sin decimales si es entero, y con coma y hasta dos si
 * no (el índice de una vivienda puede ser 1,25). A mano y no con
 * `toLocaleString`, que depende del teléfono (regla 6 de AGENTS.md).
 */
export function formatearCantidad(n: number): string {
  const redondo = Math.round(n * 100) / 100;
  if (Number.isInteger(redondo)) return String(redondo);
  return redondo.toFixed(2).replace(/0+$/, "").replace(".", ",");
}

/** «De 240 departamentos», «Del índice total (6,5)», «De 30 residentes». */
export function deQueTotal(r: Pick<ResultadoDeEncuesta, "quienVota" | "comoSeCuenta" | "totalPosible" | "electores">): string {
  if (r.quienVota === "residente") {
    return `De ${r.electores} ${r.electores === 1 ? "residente con derecho a voto" : "residentes con derecho a voto"}`;
  }
  if (r.comoSeCuenta === "indice") {
    return `Del índice total del edificio (${formatearCantidad(r.totalPosible)})`;
  }
  return `De ${r.electores} ${r.electores === 1 ? "departamento" : "departamentos"}`;
}

function opcionesQueCuentan(r: ResultadoDeEncuesta) {
  return r.opciones.filter((o) => o.peso !== null);
}

/** «40 sí, 30 no» o «Piscina 12, Gimnasio 8». */
function recuento(r: ResultadoDeEncuesta): string {
  return opcionesQueCuentan(r)
    .map((o) =>
      r.esSiNo
        ? `${formatearCantidad(o.peso ?? 0)} ${o.etiqueta.toLowerCase()}`
        : `${o.etiqueta} ${formatearCantidad(o.peso ?? 0)}`,
    )
    .join(", ");
}

/** Lo que pasa con la encuesta, en una frase: aprobada, va ganando, falta... */
export function estadoDelResultado(r: ResultadoDeEncuesta): string {
  if (!r.visibles) {
    return r.cerrada
      ? "La administración todavía no ha publicado los resultados."
      : "Los resultados se ven cuando la administración los publique.";
  }
  const lider = r.objetivoEtiqueta ?? "";
  const pct = `${formatearCantidad(r.umbralPorcentaje ?? 0)} %`;

  if (r.regla === "umbral") {
    if (r.aprobada) {
      return r.esSiNo ? `Aprobada: superó el ${pct}.` : `Aprobada: «${lider}» llegó al ${pct}.`;
    }
    const falta = formatearCantidad(r.falta ?? 0);
    if (r.cerrada) return `No se aprobó: faltaron ${falta} para llegar al ${pct}.`;
    return `Aún no se aprueba: faltan ${falta} para llegar al ${pct}.`;
  }

  // Mayoría simple de los votos emitidos.
  if (r.pesoEmitido <= 0) return r.cerrada ? "Cerró sin votos." : "Todavía no hay votos.";
  if (r.empate) return r.cerrada ? "Terminó en empate." : "Van empatados.";
  if (r.esSiNo) {
    if (r.cerrada) return r.aprobada ? "Aprobada por mayoría simple." : "No se aprobó.";
    return r.aprobada ? "Va ganando Sí." : "Va ganando No.";
  }
  return r.cerrada ? `Ganó «${lider}».` : `Va ganando «${lider}».`;
}

/**
 * La frase completa:
 * «De 240 departamentos: 40 sí, 30 no. Aún no se aprueba: faltan 128 para
 * llegar al 70 %.»
 */
export function fraseDeAvance(r: ResultadoDeEncuesta): string {
  const total = deQueTotal(r);
  if (!r.visibles) {
    const quienes = r.quienVota === "residente" ? "votaron" : "ya votaron";
    return `${total}: ${quienes} ${r.participantes}. ${estadoDelResultado(r)}`;
  }
  const cuenta = recuento(r);
  return `${total}: ${cuenta || "sin votos"}. ${estadoDelResultado(r)}`;
}

export interface TramoDeBarra {
  clave: string;
  etiqueta: string;
  /** Ancho en % del total posible, de 0 a 100. */
  ancho: number;
  tono: "si" | "no" | "otro" | "falta";
}

function porcentaje(parte: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, (parte / total) * 100));
}

/**
 * Los tramos de la barra de una encuesta de Sí/No, medidos contra el TOTAL
 * posible: Sí, No, lo demás (abstención) y lo que falta por votar. Así la
 * marca del umbral cae en su sitio: el 70 % de la barra es el 70 % del total.
 */
export function tramosDeLaBarra(r: ResultadoDeEncuesta): TramoDeBarra[] {
  const total = r.totalPosible;
  const tramos: TramoDeBarra[] = [];
  let usado = 0;
  const normal = (t: string) => t.trim().toLowerCase().replace("í", "i");
  const orden = opcionesQueCuentan(r)
    .slice()
    .sort((a, b) => rango(a) - rango(b));
  function rango(o: OpcionDelResultado) {
    if (normal(o.etiqueta) === "si") return 0;
    if (normal(o.etiqueta) === "no") return 1;
    return 2;
  }
  for (const o of orden) {
    const ancho = porcentaje(o.peso ?? 0, total);
    usado += ancho;
    tramos.push({
      clave: o.id,
      etiqueta: o.etiqueta,
      ancho,
      tono: rango(o) === 0 ? "si" : rango(o) === 1 ? "no" : "otro",
    });
  }
  tramos.push({
    clave: "falta",
    etiqueta: "Falta por votar",
    ancho: Math.max(0, 100 - usado),
    tono: "falta",
  });
  return tramos;
}

/** Dónde va la marca del umbral, en % del ancho. Null si no hay umbral. */
export function posicionDelUmbral(r: Pick<ResultadoDeEncuesta, "regla" | "umbralNecesario" | "totalPosible">): number | null {
  if (r.regla !== "umbral" || r.umbralNecesario === null) return null;
  return porcentaje(r.umbralNecesario, r.totalPosible);
}

/** Una barra por opción, para las encuestas que no son de Sí/No. */
export function barrasPorOpcion(r: ResultadoDeEncuesta): { id: string; etiqueta: string; ancho: number; valor: string; lider: boolean }[] {
  return opcionesQueCuentan(r).map((o) => ({
    id: o.id,
    etiqueta: o.etiqueta,
    ancho: porcentaje(o.peso ?? 0, r.totalPosible),
    valor: formatearCantidad(o.peso ?? 0),
    lider: o.id === r.objetivoId && (o.peso ?? 0) > 0,
  }));
}

/** Para la administración: cuántos votaron, de cuántos, y cuántos faltan. */
export function medirParticipacion(r: Pick<ResultadoDeEncuesta, "participantes" | "electores">) {
  const faltan = Math.max(0, r.electores - r.participantes);
  return {
    votaron: r.participantes,
    de: r.electores,
    faltan,
    porcentaje: r.electores > 0 ? Math.round((r.participantes / r.electores) * 100) : 0,
  };
}

/**
 * Lo que significa el umbral elegido, para leerlo al crear la encuesta:
 * «Se aprueba cuando una opción reúne el 70 % de todos los departamentos».
 */
export function explicarUmbral(quienVota: QuienVota, comoSeCuenta: ComoSeCuenta, porcentajeTexto: string): string {
  const pct = porcentajeTexto.trim() ? `el ${porcentajeTexto.trim()} %` : "ese porcentaje";
  const deQue =
    quienVota === "residente"
      ? "de todos los residentes con derecho a voto"
      : comoSeCuenta === "indice"
        ? "del índice total del edificio"
        : "de todos los departamentos";
  return `Se aprueba cuando el Sí (o la opción elegida) reúne ${pct} ${deQue}, hayan votado o no.`;
}
