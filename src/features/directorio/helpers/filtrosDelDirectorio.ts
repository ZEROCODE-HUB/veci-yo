import type { UnidadDisponible } from "@/shared/hooks/useUnidadesDisponibles";
import { soloVisibles } from "@/features/correspondencia/helpers/destinos";
import { PAPEL_EN_LA_VIVIENDA } from "./contactos";
import type { DirectorioContactos, Unidad } from "../types/directorio";

/**
 * Las cuentas de los filtros y la selección del directorio (16/11/2026,
 * cliente: «filtrar por ubicación en el directorio, poder filtrar por
 * cocheras, departamentos, residentes. Poder seleccionar masivamente»).
 *
 * Puras, para poder invertirlas en una prueba. La selección usa las mismas
 * reglas que el envío masivo de correspondencia (`destinos.ts`): lo que deja
 * de verse al cambiar un filtro deja de estar marcado, y se marca por la
 * vivienda (su uuid), no por su código, que se repite entre torres.
 */

/** Los propietarios de una vivienda, con copropietarios, por su nombre completo. */
export function propietariosDe(contactos: DirectorioContactos): string[] {
  return contactos.personas
    .filter((p) => p.papel === PAPEL_EN_LA_VIVIENDA.propietario)
    .map((p) => p.nombre);
}

/** Una vivienda del directorio dicha como un destino de `destinos.ts`. */
export function comoDestino(unidad: Unidad, condominioId: string): UnidadDisponible {
  return {
    unidadId: unidad.uuid ?? String(unidad.id),
    condominioId,
    codigo: unidad.codigo,
    piso: unidad.piso,
    torreNumero: unidad.torreNumero,
    torreNombre: `Torre ${unidad.torreNumero}`,
    torre: `Torre ${unidad.torreNumero}`,
  };
}

/** De lo marcado, lo que sigue a la vista con los filtros de ahora. */
export function marcadasALaVista(
  seleccion: string[],
  visibles: Unidad[],
  condominioId: string,
): string[] {
  return soloVisibles(seleccion, visibles.map((u) => comoDestino(u, condominioId)));
}

/**
 * Marca o desmarca todas las que se ven: si ya estaban todas, las quita; si
 * no, las pone. Las marcadas que no se ven no se tocan aquí: las quita
 * `marcadasALaVista`.
 */
export function alternarTodas(seleccion: string[], visibles: Unidad[]): string[] {
  const ids = visibles.map((u) => u.uuid ?? String(u.id));
  const todas = ids.length > 0 && ids.every((id) => seleccion.includes(id));
  return todas ? seleccion.filter((id) => !ids.includes(id)) : [...new Set([...seleccion, ...ids])];
}

export function alternarUna(seleccion: string[], id: string): string[] {
  return seleccion.includes(id) ? seleccion.filter((x) => x !== id) : [...seleccion, id];
}

export interface ResidenteDelDirectorio {
  clave: string;
  nombre: string;
  papel: string;
  torreNumero: number;
  codigo: string;
  unidad: Unidad;
}

/**
 * Una fila por persona, para la pestaña «Residentes»: todas las personas de
 * cada vivienda con su papel, ordenadas por torre, depto y nombre.
 */
export function residentesDe(
  unidades: Unidad[],
  contactosDe: (unidad: Unidad) => DirectorioContactos,
): ResidenteDelDirectorio[] {
  return unidades
    .flatMap((unidad) =>
      contactosDe(unidad).personas.map((persona, i) => ({
        clave: `${unidad.uuid ?? unidad.id}-${i}`,
        nombre: persona.nombre,
        papel: persona.papel,
        torreNumero: unidad.torreNumero,
        codigo: unidad.codigo,
        unidad,
      })),
    )
    .sort(
      (a, b) =>
        a.torreNumero - b.torreNumero ||
        a.codigo.localeCompare(b.codigo, "es", { numeric: true }) ||
        a.nombre.localeCompare(b.nombre, "es"),
    );
}

/** Los niveles de estacionamiento que de verdad tienen alguno, sin repetir. */
export function nivelesDe(unidades: Unidad[]): string[] {
  return [
    ...new Set(unidades.flatMap((u) => u.nivelesEstacionamiento ?? []).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
}
