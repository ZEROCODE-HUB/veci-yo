/**
 * parametros · los valores de negocio que viven en la base, leídos desde las funciones
 *
 * Decisión del cliente (18/10/2026): ningún valor de negocio escrito en el
 * código. Días, topes, intentos y esperas están en `configuracion_plataforma`
 * y se cambian desde el panel de Supabase; las funciones los leen aquí.
 *
 * Se lee con la función de la base `parametro(p_clave, p_condominio_id)`, que
 * ya resuelve el valor propio del edificio cuando el parámetro es de ámbito
 * «edificio» y se le pasa uno.
 *
 * **No hay valor de respaldo.** Si la clave no existe o la base no responde,
 * esto lanza: un número escrito aquí «por si acaso» es justo lo que se quiere
 * quitar, y si un día difiere del de la base nadie se entera.
 */

/**
 * Lo único que hace falta del cliente: poder llamar a una función de la base.
 *
 * Estructural y no `SupabaseClient` a propósito: según cómo se cree el cliente
 * sus genéricos cambian y el tipo deja de encajar (ya pasa en
 * `reporte-antecedentes`). Y así también sirve un envoltorio mínimo en las
 * funciones que hablan con PostgREST por `fetch`.
 */
export interface ClienteConRpc {
  rpc(
    fn: string,
    args: Record<string, unknown>,
  ): PromiseLike<{ data: unknown; error: { message: string } | null }>;
}

/**
 * El valor efectivo de un parámetro, como texto. Con la clave de servicio:
 * los internos no los puede leer una sesión cualquiera.
 */
export async function parametro(
  admin: ClienteConRpc,
  clave: string,
  condominioId?: string | null,
): Promise<string> {
  const { data, error } = await admin.rpc("parametro", {
    p_clave: clave,
    p_condominio_id: condominioId ?? null,
  });
  if (error) {
    throw new Error(`No se pudo leer el parámetro "${clave}": ${error.message}`);
  }
  if (typeof data !== "string") {
    throw new Error(`El parámetro "${clave}" no tiene valor`);
  }
  return data;
}

/** Igual, para los que son un número entero (días, intentos, segundos...). */
export async function parametroEntero(
  admin: ClienteConRpc,
  clave: string,
  condominioId?: string | null,
): Promise<number> {
  const texto = await parametro(admin, clave, condominioId);
  const n = Number(texto.trim());
  if (!Number.isInteger(n)) {
    throw new Error(`El parámetro "${clave}" no es un entero: "${texto}"`);
  }
  return n;
}

/**
 * Para las funciones que no usan supabase-js y hablan con PostgREST por
 * `fetch` con la clave de servicio: el mismo `rpc`, por la ruta
 * `/rest/v1/rpc/<función>`.
 */
export function clienteRpcPorFetch(url: string, claveServicio: string): ClienteConRpc {
  return {
    async rpc(fn, args) {
      const respuesta = await fetch(`${url}/rest/v1/rpc/${fn}`, {
        method: "POST",
        headers: {
          apikey: claveServicio,
          Authorization: `Bearer ${claveServicio}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(args),
      });
      if (!respuesta.ok) {
        return { data: null, error: { message: `${respuesta.status} ${await respuesta.text()}` } };
      }
      return { data: await respuesta.json(), error: null };
    },
  };
}

/** Megabytes a bytes, para los topes de tamaño de archivo. */
export const megabytesABytes = (mb: number) => mb * 1024 * 1024;
