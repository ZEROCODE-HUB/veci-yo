import React from "react";
import { Text, View } from "react-native";
import type { ResidenteDeUnidad } from "../../services/residentes.repo";
import { GRUPOS_JERARQUIA } from "./gruposDeResidentes";
import { TarjetaDeResidente } from "./TarjetaDeResidente";

interface Props {
  /** Los que viven hoy (y los huéspedes de hoy), ya filtrados por fecha. */
  deHoy: ResidenteDeUnidad[];
  mostrarPermisoDeVisitas: boolean;
  onCambiarPermisoDeVisitas: (r: ResidenteDeUnidad) => void;
  onMenu: (r: ResidenteDeUnidad) => void;
  /** «visitas:<membresía>»… lo que se está guardando, o null. */
  pendiente?: string | null;
}

/**
 * La gente de la vivienda en una sola lista, cada uno con su rol en la
 * etiqueta (25/11/2026, el cliente: «hazlo sencillo»). Antes iba por grupos,
 * cada grupo con su título y sangría, y una frase de quién puede editar.
 * Los huéspedes de hoy siguen aparte: no viven aquí.
 */
export function ResidentesDeLaVivienda({
  deHoy,
  mostrarPermisoDeVisitas,
  onCambiarPermisoDeVisitas,
  onMenu,
  pendiente = null,
}: Props) {
  const cualDe = (r: ResidenteDeUnidad) => {
    const [cual, id] = (pendiente ?? "").split(":");
    return id === r.id ? (cual as "anfitrion" | "administrador" | "visitas") : null;
  };
  const orden = (r: ResidenteDeUnidad) => {
    const i = GRUPOS_JERARQUIA.findIndex((g) => g.roles.includes(r.rol));
    return i < 0 ? 99 : i;
  };
  const viven = deHoy.filter((r) => r.rol !== "Huesped Temporal").sort((a, b) => orden(a) - orden(b));
  const huespedes = deHoy.filter((r) => r.rol === "Huesped Temporal");

  const tarjeta = (r: ResidenteDeUnidad) => (
    <TarjetaDeResidente
      key={r.id}
      residente={r}
      mostrarPermisoDeVisitas={mostrarPermisoDeVisitas}
      onCambiarPermisoDeVisitas={() => onCambiarPermisoDeVisitas(r)}
      onMenu={() => onMenu(r)}
      pendiente={cualDe(r)}
      ocupado={pendiente !== null}
    />
  );

  return (
    <View className="gap-2.5">
      {viven.length > 0 ? (
        <>
          <Text className="text-base font-bold text-gray-900">Viven aquí ({viven.length})</Text>
          {viven.map(tarjeta)}
        </>
      ) : null}
      {huespedes.length > 0 ? (
        <>
          <Text className="text-base font-bold text-gray-900 mt-2">Huéspedes de hoy ({huespedes.length})</Text>
          {huespedes.map(tarjeta)}
        </>
      ) : null}
    </View>
  );
}
