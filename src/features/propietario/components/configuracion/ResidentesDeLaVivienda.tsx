import React from "react";
import { Text, View } from "react-native";
import { theme } from "@/config";
import type { ResidenteDeUnidad } from "../../services/residentes.repo";
import { GRUPOS_JERARQUIA } from "./gruposDeResidentes";
import { TarjetaDeResidente } from "./TarjetaDeResidente";

interface Props {
  /** Los que viven hoy (y los huéspedes de hoy), ya filtrados por fecha. */
  deHoy: ResidenteDeUnidad[];
  mostrarPermisoDeVisitas: boolean;
  onMarcarAnfitrion: (r: ResidenteDeUnidad) => void;
  onMarcarAdministrador: (r: ResidenteDeUnidad) => void;
  onCambiarPermisoDeVisitas: (r: ResidenteDeUnidad) => void;
  onMenu: (r: ResidenteDeUnidad) => void;
}

/**
 * La gente de la vivienda por grupos: inquilino líder, residentes,
 * coadministrador, propietario y, aparte, los huéspedes temporales.
 *
 * Los huéspedes temporales ya no cuentan en «Residentes actuales»: van en su
 * propio bloque (comparación con la maqueta, 16/10/2026).
 */
export function ResidentesDeLaVivienda({
  deHoy,
  mostrarPermisoDeVisitas,
  onMarcarAnfitrion,
  onMarcarAdministrador,
  onCambiarPermisoDeVisitas,
  onMenu,
}: Props) {
  return (
    <>
      <Text className="text-base font-bold text-gray-900 mt-2">
        Residentes actuales ({deHoy.filter((r) => r.rol !== "Huesped Temporal").length})
      </Text>
      <Text className="text-xs" style={{ color: theme.colors.textSecondary, lineHeight: 18 }}>
        El Residente Inquilino Lider o el Propietario son quienes pueden agregar o
        editar los residentes de la propiedad.
      </Text>

      {GRUPOS_JERARQUIA.map((grupo) => {
        const items = deHoy.filter((r) => grupo.roles.includes(r.rol));
        if (items.length === 0) return null;
        const esHuesped = grupo.roles.includes("Huesped Temporal");
        return (
          <View
            key={grupo.titulo}
            className="flex-col gap-2.5"
            style={
              grupo.indent && !esHuesped
                ? { paddingLeft: 14, borderLeftWidth: 2, borderLeftColor: theme.colors.borderLight }
                : {}
            }
          >
            {esHuesped ? (
              <Text className="text-base font-bold text-gray-900 mt-2">
                Huéspedes temporales ({items.length})
              </Text>
            ) : (
              <Text className="text-sm font-bold text-gray-900">{grupo.titulo}</Text>
            )}
            {items.map((r) => (
              <TarjetaDeResidente
                key={r.id}
                residente={r}
                mostrarPermisoDeVisitas={mostrarPermisoDeVisitas}
                onMarcarAnfitrion={() => onMarcarAnfitrion(r)}
                onMarcarAdministrador={() => onMarcarAdministrador(r)}
                onCambiarPermisoDeVisitas={() => onCambiarPermisoDeVisitas(r)}
                onMenu={() => onMenu(r)}
              />
            ))}
          </View>
        );
      })}
    </>
  );
}
