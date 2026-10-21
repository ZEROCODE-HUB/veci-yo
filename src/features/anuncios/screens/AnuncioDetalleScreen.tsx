import { useLayoutEffect, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Cargando, Modal } from "@/shared/components";
import { useUIStore } from "@/stores/ui-store";
import { mensajeDeError } from "@/shared/utils/error.util";
import {
  dejarResultadosEnBorrador,
  publicarResultados,
} from "../services/anuncios.repo";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { useAuthStore } from "@/stores";
import type { ViviendaStackParamList } from "@/shared/types";
import {
  AnuncioResultadosFinales,
  AnuncioResumenCard,
  AnuncioVotacionCard,
} from "../components/detalle";
import { useAnuncioDetalle, useAnuncios } from "../hooks/useAnuncios";
import {
  debeMostrarPendientes,
  isAnuncioVotingClosed,
  participaEnLaEncuesta,
} from "../helpers/anuncios.helpers";

type RouteProps = RouteProp<ViviendaStackParamList, "AnuncioDetalle">;

export function AnuncioDetalleScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProps>();
  const { id } = route.params;
  const rolActivo = useAuthStore((state) => state.rolActivo);
  const {
    data: anuncio,
    isLoading,
    votaPorVivienda,
    detalleNominal,
    pendientes,
    misOpciones,
    viviendasPorVotar,
    cuantasViviendas,
  } = useAnuncioDetalle(id);
  // El voto vive en `useAnuncios`, que ya lo tenia escrito: lo que faltaba era
  // que alguien lo llamara.
  const { votar, votando, eliminarAnuncioAsync, eliminando } = useAnuncios();
  const addToast = useUIStore((s) => s.addToast);
  const cliente = useQueryClient();
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);
  const esAdmin = rolActivo === "administrador";

  /*
    Publicar los resultados de una encuesta cerrada, o volver a taparlos. Solo
    se podía desde el aviso de «esperan tu decisión»: una vez dejados en
    borrador no había dónde publicarlos después.
  */
  const decidir = useMutation({
    mutationFn: (publicar: boolean) =>
      publicar
        ? publicarResultados(anuncio?.uuid ?? "")
        : dejarResultadosEnBorrador(anuncio?.uuid ?? ""),
    onSuccess: (_nada, publicar) => {
      void cliente.invalidateQueries({ queryKey: ["anuncios"] });
      void cliente.invalidateQueries({ queryKey: ["encuestas-por-decidir"] });
      addToast(
        publicar ? "Resultados publicados" : "Los resultados quedan ocultos",
        "success",
      );
    },
    onError: (fallo) =>
      addToast(mensajeDeError(fallo, "No se pudo guardar la decisión"), "error"),
  });
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
  // Mientras carga se dice que carga: decía «No se encontró el anuncio».
  if (!anuncio && isLoading) return <Cargando texto="el anuncio" />;

  if (!anuncio)
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center p-4">
        <Text className="text-base text-gray-500">
          No se encontró el anuncio.
        </Text>
      </View>
    );
  
  const participa = participaEnLaEncuesta(anuncio, rolActivo);
  const puedeVotar = participa && !votacionCerrada;
  
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
    participa && votacionCerrada && resultadosALaVista;


  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerClassName="p-4 gap-4"
    >
      <AnuncioResumenCard anuncio={anuncio} />
      {puedeVotar && (
        <AnuncioVotacionCard
          anuncio={anuncio}
          cerrada={votacionCerrada}
          misOpciones={misOpciones}
          votando={votando}
          viviendasPorVotar={viviendasPorVotar}
          cuantasViviendas={cuantasViviendas}
          onVotar={(opcionUuid) => {
            /*
              Quien tiene vivienda vota **por una**. Sin esto, cuando no
              quedaba ninguna por votar el voto viajaba sin vivienda: uno
              suelto, de persona, que la base cuenta aparte.
            */
            const vivienda = viviendasPorVotar[0]?.unidadId;
            if (votaPorVivienda && !vivienda) {
              addToast("Esta vivienda ya votó en esta encuesta", "error");
              return;
            }
            votar(anuncio.uuid!, opcionUuid, vivienda);
          }}
        />
      )}
      {mostrarResultadosFinales && (
        <AnuncioResultadosFinales
          detalleNominal={detalleNominal}
          anuncio={anuncio}
          noVotaron={deptosNoVotaron}
        />
      )}
      {/*
        La encuesta cerró con los resultados ocultos: lo dice a quien vota, y
        a la administración le da el botón.
      */}
      {anuncio.votacion &&
      votacionCerrada &&
      anuncio.ocultarResultados &&
      !anuncio.resultadosPublicados &&
      !esAdmin ? (
        <Text className="text-sm text-gray-500 text-center">
          La encuesta cerró. La administración todavía no ha publicado los
          resultados.
        </Text>
      ) : null}
      {esAdmin &&
      anuncio.votacion &&
      votacionCerrada &&
      anuncio.ocultarResultados ? (
        <Button
          variant="secondary"
          fullWidth
          loading={decidir.isPending}
          onPress={() => decidir.mutate(!anuncio.resultadosPublicados)}
        >
          <Text>
            {anuncio.resultadosPublicados
              ? "Volver a ocultar los resultados"
              : "Publicar los resultados"}
          </Text>
        </Button>
      ) : null}
      {/*
        Un anuncio publicado por error no se podía retirar: la función
        existía y ninguna pantalla la llamaba.
      */}
      {esAdmin ? (
        <Button
          variant="ghost"
          fullWidth
          onPress={() => setConfirmandoBorrado(true)}
        >
          <Text className="text-danger">Eliminar este anuncio</Text>
        </Button>
      ) : null}
      <View className="h-6" />
      <Modal
        visible={confirmandoBorrado}
        onClose={() => setConfirmandoBorrado(false)}
        title="Eliminar anuncio"
      >
        <View className="gap-4">
          <Text className="text-base text-center text-gray-900">
            ¿Eliminar <Text className="font-bold">{anuncio.titulo}</Text>? Deja
            de verse para todos
            {anuncio.votacion ? ", y sus votos con él" : ""}.
          </Text>
          <Button
            variant="danger"
            fullWidth
            loading={eliminando}
            onPress={() => {
              eliminarAnuncioAsync(anuncio.uuid ?? "")
                .then(() => {
                  setConfirmandoBorrado(false);
                  addToast("Anuncio eliminado", "success");
                  navigation.goBack();
                })
                // El motivo ya salió en pantalla (`onError` del hook).
                .catch(() => undefined);
            }}
          >
            <Text>Eliminar</Text>
          </Button>
          <Button
            variant="ghost"
            fullWidth
            onPress={() => setConfirmandoBorrado(false)}
          >
            <Text>Cancelar</Text>
          </Button>
        </View>
      </Modal>
    </ScrollView>
  );
}
