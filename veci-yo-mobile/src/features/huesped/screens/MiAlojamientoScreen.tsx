import { ScrollView } from "react-native";
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
        descripcion={config.descripcion || ""}
      />

      <AlojamientoInfoChips config={config} tipologia={tipologia} />

      {!hasGuestbook || !guestbook ? (
        <LibroHuespedVacio />
      ) : (
        <LibroHuespedContenido libro={guestbook} />
      )}
    </ScrollView>
  );
}
