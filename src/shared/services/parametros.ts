/**
 * Leer un parámetro de la base (18/10/2026).
 *
 * El cliente pidió que ningún valor de negocio quede escrito en el código: los
 * días, topes y opciones viven en `configuracion_plataforma` y la app los pide
 * con `parametros_publicos`. Aquí está solo la parte pura: convertir el texto
 * guardado al tipo que se necesita.
 *
 * Un parámetro que no llegó **revienta** en vez de caer en un valor por
 * defecto: si la app trajera su propio número de respaldo, volveríamos a tener
 * el valor escondido en el código que se quería quitar, y además en silencio.
 */

export type MapaDeParametros = Readonly<Record<string, string>>;

export class ParametroDesconocido extends Error {
  constructor(clave: string) {
    super(`Parámetro desconocido: "${clave}". Tiene que existir y ser público en configuracion_plataforma.`);
    this.name = "ParametroDesconocido";
  }
}

function crudo(mapa: MapaDeParametros, clave: string): string {
  const valor = mapa[clave];
  if (valor === undefined) throw new ParametroDesconocido(clave);
  return valor;
}

export function parametroTexto(mapa: MapaDeParametros, clave: string): string {
  return crudo(mapa, clave);
}

export function parametroNumero(mapa: MapaDeParametros, clave: string): number {
  const valor = Number(crudo(mapa, clave));
  if (!Number.isFinite(valor)) {
    throw new Error(`El parámetro "${clave}" no es un número: "${mapa[clave]}".`);
  }
  return valor;
}

export function parametroBooleano(mapa: MapaDeParametros, clave: string): boolean {
  const valor = crudo(mapa, clave).trim().toLowerCase();
  if (valor !== "true" && valor !== "false") {
    throw new Error(`El parámetro "${clave}" no es true/false: "${mapa[clave]}".`);
  }
  return valor === "true";
}

export function parametroLista<T = unknown>(mapa: MapaDeParametros, clave: string): T[] {
  const valor: unknown = JSON.parse(crudo(mapa, clave));
  if (!Array.isArray(valor)) {
    throw new Error(`El parámetro "${clave}" no es una lista: "${mapa[clave]}".`);
  }
  return valor as T[];
}
