import { theme } from "@/config";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pressable, Text, View } from "react-native";
import { formatDate } from "@/shared/utils";
import { useUIStore } from "@/stores";
import {
  dejarResultadosEnBorrador,
  encuestasPorDecidir,
  publicarResultados,
} from "../../services/anuncios.repo";

/**
 * Las encuestas que cerraron y esperan una decisión sobre sus resultados.
 *
 * Lo pidió el cliente el 02/10/2026: al terminar una encuesta, preguntarle al
 * administrador si publica los resultados o los deja en borrador.
 *
 * Debajo había un defecto. La tarjeta de una votación con resultados ocultos
 * decía «los resultados se mostrarán al cierre de la encuesta», y eso **no
 * pasaba nunca**: la casilla se fijaba al crearla y nadie la volvía a tocar.
 * Una promesa que no se cumple es peor que un botón que no hace nada, porque
 * quien la lee no vuelve a mirar.
 *
 * Esta lista es lo que hace que la decisión exista de verdad. Sin ella el
 * administrador tendría que acordarse de entrar a cada encuesta vieja a ver si
 * ya cerró, que es tanto como no tenerla.
 *
 * No se pinta si no hay nada que decidir, y para quien no administra la base
 * devuelve una lista vacía.
 */
export function EncuestasPorDecidir({ condominioId }: { condominioId: string }) {
  const cliente = useQueryClient();
  const { addToast } = useUIStore();

  const { data: pendientes = [] } = useQuery({
    queryKey: ["encuestas-por-decidir", condominioId],
    queryFn: () => encuestasPorDecidir(condominioId),
    enabled: Boolean(condominioId),
  });

  const refrescar = () => {
    cliente.invalidateQueries({ queryKey: ["encuestas-por-decidir", condominioId] });
    cliente.invalidateQueries({ queryKey: ["anuncios"] });
  };

  const publicar = useMutation({
    mutationFn: (id: string) => publicarResultados(id),
    onSuccess: () => {
      addToast("Resultados publicados", "success");
      refrescar();
    },
    // El motivo viene de la base y está escrito para leerse. Cambiarlo por uno
    // propio es el defecto que costó el 409 del 02/10.
    onError: (e: Error) => addToast(e.message, "error"),
  });

  const ocultar = useMutation({
    mutationFn: (id: string) => dejarResultadosEnBorrador(id),
    onSuccess: () => {
      addToast("Los resultados siguen en borrador", "success");
      refrescar();
    },
    onError: (e: Error) => addToast(e.message, "error"),
  });

  if (pendientes.length === 0) return null;

  const trabajando = publicar.isPending || ocultar.isPending;

  return (
    <View
      className="rounded-2xl p-4"
      style={{
        backgroundColor: theme.colors.warningLight,
        borderWidth: 1,
        borderColor: theme.colors.warning,
      }}
    >
      <Text className="text-base font-bold text-gray-900">
        {pendientes.length === 1
          ? "Una encuesta cerró y espera tu decisión"
          : `${pendientes.length} encuestas cerraron y esperan tu decisión`}
      </Text>
      <Text className="mt-1 text-xs leading-5 text-gray-600">
        Se crearon con los resultados ocultos. Mientras no los publiques, nadie
        los ve.
      </Text>

      {pendientes.map((encuesta) => (
        <View
          key={encuesta.id}
          className="mt-3 rounded-xl bg-white p-3"
        >
          <Text className="text-sm font-bold text-gray-900">
            {encuesta.titulo}
          </Text>
          <Text className="mt-0.5 text-xs text-gray-500">
            Cerró el {formatDate(new Date(encuesta.cerro_en))} ·{" "}
            {encuesta.votos === 1 ? "1 voto" : `${encuesta.votos} votos`}
          </Text>

          <View className="mt-3 flex-row gap-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Publicar los resultados de ${encuesta.titulo}`}
              accessibilityState={{ disabled: trabajando }}
              aria-disabled={trabajando}
              disabled={trabajando}
              onPress={() => publicar.mutate(encuesta.id)}
              className="flex-1 rounded-lg py-2.5"
              style={{
                backgroundColor: trabajando
                  ? theme.colors.borderLight
                  : theme.colors.primary,
              }}
            >
              <Text className="text-center text-xs font-bold text-white">
                Publicar resultados
              </Text>
            </Pressable>

            {/*
              «Dejar en borrador» no es un no-op: la lista deja de molestar y
              queda constancia de que alguien lo miró. Sin este botón, la única
              salida sería publicar, y entonces la pregunta no es una pregunta.
            */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Dejar en borrador los resultados de ${encuesta.titulo}`}
              accessibilityState={{ disabled: trabajando }}
              aria-disabled={trabajando}
              disabled={trabajando}
              onPress={() => ocultar.mutate(encuesta.id)}
              className="flex-1 rounded-lg border py-2.5"
              style={{ borderColor: theme.colors.borderLight }}
            >
              <Text className="text-center text-xs font-bold text-gray-700">
                Dejar en borrador
              </Text>
            </Pressable>
          </View>
        </View>
      ))}
    </View>
  );
}
