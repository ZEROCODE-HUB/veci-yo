/**
 * `import.meta.env` para los recorridos.
 *
 * Desde el 02/10/2026 los recorridos del preregistro llaman al módulo de la
 * web, que es donde vive la única implementación de ese flujo. Ese módulo lee
 * `import.meta.env` --es un proyecto de Vite-- y el `tsconfig` de este
 * repositorio no conoce ese tipo, así que el `typecheck` fallaba por un archivo
 * que no es suyo.
 *
 * No hace falta más: en Node esas variables vienen vacías y el cliente de la
 * web queda nulo, que es justo lo que se quiere. Los recorridos pasan el suyo.
 */
interface ImportMeta {
  readonly env: Record<string, string | undefined>;
}
