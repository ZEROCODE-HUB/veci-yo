import type { ContactoDeLaVivienda } from "../services/contactos.repo";
import { PAPEL_EN_LA_VIVIENDA as PAPEL } from "./contactos";

/**
 * El orden en que se contacta a una vivienda (09/11/2026, Correcciones fila 8):
 * una tarjeta por contacto, numerada, en este orden:
 *
 *   1. el huésped temporal que está alojado ahora (la base solo lo devuelve
 *      mientras dura su estancia);
 *   2. el anfitrión primario;
 *   3. el contacto de emergencia del anfitrión;
 *   4. después, el resto de la vivienda (propietario, residentes…), cada uno
 *      seguido de su contacto de emergencia, si lo tiene.
 *
 * Los contactos de emergencia de los huéspedes van al final: el pedido fija
 * los tres primeros puestos y no los menciona.
 */
export type TarjetaDeContacto =
  | { tipo: "persona"; orden: number; papel: string; persona: ContactoDeLaVivienda }
  | {
      tipo: "emergencia";
      orden: number;
      papel: string;
      /** De quién es este contacto de emergencia. */
      de: string;
      emergencia: NonNullable<ContactoDeLaVivienda["emergencia"]>;
    };

type SinOrden<T> = T extends unknown ? Omit<T, "orden"> : never;

function papelDe(p: ContactoDeLaVivienda): string {
  const base = PAPEL[p.rol] ?? p.rol;
  if (p.esAnfitrionPrimario) {
    return p.rol === "huesped_temporal" ? base : `Anfitrión primario · ${base}`;
  }
  return p.esAdminPrimario ? `${base} · Administrador de la vivienda` : base;
}

function emergenciaDe(p: ContactoDeLaVivienda, papel: string): SinOrden<TarjetaDeContacto>[] {
  return p.emergencia
    ? [{ tipo: "emergencia", papel, de: p.nombre, emergencia: p.emergencia }]
    : [];
}

export function ordenDeContactacion(personas: ContactoDeLaVivienda[]): TarjetaDeContacto[] {
  const huespedes = personas.filter((p) => p.rol === "huesped_temporal");
  const anfitrion = personas.find((p) => p.esAnfitrionPrimario && p.rol !== "huesped_temporal");
  const resto = personas.filter((p) => p.rol !== "huesped_temporal" && p !== anfitrion);

  const tarjetas: SinOrden<TarjetaDeContacto>[] = [
    ...huespedes.map((p) => ({ tipo: "persona" as const, papel: papelDe(p), persona: p })),
    ...(anfitrion
      ? [
          { tipo: "persona" as const, papel: papelDe(anfitrion), persona: anfitrion },
          ...emergenciaDe(anfitrion, "Contacto de emergencia del anfitrión"),
        ]
      : []),
    ...resto.flatMap((p) => [
      { tipo: "persona" as const, papel: papelDe(p), persona: p },
      ...emergenciaDe(p, `Contacto de emergencia de ${p.nombre}`),
    ]),
    ...huespedes.flatMap((p) => emergenciaDe(p, `Contacto de emergencia de ${p.nombre}`)),
  ];
  return tarjetas.map((t, i) => ({ ...t, orden: i + 1 }) as TarjetaDeContacto);
}
