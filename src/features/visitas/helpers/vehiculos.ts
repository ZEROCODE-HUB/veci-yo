import type { Vehiculo } from "@/shared/types/visita";

/*
  `vehiculoHaciaBase` traducia el nombre elegido al codigo del enum. Se retiro
  el 28/10/2026: el selector entrega ya el codigo, y los nombres los cambia el
  administrador desde la lista `tipos_de_vehiculo`, asi que una traduccion por
  nombre se rompia en cuanto renombrara uno.
*/

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
    .map((v) => {
      // «ABC123, Mazda gris (responde Oscar)»: marca y color si los hay (hueco 27).
      const como = [v.marca, v.color].filter((x) => x && x.trim()).join(" ");
      const placa = como ? `${v.placa}, ${como}` : v.placa;
      return v.responsable ? `${placa} (responde ${v.responsable})` : placa;
    })
    .join(" · ");
}
