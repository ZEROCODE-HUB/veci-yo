/**
 * Los países, con su prefijo telefónico.
 *
 * Había **dos listas** desalineadas en el proyecto —una en
 * `administrador/services/condominio.repo.ts` y otra dentro de la pantalla de
 * alta de edificios del panel de plataforma— y **ninguna de las dos tenía el
 * prefijo**, que es lo que hace falta para marcar un número o mandarlo a
 * WhatsApp.
 *
 * Esta es la única, y la que usan el selector de teléfono y el alta de un
 * edificio. Si mañana el producto entra en otro país, se añade aquí y aparece
 * en todas partes.
 *
 * El orden no es alfabético a propósito: Colombia y Perú primero, que es donde
 * opera el producto hoy, y después el resto. En una lista de doscientos, lo que
 * importa es que lo probable esté arriba.
 */
export interface Pais {
  /** ISO 3166-1 alfa-2, que es como se guarda en la base. */
  codigo: string;
  nombre: string;
  /** Prefijo telefónico internacional, sin el `+`. */
  prefijo: string;
}

export const PAISES: Pais[] = [
  { codigo: "CO", nombre: "Colombia", prefijo: "57" },
  { codigo: "PE", nombre: "Perú", prefijo: "51" },
  { codigo: "AR", nombre: "Argentina", prefijo: "54" },
  { codigo: "BO", nombre: "Bolivia", prefijo: "591" },
  { codigo: "BR", nombre: "Brasil", prefijo: "55" },
  { codigo: "CA", nombre: "Canadá", prefijo: "1" },
  { codigo: "CL", nombre: "Chile", prefijo: "56" },
  { codigo: "CR", nombre: "Costa Rica", prefijo: "506" },
  { codigo: "CU", nombre: "Cuba", prefijo: "53" },
  { codigo: "EC", nombre: "Ecuador", prefijo: "593" },
  { codigo: "SV", nombre: "El Salvador", prefijo: "503" },
  { codigo: "ES", nombre: "España", prefijo: "34" },
  { codigo: "US", nombre: "Estados Unidos", prefijo: "1" },
  { codigo: "FR", nombre: "Francia", prefijo: "33" },
  { codigo: "GT", nombre: "Guatemala", prefijo: "502" },
  { codigo: "HN", nombre: "Honduras", prefijo: "504" },
  { codigo: "IT", nombre: "Italia", prefijo: "39" },
  { codigo: "MX", nombre: "México", prefijo: "52" },
  { codigo: "NI", nombre: "Nicaragua", prefijo: "505" },
  { codigo: "PA", nombre: "Panamá", prefijo: "507" },
  { codigo: "PY", nombre: "Paraguay", prefijo: "595" },
  { codigo: "PT", nombre: "Portugal", prefijo: "351" },
  { codigo: "PR", nombre: "Puerto Rico", prefijo: "1" },
  { codigo: "DO", nombre: "República Dominicana", prefijo: "1" },
  { codigo: "GB", nombre: "Reino Unido", prefijo: "44" },
  { codigo: "DE", nombre: "Alemania", prefijo: "49" },
  { codigo: "UY", nombre: "Uruguay", prefijo: "598" },
  { codigo: "VE", nombre: "Venezuela", prefijo: "58" },
];

/** El país por defecto cuando nadie ha dicho nada. */
export const PAIS_POR_DEFECTO = "CO";

export function paisPorCodigo(codigo: string | null | undefined): Pais | null {
  if (!codigo) return null;
  return PAISES.find((p) => p.codigo === codigo.toUpperCase()) ?? null;
}

/**
 * El número con su prefijo, listo para marcar o para WhatsApp.
 *
 * Devuelve cadena vacía si falta alguna de las dos piezas: media cosa no sirve
 * para llamar, y un `+57` suelto parece un teléfono y no lo es.
 */
export function telefonoInternacional(
  codigoPais: string | null | undefined,
  telefono: string | null | undefined,
): string {
  const pais = paisPorCodigo(codigoPais);
  const numero = (telefono ?? "").replace(/\D/g, "");
  if (!pais || !numero) return "";
  return `+${pais.prefijo}${numero}`;
}

/**
 * Busca países por nombre, código o prefijo.
 *
 * Por prefijo también: alguien que sabe que su número empieza por 57 y no se
 * acuerda de cómo se escribe su país lo encuentra igual.
 */
export function buscarPaises(texto: string): Pais[] {
  const q = texto.trim().toLowerCase();
  if (!q) return PAISES;
  const sinAcentos = (s: string) =>
    s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  return PAISES.filter(
    (p) =>
      sinAcentos(p.nombre).includes(sinAcentos(q)) ||
      p.codigo.toLowerCase().includes(q) ||
      p.prefijo.includes(q.replace("+", "")),
  );
}
