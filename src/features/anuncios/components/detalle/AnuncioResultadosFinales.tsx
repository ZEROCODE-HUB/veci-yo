import { theme } from "@/config";
import { Text, View } from "react-native";
import type { Anuncio } from "../../types/anuncios";
import type { FilaDetalleVoto } from "../../services/anuncios.repo";

export function AnuncioResultadosFinales({
  anuncio,
  noVotaron,
  detalleNominal = [],
}: {
  anuncio: Anuncio;
  noVotaron: string[];
  /** Vacio si la votacion es secreta o si quien mira no administra. */
  detalleNominal?: FilaDetalleVoto[];
}) {
  return (
    <View
      className="rounded-2xl p-4"
      style={{
        backgroundColor: "#fff",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      <Text className="text-lg font-bold text-gray-900 text-center mb-3.5">
        Resultados finales
      </Text>
      <View className="mb-4">
        <View className="flex-row justify-between mb-1">
          <Text className="text-sm text-gray-500">Participación</Text>
          <Text className="text-sm text-gray-500">
            {anuncio.progreso || 100}%
          </Text>
        </View>
        <View
          className="w-full h-2 rounded-full"
          style={{ backgroundColor: theme.colors.borderLight }}
        >
          <View
            className="h-2 rounded-full"
            style={{
              width: `${anuncio.progreso || 100}%`,
              backgroundColor: theme.colors.warning,
            }}
          />
        </View>
      </View>
      {/*
        El recuento sale agregado. Los nombres de quienes votaron solo aparecen
        si la votacion NO es secreta y quien mira administra el condominio: esa
        decision la toma la base (`detalle_votacion`), no esta pantalla.
      */}
      {(anuncio.opciones ?? []).map((opcion) => (
        <Votos
          key={opcion.uuid}
          title={`${opcion.etiqueta} (${opcion.votos})`}
          valores={detalleNominal
            .filter((fila: FilaDetalleVoto) => fila.opcion === opcion.etiqueta)
            .map((fila: FilaDetalleVoto) => fila.unidad ?? fila.votante)}
          color={theme.colors.success}
          background={theme.colors.successSoft}
        />
      ))}
      {noVotaron.length > 0 && (
        <Votos
          title={`No votaron (${noVotaron.length})`}
          valores={noVotaron}
          color={theme.colors.textMuted}
          background={theme.colors.borderLight}
        />
      )}
    </View>
  );
}
function Votos({
  title,
  valores,
  color,
  background,
}: {
  title: string;
  valores: string[];
  color: string;
  background: string;
}) {
  return (
    <View className="mb-4">
      <Text className="text-sm font-bold mb-2" style={{ color }}>
        {title}
      </Text>
      <View className="flex-row flex-wrap gap-1.5">
        {valores.map((valor, index) => (
          <View
            key={`${valor}-${index}`}
            className="px-1 py-1.5 rounded-full"
            style={{
              backgroundColor: background,
              borderWidth: 1,
              borderColor: color,
            }}
          >
            <Text className="text-2xs font-semibold px-1" style={{ color }}>
              {valor}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
