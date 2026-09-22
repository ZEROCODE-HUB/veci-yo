import { ScrollView, Text } from "react-native";
import { AlojamientoHero, AlojamientoInfoChips } from "../components/alojamiento";
import {
  LibroHuespedContenido,
  LibroHuespedVacio,
} from "../components/libroHuesped";
import { useMiAlojamiento } from "../hooks/useMiAlojamiento";

export function MiAlojamientoScreen() {
  const {
    ubicacionActiva,
    unidad,
    tipologia,
    config,
    guestbook,
    hasGuestbook,
  } = useMiAlojamiento();

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}
    >
      <AlojamientoHero
        ubicacion={ubicacionActiva}
        unidad={unidad}
        descripcion={config?.descripcion || ""}
      />

      {/* Sin suscripcion de renta corta no hay ficha; antes se mostraba una
          inventada, la misma para cualquier vivienda. */}
      {config ? (
        <AlojamientoInfoChips config={config} tipologia={tipologia} />
      ) : (
        <Text className="text-sm text-gray-500">
          Esta vivienda todavía no tiene ficha de alojamiento.
        </Text>
      )}

      {!hasGuestbook || !guestbook ? (
        <LibroHuespedVacio />
      ) : (
        <LibroHuespedContenido libro={guestbook} />
      )}
    </ScrollView>
  );
}
