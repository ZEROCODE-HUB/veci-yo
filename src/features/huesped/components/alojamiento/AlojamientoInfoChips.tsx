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
        icon={config.permiteMascotas ? "🐾" : "🚫🐾"}
        label="Mascotas"
        value={config.permiteMascotas ? "Permitidas" : "No permitidas"}
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

