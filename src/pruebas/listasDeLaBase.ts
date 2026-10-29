import type { NombreDeLista, OpcionDeLista } from "@/shared/hooks/useLista";

/**
 * Un doble de `useLista` con las listas sembradas en la base, para las
 * pruebas de componentes (28/10/2026).
 *
 * Se dobla porque `useLista` pide la lista con React Query a Supabase, y en
 * jsdom no hay red ni, en muchas pruebas, proveedor de consultas. Los valores
 * son los de `20261018109000_paises_monedas_y_listas_viven_en_la_base.sql`
 * --incluida `consulta`, apagada-- para que una prueba vea lo mismo que la
 * pantalla el primer día. Una lista que no está aquí sale vacía, que es lo
 * mismo que ve la pantalla mientras carga.
 *
 * Uso: `vi.mock("@/shared/hooks/useLista", () => import("@/pruebas/listasDeLaBase"))`.
 */
const op = (
  codigo: string,
  etiqueta: string,
  extra: Record<string, unknown> = {},
  activo = true,
): OpcionDeLista => ({ codigo, etiqueta, activo, pais: null, extra });

export const SEMILLA: Partial<Record<NombreDeLista, OpcionDeLista[]>> = {
  plataformas_de_reserva: [
    op("airbnb", "Airbnb"),
    op("booking", "Booking"),
    op("directo", "Otro"),
    op("otra", "Otra plataforma", { se_ofrece_al_crear: false }),
  ],
  motivos_eliminar_cuenta: [
    op("ya_no_resido_en_este_condominio", "Ya no resido en este condominio"),
    op("cambio_de_condominio", "Cambio de condominio"),
    op("no_uso_la_aplicacion", "No uso la aplicación"),
    op("problemas_con_la_aplicacion", "Problemas con la aplicación"),
    op("otro", "Otro"),
  ],
  tipos_de_vehiculo: [
    op("auto", "Automóvil"),
    op("camioneta", "Camioneta"),
    op("moto", "Moto"),
    op("bus", "Bus"),
    op("van", "Van"),
  ],
  categorias_de_anuncio: [
    op("servicios", "Servicios"),
    op("eventos", "Eventos"),
    op("mantenimiento", "Mantenimiento"),
    op("seguridad", "Seguridad"),
    op("administracion", "Administración"),
  ],
  areas_de_pqrs: [
    op("condominio", "Condominio", { tipos: ["pregunta", "queja", "reclamo", "sugerencia"] }),
    op("aplicacion", "Aplicación Veciyo", { tipos: ["idea", "soporte"] }),
    op("constructora", "Constructora", { tipos: [] }),
    op("documentos_antiguos", "Documentos antiguos", { tipos: [] }),
  ],
  tipos_de_pqrs: [
    op("pregunta", "Pregunta"),
    op("queja", "Queja"),
    op("reclamo", "Reclamo"),
    op("sugerencia", "Sugerencia"),
    op("consulta", "Consulta", {}, false),
    op("idea", "Idea"),
    op("soporte", "Soporte"),
  ],
  horarios_de_entrada: [
    op("08_30_a_13_30", "08:30 a 13:30", { desde: "08:30", hasta: "13:30" }),
    op("14_00_a_20_00", "14:00 a 20:00", { desde: "14:00", hasta: "20:00" }),
    op("24_horas", "24 horas", { desde: "00:00", hasta: "23:59" }),
  ],
  equipamiento_obligatorio: [
    op("antirruido", "Dispositivo antirruido", { icono: "🔇", clave_en_codigo: "antirruido" }),
    op("no_fumar", "Señalética de no fumar", { icono: "🚭", clave_en_codigo: "noFumar" }),
    op("sensor", "Sensor de incendio/gas/CO2", { icono: "🔥", clave_en_codigo: "sensor" }),
  ],
};

export function useLista(lista: NombreDeLista) {
  const todas = SEMILLA[lista] ?? [];
  const porCodigo = new Map(todas.map((o) => [o.codigo, o]));
  return {
    cargada: true,
    opciones: todas.filter((o) => o.activo),
    etiquetaDe: (codigo: string | null | undefined): string =>
      codigo ? (porCodigo.get(codigo)?.etiqueta ?? codigo) : "",
    opcion: (codigo: string | null | undefined) => (codigo ? porCodigo.get(codigo) : undefined),
  };
}
