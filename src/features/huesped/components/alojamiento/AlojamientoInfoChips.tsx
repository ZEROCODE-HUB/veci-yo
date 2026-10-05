import { View } from "react-native";
import type { Tipologia } from "@/stores/admin-store";
import type { AlojamientoConfig } from "../../types";
import { franjaDeCheckin } from "../../helpers/franjaDeCheckin";
import { AlojamientoInfoChip } from "./AlojamientoInfoChip";

interface AlojamientoInfoChipsProps {
  config: AlojamientoConfig;
  tipologia?: Tipologia | null;
}

export function AlojamientoInfoChips({
  config,
  tipologia,
}: AlojamientoInfoChipsProps) {
  /*
    El horario de check-in: la administracion lo elegia por vivienda y no
    llegaba a ninguna pantalla. Solo sale si alguien lo puso --sin decidir es
    nulo, y entonces no se promete una franja que nadie fijo--.
  */
  const checkin = franjaDeCheckin(config.checkinDesde, config.checkinHasta);

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
      {checkin ? (
        <AlojamientoInfoChip icon="🕒" label="Check-in" value={checkin} />
      ) : null}
    </View>
  );
}

