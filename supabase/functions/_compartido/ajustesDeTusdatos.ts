/**
 * ajustesDeTusdatos · lo que decide si se consulta, contra qué y qué se exige
 *
 * Hasta el 28/10/2026 eran los secretos `TUSDATOS_ACTIVO` y `TUSDATOS_URL` y
 * una lista de fuentes escrita en `tusdatos.ts`. Ahora se cambian en el panel
 * de la app (Ajustes y Listas), con confirmación. Las credenciales
 * (`TUSDATOS_USUARIO`, `TUSDATOS_CLAVE`) siguen siendo secretos del servidor.
 */
import { parametro, type ClienteConRpc } from "./parametros.ts";
import { ambienteDeTusdatos, type AmbienteTusdatos } from "./tusdatos.ts";

export interface AjustesDeTusdatos {
  activo: boolean;
  ambiente: AmbienteTusdatos;
  base: string;
}

export async function ajustesDeTusdatos(rpc: ClienteConRpc): Promise<AjustesDeTusdatos> {
  const activo = (await parametro(rpc, "tusdatos_activo")) === "true";
  const ambiente = ambienteDeTusdatos(await parametro(rpc, "tusdatos_ambiente"));
  const base = (await parametro(rpc, `tusdatos_url_${ambiente}`)).replace(/\/+$/, "");
  return { activo, ambiente, base };
}

/** Lo mínimo del cliente de supabase-js que hace falta para leer una lista. */
interface ClienteConTablas {
  from(tabla: string): {
    select(columnas: string): {
      eq(columna: string, valor: unknown): {
        eq(columna: string, valor: unknown): PromiseLike<{ data: unknown; error: { message: string } | null }>;
        maybeSingle(): PromiseLike<{ data: unknown; error: { message: string } | null }>;
      };
    };
  };
}

/**
 * Las fuentes que tienen que responder para dar a alguien por limpio, del país
 * del edificio. Un país sin ninguna anotada no exige ninguna.
 */
export async function fuentesObligatoriasDe(
  admin: ClienteConTablas,
  condominioId: string | null,
): Promise<string[]> {
  if (!condominioId) return [];
  const { data: edificio, error: errorEdificio } = await admin
    .from("condominio")
    .select("pais")
    .eq("id", condominioId)
    .maybeSingle();
  if (errorEdificio) throw new Error(`No se pudo leer el país del edificio: ${errorEdificio.message}`);
  const pais = (edificio as { pais: string | null } | null)?.pais?.trim();
  if (!pais) return [];

  const { data, error } = await admin
    .from("catalogo_opcion")
    .select("codigo, pais, activo")
    .eq("catalogo", "antecedentes_fuentes_obligatorias")
    .eq("activo", true);
  if (error) throw new Error(`No se pudieron leer las fuentes obligatorias: ${error.message}`);
  return ((data ?? []) as Array<{ codigo: string; pais: string | null }>)
    .filter((f) => f.pais?.trim() === pais)
    .map((f) => f.codigo);
}
