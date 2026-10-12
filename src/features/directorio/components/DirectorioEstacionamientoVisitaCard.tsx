import { theme } from "@/config";
import { Text, View } from "react-native";
import type { CupoVisita } from "@/features/visitas/hooks/useEstacionamientosVisita";

/**
 * Un estacionamiento de visita en el directorio.
 *
 * La pestaña solo enseñaba los privados --los de cada departamento--, asi que
 * el inicio decia «3 de 3 disponibles» y aqui no salia ninguno. Lo vio el
 * cliente el 12/10/2026. No es de nadie, asi que no lleva propietario ni
 * detalle: lo que importa es cual es y si esta libre.
 */
export function DirectorioEstacionamientoVisitaCard({
  item,
}: {
  item: CupoVisita;
}) {
  return (
    <View
      style={{
        backgroundColor: theme.colors.bgCard,
        borderRadius: 20,
        paddingVertical: 14,
        paddingHorizontal: 16,
        boxShadow: theme.shadows.card,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text className="text-sm font-bold text-gray-900">
          Estacionamiento {item.codigo} — Visita
        </Text>
        {item.ubicacion ? (
          <Text className="text-xs text-gray-500">
            Ubicación: {item.ubicacion}
          </Text>
        ) : null}
      </View>
      <View
        className="rounded-full px-2.5 py-1"
        style={{
          backgroundColor: item.ocupado
            ? theme.colors.warningLight
            : theme.colors.secondaryLight,
        }}
      >
        <Text className="text-2xs font-semibold text-gray-900">
          {item.ocupado ? "Ocupado" : "Libre"}
        </Text>
      </View>
    </View>
  );
}
