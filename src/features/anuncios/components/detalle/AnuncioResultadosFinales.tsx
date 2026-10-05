import { theme } from "@/config";
import { Text, View } from "react-native";
import { nombreDeVecino } from "@/shared/services/nombreDeVecino";
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
  const participacion = medirParticipacion(anuncio, noVotaron.length);

  return (
    <View
      className="rounded-2xl p-4"
      style={{
        backgroundColor: theme.colors.bgCard,
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      <Text className="text-lg font-bold text-gray-900 text-center mb-3.5">
        Resultados finales
      </Text>
      {/*
        La participacion se mide contra algo: contra el umbral si el anuncio lo
        declara, y si no, contra el censo --los votos emitidos mas las unidades
        que la base dice que faltaron--. Si no hay ninguno de los dos no se
        pinta nada.

        Antes era `progreso || 100`: una encuesta sin umbral cerraba diciendo
        «Participación 100%» aunque no hubiera votado nadie, y el 0 legitimo de
        una con umbral y sin votos tambien salia como 100.
      */}
      {participacion !== undefined && (
        <View className="mb-4">
          <View className="flex-row justify-between mb-1">
            <Text className="text-sm text-gray-500">{participacion.leyenda}</Text>
            <Text className="text-sm text-gray-500">
              {participacion.porcentaje}%
            </Text>
          </View>
          <View
            className="w-full h-2 rounded-full"
            style={{ backgroundColor: theme.colors.borderLight }}
          >
            <View
              className="h-2 rounded-full"
              style={{
                width: `${participacion.porcentaje}%`,
                backgroundColor: theme.colors.warning,
              }}
            />
          </View>
        </View>
      )}
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
            /*
              Los dos. Antes era `fila.unidad ?? fila.votante`: con unidad
              salia «301» y el nombre de quien voto se tiraba, aunque la base
              lo hubiera devuelto --y solo lo devuelve si la votacion no es
              secreta y quien mira administra, o sea cuando se quiere saber--.
            */
            .map((fila: FilaDetalleVoto) =>
              nombreDeVecino(fila.votante, fila.unidad),
            )}
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

/**
 * Contra que se compara la participacion de una votacion cerrada.
 *
 * El umbral manda, porque es lo que el condominio declaro esperar. Si no hay,
 * sirve el censo: `pendientes_votacion` devuelve las unidades que no votaron,
 * pero **viene vacio** si la votacion es secreta o si quien mira no
 * administra, y entonces no hay denominador y no se ensena ninguna barra.
 */
function medirParticipacion(
  anuncio: Anuncio,
  faltaron: number,
): { leyenda: string; porcentaje: number } | undefined {
  const votos = anuncio.totalVotos ?? 0;

  if (anuncio.umbral && anuncio.progreso !== undefined) {
    return {
      leyenda: `Participación sobre el umbral de ${anuncio.umbral}`,
      porcentaje: anuncio.progreso,
    };
  }

  const censo = votos + faltaron;
  if (censo === 0) return undefined;

  return {
    leyenda: `Participación: ${votos} de ${censo}`,
    porcentaje: Math.round((votos / censo) * 100),
  };
}
