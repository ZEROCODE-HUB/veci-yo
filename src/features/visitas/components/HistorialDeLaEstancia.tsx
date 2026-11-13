import React from "react";
import { Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Button, SegunLaCarga, estadoDe } from "@/shared/components";
import { useNavegacion } from "@/shared/hooks/useNavegacion";
import { navigateToRoute } from "@/navigation/helpers/navigation.helpers";
import { desdeLaBase, formatDateTime } from "@/shared/utils";
import type { VisitaItem } from "@/shared/types";
import {
  obtenerHistorialDeLaEstancia,
  type MomentoDeLaEstancia,
} from "../services/visitas.repo";

const ICONO: Record<MomentoDeLaEstancia["tipo"], string> = {
  entrada: "🟢",
  salida: "🔴",
  visita: "👤",
  correspondencia: "📦",
  zona: "🏊",
  pqrs: "📝",
};

/**
 * El historial del alojamiento durante esta estancia, y la PQRS desde la
 * reserva (responsable de producto, 16/10/2026): «si entró visitas, si entró
 * un rappi, si reservó una piscina…; por alojamiento, todo el historial;
 * mostrar al anfitrión en los detalles de reserva».
 *
 * La PQRS la registra la portería o la administración, no el anfitrión, y solo
 * cuando el huésped ya entró: antes no hay nada que reclamar de esa estancia
 * (cliente, 16/10/2026). Por eso el botón sale solo con `conPqrs`.
 */
export function HistorialDeLaEstancia({
  visita,
  conPqrs = false,
}: {
  visita: VisitaItem;
  conPqrs?: boolean;
}) {
  const navigation = useNavegacion();
  const consulta = useQuery({
    queryKey: ["visitas", "historial-estancia", visita.uuid],
    queryFn: () => obtenerHistorialDeLaEstancia(visita.uuid!),
    enabled: Boolean(visita.uuid),
  });
  const data = consulta.data ?? [];

  return (
    <View className="rounded-2xl bg-white p-4 gap-2 shadow-sm">
      <Text className="text-base font-bold text-gray-900">
        Historial de registros de esta reserva
      </Text>
      {/*
        Si la consulta falla no se dice «Todavía no ha pasado nada»: se dice
        que no se pudo cargar, con Reintentar (13/11/2026).
      */}
      <SegunLaCarga estado={estadoDe(consulta)} texto="el historial" forma="lineas" enLinea>
        {data.length === 0 ? (
          <Text className="text-xs text-gray-500">
            Todavía no ha pasado nada en la vivienda durante esta estancia.
          </Text>
        ) : (
          data.map((m, i) => (
            <View key={`${m.momento}-${i}`} className="flex-row gap-2">
              <Text style={{ fontSize: 14 }}>{ICONO[m.tipo] ?? "•"}</Text>
              <View className="flex-1">
                <Text className="text-sm text-gray-900">{m.titulo}</Text>
                <Text className="text-2xs text-gray-500">
                  {formatDateTime(desdeLaBase(m.momento))}
                  {m.detalle ? ` · ${m.detalle}` : ""}
                </Text>
              </View>
            </View>
          ))
        )}
      </SegunLaCarga>
      {conPqrs ? (
        <Button
          size="sm"
          variant="secondary"
          onPress={() =>
            navigateToRoute(navigation, "ReclamoNuevo", {
              unidadDenunciadaId: visita.unidadId,
              visitaId: visita.uuid,
              tituloPreseleccionado: `Estancia ${visita.fechaDesde ?? ""}${
                visita.fechaHasta ? ` a ${visita.fechaHasta}` : ""
              }`,
            })
          }
        >
          Registrar PQRS de esta estancia
        </Button>
      ) : null}
    </View>
  );
}
