import type { MembresiaUnidad } from "@/shared/services/sesion";
import type { RolActivo } from "@/shared/types";

/**
 * Las viviendas sobre las que se opera **con el rol activo**.
 *
 * No es lo mismo que «mis viviendas». Laura es inquilina líder de la 205 y
 * además huésped de la 102: dos viviendas, dos roles distintos. Las consultas
 * que declaran su ámbito tomaban todas sus unidades, así que al entrar **como
 * huésped de la 102** su lista de visitas enseñaba una de la 205 --con la
 * cabecera diciendo «Torre 1 · 102»--.
 *
 * Es la regla 8 otra vez, un paso más adentro: ya no basta con distinguir
 * «condominio» de «unidad»; cuando alguien tiene dos roles sobre viviendas
 * distintas, hay que quedarse con las del rol con el que entró. Si no, elegir
 * rol vuelve a quedar en nada, que es justo lo que la regla evita.
 *
 * La separación que importa es huésped / no huésped, y es la misma que hace la
 * base en `es_miembro_unidad`, que excluye al `huesped_temporal` a propósito:
 * lo del huésped pasa por `es_huesped_alojado` o `es_huesped_con_reserva`.
 * Entre `propietario`, `inquilino_lider`, `residente` y `corresidente` no hace
 * falta separar: quien tiene dos viviendas como residente las opera todas
 * igual, y ahí sí quiere verlas juntas.
 */
export function unidadesDelRolActivo(
  rolActivo: RolActivo,
  unidades: Pick<MembresiaUnidad, "unidadId" | "rol">[],
): string[] {
  const comoHuesped = rolActivo === "huesped-temporal";
  return unidades
    .filter((u) => (u.rol === "huesped_temporal") === comoHuesped)
    .map((u) => u.unidadId);
}
