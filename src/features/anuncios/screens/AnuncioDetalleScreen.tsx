import { useLayoutEffect, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Button } from "@/shared/components";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { useAuthStore } from "@/stores";
import type { ViviendaStackParamList } from "@/shared/types";
import {
  AnuncioResultadosFinales,
  AnuncioResumenCard,
  AnuncioVotacionCard,
} from "../components/detalle";
import { AnuncioFormModal } from "../components/anuncios";
import { useAnuncioDetalle, useAnuncios } from "../hooks/useAnuncios";
import {
  debeMostrarPendientes,
  isAnuncioVotingClosed,
} from "../helpers/anuncios.helpers";

type RouteProps = RouteProp<ViviendaStackParamList, "AnuncioDetalle">;

export function AnuncioDetalleScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProps>();
  const { id } = route.params;
  const rolActivo = useAuthStore((state) => state.rolActivo);
  const {
    data: anuncio,
    detalleNominal,
    pendientes,
    misOpciones,
  } = useAnuncioDetalle(id);
  // El voto vive en `useAnuncios`, que ya lo tenia escrito: lo que faltaba era
  // que alguien lo llamara.
  const { votar, votando, corregirAnuncio, corrigiendo } = useAnuncios();
  const [corrigiendoAbierto, setCorrigiendoAbierto] = useState(false);

  /*
    Corregir. No se podia: `publicacion` tiene politica de UPDATE desde el
    primer dia --`es_admin_condominio`-- y ninguna pantalla la usaba. Un
    anuncio se publicaba y se borraba, no se corregia.

    Va en el detalle y no en la lista porque es donde se lee, que es donde se
    nota la falta de ortografia o la hora mal puesta.
  */
  const puedeCorregir = rolActivo === "administrador";
  useLayoutEffect(() => {
    if (anuncio) {
      /*
        Decia "Anuncio N°: 1766994914". Ese numero no existe en ningun sitio:
        `id` es un hash del uuid que la aplicacion calcula para poder usarlo
        como clave de lista. Nadie puede buscarlo ni referirse a el. El titulo
        del anuncio si dice de que se trata.
      */
      navigation.setOptions({ title: anuncio.titulo || "Anuncio" });
    }
  }, [anuncio, navigation]);
  const votacionCerrada = useMemo(
    () => isAnuncioVotingClosed(anuncio),
    [anuncio],
  );

  
  const deptosNoVotaron = useMemo(
    () => (debeMostrarPendientes(anuncio) ? pendientes : []),
    [anuncio, pendientes],
  );
  if (!anuncio)
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center p-4">
        <Text className="text-base text-gray-500">
          No se encontró el anuncio.
        </Text>
      </View>
    );
  
    const puedeVotar =
    anuncio.votacion &&
    !votacionCerrada &&
    rolActivo !== "guardia" &&
    rolActivo !== "huesped-temporal";
  
  /*
    Y que los resultados se puedan enseñar. Hasta el 03/10/2026 esto no miraba
    `ocultarResultados`, así que una encuesta marcada como secreta soltaba sus
    números a todo el mundo en cuanto cerraba --justo lo contrario de lo que
    esa casilla promete--.

    La regla es la misma que aplica la base en `resultados_a_la_vista`: nunca
    se ocultaron, o la administración los publicó.
  */
  const resultadosALaVista =
    !anuncio.ocultarResultados || Boolean(anuncio.resultadosPublicados);

  const mostrarResultadosFinales =
    anuncio.votacion &&
    votacionCerrada &&
    resultadosALaVista &&
    rolActivo !== "guardia" &&
    rolActivo !== "huesped-temporal";


  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerClassName="p-4 gap-4"
    >
      <AnuncioResumenCard anuncio={anuncio} />

      {puedeCorregir && (
        <Button
          variant="secondary"
          fullWidth
          // Bloqueado mientras guarda: sin esto, pulsar dos veces manda dos
          // correcciones --y dos avisos si se pidio avisar--.
          disabled={corrigiendo}
          onPress={() => setCorrigiendoAbierto(true)}
        >
          {corrigiendo ? "Guardando…" : "Corregir anuncio"}
        </Button>
      )}
      {puedeVotar && (
        <AnuncioVotacionCard
          anuncio={anuncio}
          cerrada={votacionCerrada}
          misOpciones={misOpciones}
          votando={votando}
          onVotar={(opcionUuid) => votar(anuncio.uuid!, opcionUuid)}
        />
      )}
      {mostrarResultadosFinales && (
        <AnuncioResultadosFinales
          detalleNominal={detalleNominal}
          anuncio={anuncio}
          noVotaron={deptosNoVotaron}
        />
      )}
      <View className="h-6" />

      <AnuncioFormModal
        visible={corrigiendoAbierto}
        editando={anuncio}
        onClose={() => setCorrigiendoAbierto(false)}
        onSave={(valores) => {
          corregirAnuncio({
            uuid: anuncio.uuid!,
            titulo: valores.titulo,
            descripcion: valores.descripcion,
            urlVideo: valores.urlVideo,
            publicadaDesde: valores.fechaPublicada,
            publicadaHasta: valores.fechaFinalizacion,
            paraPropietarios: valores.paraPropietarios,
            paraResidentes: valores.paraResidentes,
            paraHuespedes: valores.paraHuespedes,
            avisarDelCambio: valores.avisarDelCambio,
          });
          setCorrigiendoAbierto(false);
        }}
      />
    </ScrollView>
  );
}
