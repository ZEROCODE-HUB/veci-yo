import { supabase } from "@/shared/services/supabase";
import { PAIS_POR_DEFECTO } from "@/shared/constants";

/**
 * Los servicios que paga una vivienda: luz, agua, internet.
 *
 * El KT lista «agregar servicio» entre lo que hace el propietario, y la
 * pantalla estaba terminada desde el prototipo —formulario, validación y
 * hook—. Lo que no existía era **dónde guardarlo**: ni tabla, ni política, ni
 * nadie que lo consultara, así que el alta llamaba a `simularAgregarServicio`,
 * que esperaba 180 ms y devolvía lo que le dieras.
 *
 * Quién lo ve lo decide `servicio_de_vivienda_lectura`: la vivienda, y **no la
 * administración**. El número de cliente de la luz y el del medidor son datos
 * del hogar. Quién lo escribe, `gestiona_la_vivienda`: el propietario o el
 * inquilino líder; un residente lo ve y no lo toca.
 */

export interface ServicioDeVivienda {
  id: string;
  nombre: string;
  empresa: string;
  numeroCliente: string;
  numeroMedidor: string;
  /** El día del mes en que vence, de 1 a 31. `null` si no se dijo. */
  diaPrimerAviso: number | null;
  diaSegundoAviso: number | null;
  correoFactura: string;
  telefono: string;
  codigoPais: string;
}

export interface NuevoServicioDeVivienda {
  unidadId: string;
  nombre: string;
  empresa?: string;
  numeroCliente?: string;
  numeroMedidor?: string;
  diaPrimerAviso?: number | null;
  diaSegundoAviso?: number | null;
  correoFactura?: string;
  telefono?: string;
  codigoPais?: string;
}

const SELECT_SERVICIO =
  "id, nombre, empresa, numero_cliente, numero_medidor, dia_primer_aviso, dia_segundo_aviso, correo_factura, telefono, codigo_pais" as const;

export async function obtenerServiciosDeVivienda(
  unidadId: string,
): Promise<ServicioDeVivienda[]> {
  if (!unidadId) return [];

  const { data, error } = await supabase
    .from("servicio_de_vivienda")
    .select(SELECT_SERVICIO)
    .eq("unidad_id", unidadId)
    .order("nombre");

  if (error) throw error;

  return (data ?? []).map((f) => ({
    id: f.id,
    nombre: f.nombre,
    empresa: f.empresa ?? "",
    numeroCliente: f.numero_cliente ?? "",
    numeroMedidor: f.numero_medidor ?? "",
    diaPrimerAviso: f.dia_primer_aviso,
    diaSegundoAviso: f.dia_segundo_aviso,
    correoFactura: f.correo_factura ?? "",
    telefono: f.telefono ?? "",
    codigoPais: f.codigo_pais ?? PAIS_POR_DEFECTO,
  }));
}

export async function agregarServicioDeVivienda(
  datos: NuevoServicioDeVivienda,
): Promise<string> {
  /*
    Columna a columna y no `insert(datos)`: ese atajo exige que cada campo se
    llame igual que su columna, y un campo que no coincide **no da error, se
    ignora**. Ya se perdió así el país de una portería.
  */
  const { data, error } = await supabase
    .from("servicio_de_vivienda")
    .insert({
      unidad_id: datos.unidadId,
      nombre: datos.nombre.trim(),
      empresa: datos.empresa?.trim() || null,
      numero_cliente: datos.numeroCliente?.trim() || null,
      numero_medidor: datos.numeroMedidor?.trim() || null,
      dia_primer_aviso: datos.diaPrimerAviso ?? null,
      dia_segundo_aviso: datos.diaSegundoAviso ?? null,
      correo_factura: datos.correoFactura?.trim() || null,
      telefono: datos.telefono?.replace(/\D/g, "") || null,
      codigo_pais: datos.codigoPais || null,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function borrarServicioDeVivienda(id: string): Promise<void> {
  /*
    Borrado de verdad, no lógico. Un servicio contratado no es constancia de
    nada —no hay que poder demostrar que un día hubo internet— y un borrado
    lógico sobre una tabla con RLS trae su propia trampa: una política de
    SELECT que esconda lo borrado hace que el UPDATE que lo marca se rechace a
    sí mismo. Está en AGENTS.md y costó medio día con los mensajes del chat.
  */
  const { error } = await supabase
    .from("servicio_de_vivienda")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
