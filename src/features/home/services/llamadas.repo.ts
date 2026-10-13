import { supabase } from "@/shared/services/supabase";
import { telefonoInternacional } from "@/shared/constants";

/**
 * A quién se puede llamar, con su número listo para marcar.
 *
 * La pantalla de llamadas era un simulacro: «Llamada en curso» con un
 * contador que arrancaba en 00:15 y ningún número marcado en ninguna parte
 * (13/10/2026). Decidido con el cliente ese día: **abre el marcador del
 * teléfono**. Para eso hace falta un número de verdad, que es lo que da esto.
 */
export interface DestinoDeLlamada {
  clave: string;
  /** Lo que se lee en el selector: «Portería principal», «Administración». */
  etiqueta: string;
  /** En formato internacional, o vacío si no hay ninguno registrado. */
  numero: string;
}

/** Lo que un vecino puede marcar: las porterías del edificio y la administración. */
export async function destinosDelEdificio(
  condominioId: string,
): Promise<DestinoDeLlamada[]> {
  const [porterias, edificio] = await Promise.all([
    supabase
      .from("porteria")
      .select("id, nombre, telefono, codigo_pais")
      .eq("condominio_id", condominioId)
      .is("deleted_at", null)
      .order("nombre"),
    supabase
      .from("condominio")
      .select("telefono, codigo_pais")
      .eq("id", condominioId)
      .maybeSingle(),
  ]);
  if (porterias.error) throw porterias.error;
  if (edificio.error) throw edificio.error;

  return [
    ...(porterias.data ?? []).map((p) => ({
      clave: `porteria:${p.id}`,
      etiqueta: p.nombre,
      numero: telefonoInternacional(p.codigo_pais, p.telefono),
    })),
    {
      clave: "administracion",
      etiqueta: "Administración",
      numero: telefonoInternacional(
        edificio.data?.codigo_pais,
        edificio.data?.telefono,
      ),
    },
  ];
}

/**
 * A quién llama el personal cuando llama a una vivienda.
 *
 * El mismo criterio que usa la portería al anunciar una visita: primero quien
 * recibe a los huéspedes, después el propietario y, si no, quien la lidere.
 * Y se respeta `datos_visibles`: quien pidió no aparecer, no aparece.
 */
export async function contactoDeLaVivienda(
  unidadId: string,
): Promise<{ nombre: string; numero: string } | null> {
  const { data, error } = await supabase
    .from("membresia_unidad")
    .select("nombre, telefono, codigo_pais, rol, es_anfitrion_primario")
    .eq("unidad_id", unidadId)
    .eq("activo", true)
    .eq("datos_visibles", true)
    .not("telefono", "is", null);
  if (error) throw error;

  const orden = ["propietario", "inquilino_lider", "residente"];
  const posicion = (rol: string) => {
    const i = orden.indexOf(rol);
    return i === -1 ? orden.length : i;
  };
  const elegido =
    (data ?? []).find((m) => m.es_anfitrion_primario) ??
    (data ?? []).slice().sort((a, b) => posicion(a.rol) - posicion(b.rol))[0];
  if (!elegido) return null;

  const numero = telefonoInternacional(elegido.codigo_pais, elegido.telefono);
  return numero ? { nombre: elegido.nombre ?? "", numero } : null;
}
