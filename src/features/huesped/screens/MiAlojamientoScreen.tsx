import { ScrollView, Text } from "react-native";
import { AlojamientoHero, AlojamientoInfoChips } from "../components/alojamiento";
import {
  LibroHuespedContenido,
  LibroHuespedVacio,
} from "../components/libroHuesped";
import { useMiAlojamiento } from "../hooks/useMiAlojamiento";
import { Cargando } from "@/shared/components";

export function MiAlojamientoScreen() {
  const {
    ubicacionActiva,
    unidad,
    tipologia,
    config,
    guestbook,
    hasGuestbook,
    llegadaPendiente,
    cargando,
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
      {cargando ? (
        <Cargando variante="enLinea" texto="tu alojamiento" />
      ) : config ? (
        <AlojamientoInfoChips config={config} tipologia={tipologia} />
      ) : (
        <Text className="text-sm text-gray-500">
          Esta vivienda todavía no tiene ficha de alojamiento.
        </Text>
      )}

      {/*
        Mientras carga no se dice que esta vacio: decirlo es afirmar que el
        anfitrion no ha subido nada, y al entrar por primera vez eso era falso.
      */}
      {cargando ? null : !hasGuestbook || !guestbook ? (
        <LibroHuespedVacio disponibleDesde={llegadaPendiente} />
      ) : (
        <LibroHuespedContenido libro={guestbook} />
      )}
    </ScrollView>
  );
}
