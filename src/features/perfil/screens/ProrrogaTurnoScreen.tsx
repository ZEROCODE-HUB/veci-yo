import React from "react";
import { Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { theme } from "@/config";
import { Button, Cargando } from "@/shared/components";
import { ScreenLayout } from "@/shared/layouts";
import { useParametros } from "@/shared/hooks";
import { useAuthStore, useUIStore } from "@/stores";
import { formatDate, formatTime } from "@/shared/utils";
import { mensajeDeError } from "@/shared/utils/error.util";
import { obtenerDetalleDeProrroga, resolverProrroga } from "../services/prorroga.repo";

const ESTADO: Record<string, string> = {
  pendiente: "Esperando respuesta",
  aceptada: "Aceptada",
  rechazada: "Rechazada",
};

/**
 * El detalle de una prórroga de turno, al que lleva el aviso (Para Claude 178,
 * 30/10/2026): quién la pide, hasta qué hora y por qué. La administración la
 * acepta o la rechaza; el guardia ve en qué quedó.
 */
export function ProrrogaTurnoScreen() {
  const { id } = useParametros("ProrrogaTurno");
  const rolActivo = useAuthStore((s) => s.rolActivo);
  const addToast = useUIStore((s) => s.addToast);
  const client = useQueryClient();
  const clave = ["prorroga-turno", id];
  const detalle = useQuery({ queryKey: clave, queryFn: () => obtenerDetalleDeProrroga(id) });

  const responder = useMutation({
    mutationFn: (acepta: boolean) => resolverProrroga(id, acepta),
    onSuccess: (_d, acepta) => {
      addToast(acepta ? "Prórroga aceptada" : "Prórroga rechazada", "success");
      void client.invalidateQueries({ queryKey: clave });
    },
    onError: (e) => addToast(mensajeDeError(e, "No se pudo responder la prórroga"), "error"),
  });

  const p = detalle.data;
  return (
    <ScreenLayout withScroll>
      {detalle.isLoading ? <Cargando variante="enLinea" texto="la prórroga" /> : null}
      {detalle.isError ? (
        <Text className="text-sm text-gray-500">
          {mensajeDeError(detalle.error, "No se pudo cargar la prórroga")}
        </Text>
      ) : null}
      {detalle.isSuccess && !p ? (
        <Text className="text-sm text-gray-500">Esta prórroga ya no está disponible.</Text>
      ) : null}
      {p ? (
        <View className="gap-3 rounded-2xl p-4" style={{ backgroundColor: theme.colors.bgCard }}>
          <Text className="text-base font-bold text-gray-900">Solicitud de prórroga</Text>
          <Text className="text-sm text-gray-900">{`Guardia: ${p.guardia}`}</Text>
          <Text className="text-sm text-gray-900">{`Hasta: ${formatTime(p.hasta)} del ${formatDate(p.hasta)}`}</Text>
          <Text className="text-sm text-gray-900">{`Motivo: ${p.motivo}`}</Text>
          <Text className="text-xs text-gray-500">
            {`Pedida el ${formatDate(p.pedidaEn)} a las ${formatTime(p.pedidaEn)} · ${ESTADO[p.estado] ?? p.estado}`}
          </Text>
          {p.estado === "pendiente" && rolActivo === "administrador" ? (
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Button
                  variant="danger"
                  fullWidth
                  disabled={responder.isPending}
                  onPress={() => responder.mutate(false)}
                >
                  Rechazar
                </Button>
              </View>
              <View className="flex-1">
                <Button
                  fullWidth
                  disabled={responder.isPending}
                  loading={responder.isPending}
                  onPress={() => responder.mutate(true)}
                >
                  Aceptar
                </Button>
              </View>
            </View>
          ) : null}
        </View>
      ) : null}
    </ScreenLayout>
  );
}
