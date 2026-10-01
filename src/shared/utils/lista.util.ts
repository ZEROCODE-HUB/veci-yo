/**
 * La lista vacía, siempre la misma.
 *
 * `query.data ?? []` parece inocente y no lo es: crea un array **nuevo** en cada
 * render, así que todos los `useMemo` que lo tengan de dependencia se recalculan
 * siempre y no memorizan nada. Con una lista de cuatrocientas unidades y cuatro
 * memos encadenados --que es lo que hay en el directorio-- eso es trabajo
 * repetido en cada pulsación de tecla del buscador.
 *
 * El linter lo dice así: «The 'X' logical expression could make the dependencies
 * of useMemo Hook change on every render». Salió en cuatro hooks.
 *
 * Es de solo lectura porque se comparte entre todos: quien la mutara la mutaría
 * para todos.
 */
export const SIN_ELEMENTOS: readonly never[] = Object.freeze([]);

/**
 * Lo que devolvió la consulta, o una lista vacía estable.
 *
 * Se escribe `listaDe(query.data)` en lugar de `query.data ?? []`.
 */
export function listaDe<T>(valor: T[] | undefined | null): T[] {
  return valor ?? (SIN_ELEMENTOS as unknown as T[]);
}
