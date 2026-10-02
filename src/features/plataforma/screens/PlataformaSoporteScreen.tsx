import React, { useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { theme } from "@/config";
import { Badge, Card, StatusTabs } from "@/shared/components/ui";
import { mensajeDeError } from "@/shared/utils/error.util";
import { useNavegacionPlataforma } from "../hooks/useNavegacionPlataforma";
import { useSoportePlataforma } from "../hooks/usePlataforma";

/**
 * Las PQRS sobre la aplicación.
 *
 * Hasta el 02/10/2026 las leía la administración de cada edificio: la política
 * de lectura no miraba el área, así que quien administra «Las Barranqueras»
 * encontraba entre sus reclamos 114 quejas sobre VeciYo, que no son suyas y no
 * puede resolver. Era el punto 41 de las cosas por revisar, y no se arregló
 * antes porque no había nadie al otro lado a quien dárselas.
 *
 * Esta pantalla es ese alguien.
 */

const ESTADOS = ["Sin atender", "En curso", "Resueltas"] as const;

export function PlataformaSoporteScreen() {
  const navegacion = useNavegacionPlataforma();
  const { reclamos, cargando, error } = useSoportePlataforma();
  const [pestana, setPestana] = useState<string>(ESTADOS[0]);

  const visibles = reclamos.filter((r) => {
    if (pestana === "Sin atender") return r.estado === "pendiente";
    if (pestana === "En curso") return r.estado === "en_curso";
    return r.estado === "resuelto";
  });

  if (cargando) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white px-4 pt-3">
        <StatusTabs
          tabs={[...ESTADOS]}
          active={pestana}
          onChange={(valor) => setPestana(valor ?? ESTADOS[0])}
        />
      </View>

      <ScrollView contentContainerClassName="p-4 gap-3">
        {error ? (
          <Card className="p-4">
            <Text className="text-sm text-danger">
              {mensajeDeError(error, "No se pudieron cargar las PQRS")}
            </Text>
          </Card>
        ) : null}

        {visibles.length === 0 ? (
          <Card className="p-4">
            <Text className="text-sm text-gray-500">
              {pestana === "Sin atender"
                ? "No hay nada esperando. "
                : "Nada aquí por ahora."}
            </Text>
          </Card>
        ) : null}

        {visibles.map((r) => (
          <Card
            key={r.id}
            className="p-4"
            onPress={() =>
              navegacion.navigate("PlataformaSoporteDetalle", { id: r.id })
            }
          >
            <View className="flex-row items-start justify-between gap-3">
              <Text className="flex-1 text-sm font-semibold text-gray-900">
                {r.titulo}
              </Text>
              <Badge
                status={
                  r.estado === "resuelto"
                    ? "Resuelto"
                    : r.estado === "en_curso"
                      ? "En curso"
                      : "Pendiente"
                }
              />
            </View>
            <Text className="mt-1 text-xs text-gray-500">
              {r.numero} · {r.autor} · {r.condominio}
            </Text>
            <Text className="mt-2 text-xs text-gray-600" numberOfLines={2}>
              {r.descripcion}
            </Text>
            <Text className="mt-2 text-xs text-gray-400">{r.creadoEn}</Text>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}
