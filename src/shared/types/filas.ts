import type { Database } from "./database.types";

/**
 * La fila de una tabla, **derivada del esquema**.
 *
 * `database.types.ts` lo genera Supabase a partir de la base, así que es la
 * fuente de verdad de la que habla la regla 1. Escribir a mano la forma de lo
 * que devuelve una consulta crea una segunda declaración del mismo dato, y esa
 * se desincroniza en silencio: una columna renombrada sigue compilando contra el
 * tipo escrito a mano.
 *
 * Existe porque los mapeadores de los repositorios recibían `(fila: any)`
 * —setenta y uno—. Con `any`, leer `fila.permisoo_chat` compila, devuelve
 * `undefined`, y la pantalla enseña un permiso apagado sin que nada falle.
 */
export type Fila<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

/**
 * Lo que devuelve un `select` que pide solo algunas columnas.
 *
 * PostgREST devuelve exactamente lo pedido, no la fila entera: usar la fila
 * completa hace que el tipo prometa columnas que no vienen.
 */
export type Columnas<
  T extends keyof Database["public"]["Tables"],
  K extends keyof Fila<T>,
> = Pick<Fila<T>, K>;

/** Un valor de una columna `jsonb`, que puede ser cualquier cosa o nada. */
export type ValorJson = Database["public"]["Tables"] extends never
  ? never
  : unknown;

/**
 * Una clave de un objeto guardado en una columna `jsonb`.
 *
 * Un `jsonb` puede ser un número, una lista o `null` —en las filas viejas lo
 * es—, así que `datos?.clave` no basta: con `any` pasaba y con el tipo generado
 * no compila, que es justo lo que se quiere.
 */
export function claveJson(datos: unknown, clave: string): unknown {
  if (!datos || typeof datos !== "object" || Array.isArray(datos)) {
    return undefined;
  }
  return (datos as Record<string, unknown>)[clave];
}

/**
 * Los campos que se pueden enviar en un `update`, derivados del esquema.
 *
 * Los repositorios construyen el objeto de cambios campo a campo --solo lo que
 * de verdad cambió-- y lo declaraban `Record<string, any>`, que acepta
 * cualquier nombre de columna. Una columna mal escrita en ese objeto no da
 * error: PostgREST responde bien y no actualiza nada.
 */
export type Actualizacion<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
