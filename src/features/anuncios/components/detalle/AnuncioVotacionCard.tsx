import { theme } from "@/config";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import type { Anuncio } from "../../types/anuncios";

interface Props {
  anuncio: Anuncio;
  /** Los `uuid` de opción que esta persona ya eligió. */
  misOpciones: string[];
  votando: boolean;
  onVotar: (opcionUuid: string) => void;
}

/**
 * La tarjeta para votar una encuesta.
 *
 * Estaba **entera decorativa**: los botones «Sí» y «No» llevaban
 * `onPress={() => {}}` y las opciones eran `Pressable` sin `onPress`. La
 * función `votar`, el hook `emitirVoto` y hasta `miVoto` --para saber qué
 * elegí-- estaban escritos desde el principio; lo único que faltaba era el
 * eslabón de en medio, así que nadie podía votar desde la aplicación.
 *
 * Los 40 recorridos no lo vieron porque llaman a `votar` directamente. Esto
 * salió al recorrer la pantalla.
 *
 * Y se caía por pintar `opcionesVotacion`, que es solo la lista de etiquetas:
 * el `uuid` de cada opción --que es lo que hay que enviar-- viaja en
 * `anuncio.opciones` y se estaba tirando.
 */
export function AnuncioVotacionCard({
  anuncio,
  misOpciones,
  votando,
  onVotar,
}: Props) {
  const opciones = anuncio.opciones ?? [];
  const yaVote = misOpciones.length > 0;
  /*
    La regla la pone la base, en el disparador `validar_voto_unico`: si la
    publicación no es de voto múltiple, un segundo voto se rechaza. La pantalla
    solo la refleja; si la inventara aquí, sería otra decisión viviendo en la
    interfaz.
  */
  const puedeSeguirVotando = anuncio.votacionMultiple || !yaVote;

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
      <Text className="text-base font-bold text-gray-900 text-center mb-3">
        Encuesta en curso
      </Text>
      <View className="mb-4">
        <View className="flex-row justify-between mb-1">
          <Text className="text-sm text-gray-500">Progreso</Text>
          <Text className="text-sm text-gray-500">
            {anuncio.progreso || 0}%
          </Text>
        </View>
        <View
          className="w-full h-2 rounded-full"
          style={{ backgroundColor: theme.colors.borderLight }}
        >
          <View
            className="h-2 rounded-full"
            style={{
              width: `${anuncio.progreso || 0}%`,
              backgroundColor: theme.colors.warning,
            }}
          />
        </View>
      </View>

      {opciones.length > 0 ? (
        <View className="gap-2 mb-3">
          {opciones.map((opcion) => {
            const elegida = misOpciones.includes(opcion.uuid);
            const deshabilitada = votando || (!puedeSeguirVotando && !elegida);
            return (
              <Pressable
                key={opcion.uuid}
                /*
                  `radio` y no `button`: son opciones excluyentes de una
                  votacion. Con `button` el estado no se podia anunciar
                  --`aria-selected` no es valido en un boton, como ya se
                  documento en `TiraDeDias`-- asi que no habia forma de saber
                  cual estaba elegida.
                */
                accessibilityRole="radio"
                accessibilityState={{ checked: elegida, disabled: deshabilitada }}
                aria-checked={elegida}
                disabled={deshabilitada}
                onPress={() => onVotar(opcion.uuid)}
                className="flex-row items-center justify-center py-3 rounded-lg"
                style={{
                  borderWidth: 1.5,
                  borderColor: elegida
                    ? theme.colors.primary
                    : theme.colors.border,
                  backgroundColor: elegida
                    ? theme.colors.primaryLight
                    : theme.colors.bgCard,
                  opacity: deshabilitada && !elegida ? 0.5 : 1,
                }}
              >
                <Text
                  className="text-base text-center"
                  style={{
                    color: elegida ? theme.colors.primaryDark : theme.colors.text,
                    fontWeight: elegida ? "600" : "400",
                  }}
                >
                  {opcion.etiqueta}
                </Text>
                {votando && <ActivityIndicator className="ml-2" size="small" />}
              </Pressable>
            );
          })}
        </View>
      ) : (
        /*
          Una encuesta sin opciones no se puede votar: `voto.opcion_id` es `not
          null`. El formulario exige dos como mínimo, así que esto no debería
          pasar --antes aquí había dos botones «Sí» y «No» que no hacían nada,
          que es peor que decirlo--.
        */
        <Text className="text-sm text-center mb-3" style={{ color: theme.colors.textMuted }}>
          Esta encuesta no tiene opciones para votar.
        </Text>
      )}

      {yaVote && (
        <Text
          className="text-sm text-center"
          style={{ color: theme.colors.success }}
        >
          {anuncio.votacionMultiple
            ? "Tu voto quedó registrado. Puedes elegir más de una opción."
            : "Tu voto quedó registrado."}
        </Text>
      )}

      {anuncio.ocultarResultados ? (
        <Text className="text-sm text-gray-400 text-center mt-2">
          Los resultados se mostrarán al cierre de la encuesta.
        </Text>
      ) : (
        <View className="mt-3">
          <View className="flex-row justify-between">
            <Text className="text-sm text-gray-500">
              Votos emitidos: {anuncio.totalVotos ?? 0}
            </Text>
            <Text className="text-sm text-gray-500"></Text>
          </View>
        </View>
      )}
    </View>
  );
}
