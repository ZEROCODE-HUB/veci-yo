import { supabase } from "@/shared/services/supabase";

export interface InformacionDeConstructora {
  nombre: string;
  anioEntrega: string;
  /** `AAAA-MM`: la garantía se pide por año y mes. */
  garantiaHasta: string;
  responsablePostventa: string;
  correoPostventa: string;
  telefono: string;
  codigoPais: string;
}

/** La constructora del edificio (Para Claude 193, 30/10/2026). Todo es opcional. */
export async function obtenerConstructora(condominioId: string): Promise<InformacionDeConstructora> {
  const { data, error } = await supabase
    .from("condominio")
    .select(
      "constructora_nombre, constructora_anio_entrega, constructora_garantia_hasta, constructora_postventa_responsable, constructora_postventa_correo, constructora_telefono, constructora_codigo_pais",
    )
    .eq("id", condominioId)
    .single();
  if (error) throw error;
  return {
    nombre: data.constructora_nombre ?? "",
    anioEntrega: data.constructora_anio_entrega != null ? String(data.constructora_anio_entrega) : "",
    garantiaHasta: data.constructora_garantia_hasta?.slice(0, 7) ?? "",
    responsablePostventa: data.constructora_postventa_responsable ?? "",
    correoPostventa: data.constructora_postventa_correo ?? "",
    telefono: data.constructora_telefono ?? "",
    codigoPais: data.constructora_codigo_pais ?? "",
  };
}

export async function guardarConstructora(condominioId: string, datos: InformacionDeConstructora) {
  const texto = (v: string) => v.trim() || null;
  const anio = datos.anioEntrega.trim() ? Number(datos.anioEntrega.trim()) : null;
  const { data, error } = await supabase
    .from("condominio")
    .update({
      constructora_nombre: texto(datos.nombre),
      constructora_anio_entrega: anio,
      // Año y mes: se guarda el día 1 de ese mes.
      constructora_garantia_hasta: /^\d{4}-\d{2}$/.test(datos.garantiaHasta) ? `${datos.garantiaHasta}-01` : null,
      constructora_postventa_responsable: texto(datos.responsablePostventa),
      constructora_postventa_correo: texto(datos.correoPostventa)?.toLowerCase() ?? null,
      constructora_telefono: datos.telefono.replace(/\D/g, "") || null,
      constructora_codigo_pais: datos.telefono.trim() ? texto(datos.codigoPais) : null,
    })
    .eq("id", condominioId)
    .select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("No tienes permiso para cambiar los datos del edificio.");
}

/** Si el edificio tiene correo de postventa: sin él no se ofrece «Constructora» en las PQRS (194). */
export async function tieneCorreoDePostventa(condominioId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("condominio")
    .select("constructora_postventa_correo")
    .eq("id", condominioId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data?.constructora_postventa_correo?.trim());
}
