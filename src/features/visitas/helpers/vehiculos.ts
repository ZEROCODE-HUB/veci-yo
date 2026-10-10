import { TIPO_VEHICULO, claveDeEtiqueta } from "@/shared/constants";
import type { Database } from "@/shared/types/database.types";
import type { Vehiculo } from "@/shared/types/visita";

type TipoVehiculoDB = Database["public"]["Enums"]["tipo_vehiculo"];

/**
 * La etiqueta del selector al valor del enum.
 *
 * Se **deriva** de `TIPO_VEHICULO` en vez de repetir el mapa. En
 * `visitas.repo.ts` había uno escrito a mano con las etiquetas como claves
 * —`{ Auto: "auto", ... }`— y eso significa que cambiar un rótulo rompe el
 * guardado **en silencio**: la función devuelve `undefined`, el vehículo entra
 * sin tipo, y nadie se entera hasta que la portería busca una camioneta y no
 * la encuentra.
 *
 * Casi pasa el 02/10/2026, al cambiar «Auto» por «Automóvil» a petición del
 * cliente. Es la lección de «dos sitios que arman el mismo texto lo arman
 * distinto», con la traducción en lugar del formato.
 *
 * Vive aquí y no en el repositorio porque el repositorio importa el cliente de
 * Supabase, y con él React Native: un módulo así **no se puede probar** desde
 * las unitarias —«Flow is not supported»—. Los ayudantes son puros a propósito.
 */
export function vehiculoHaciaBase(
  etiqueta?: string,
): TipoVehiculoDB | undefined {
  if (!etiqueta) return undefined;
  return claveDeEtiqueta(TIPO_VEHICULO, etiqueta) ?? undefined;
}

/**
 * Los vehiculos de una visita en una linea, cada uno con quien responde por el.
 *
 * «ABC123 (responde Oscar Prueba) · XYZ987». El cliente pidio el 09/10/2026
 * que cada vehiculo dijera de quien es; la porteria lo lee aqui. Los que no lo
 * dicen --los de antes, y los que apunta el anfitrion al reservar-- salen solo
 * con la placa.
 */
export function placasConResponsable(vehiculos?: Vehiculo[]): string {
  return (vehiculos ?? [])
    .filter((v) => Boolean(v.placa))
    .map((v) => (v.responsable ? `${v.placa} (responde ${v.responsable})` : v.placa))
    .join(" · ");
}
