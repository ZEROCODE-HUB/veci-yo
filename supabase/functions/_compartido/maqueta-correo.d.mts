/**
 * Los tipos de `maqueta-correo.mjs`.
 *
 * El módulo es `.mjs` para que lo importen Deno —la función `enviar-correo`—
 * y Node —el script que sube las plantillas de Supabase Auth— sin compilar
 * nada. Sin este archivo, del lado de Deno `componer` llegaría como `any` y
 * una errata en el nombre de un campo no se vería hasta ejecutarlo.
 */

export interface CorreoBoton {
  /** Lo que se lee dentro del botón, y el encabezado del enlace en texto plano. */
  texto: string;
  url: string;
}

export interface Correo {
  /** El encabezado. Lo primero que se lee y lo que resume el correo. */
  titulo: string;
  /** «Hola Sofía,». Sin él, el cuerpo empieza por el primer párrafo. */
  saludo?: string;
  parrafos: string[];
  boton?: CorreoBoton;
  /** Un código para teclear, cuando el correo no lleva enlace. */
  codigo?: string;
  /** Una línea final en gris, antes de la raya del pie. */
  nota?: string;
  /** El cierre. Por defecto, `PIE_POR_DEFECTO`. */
  pie?: string;
}

export declare const PIE_POR_DEFECTO: string;

export declare function componer(correo: Correo): { html: string; texto: string };
