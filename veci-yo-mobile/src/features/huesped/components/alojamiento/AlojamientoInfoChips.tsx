import { View } from "react-native";
import type { Tipologia } from "@/stores/admin-store";
import type { AlojamientoConfig } from "../../types";
import { AlojamientoInfoChip } from "./AlojamientoInfoChip";

interface AlojamientoInfoChipsProps {
  config: AlojamientoConfig;
  tipologia?: Tipologia | null;
}

export function AlojamientoInfoChips({
  config,
  tipologia,
}: AlojamientoInfoChipsProps) {
  const mascotas =
    config.politicaMascotas === "permitidas"
      ? "Permitidas"
      : config.politicaMascotas === "no-permitidas" ||
          config.politicaMascotas === "no permitidas"
        ? "No permitidas"
        : undefined;

  return (
    <View className="flex-row flex-wrap gap-2">
      <AlojamientoInfoChip
        icon="🛏️"
        label="Habitaciones"
        value={config.numHabitaciones}
      />
      <AlojamientoInfoChip
        icon="👥"
        label="Huéspedes"
        value={config.maxHuespedes ? `Hasta ${config.maxHuespedes}` : undefined}
      />
      <AlojamientoInfoChip icon="🏷️" label="Tipología" value={tipologia?.nombre} />
      <AlojamientoInfoChip
        icon={config.politicaMascotas === "permitidas" ? "🐾" : "🚫🐾"}
        label="Mascotas"
        value={mascotas}
      />
      {typeof config.aptoNinos === "boolean" && (
        <AlojamientoInfoChip
          icon="👶"
          label="Niños"
          value={config.aptoNinos ? "Apto" : "No apto"}
        />
      )}
      <AlojamientoInfoChip
        icon="🅿️"
        label="Estacionamientos"
        value={config.estacionamientos}
      />
    </View>
  );
}

