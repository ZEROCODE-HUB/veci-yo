import React from "react";
import { Pressable, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useUbicacionStore } from "@/stores/ubicacion-store";
import { useElegirVivienda } from "@/shared/hooks";
import { nombreDeVivienda } from "@/shared/services/nombreDeVivienda";
import { obtenerResumenDeMisViviendas } from "@/shared/services/viviendaActiva.repo";
import { resumenEnFrases } from "../helpers/resumenDeVivienda";

/**
 * Todas mis viviendas, de un vistazo, en el inicio.
 *
 * Lo pidió el cliente el 09/10/2026: quien tiene más de una propiedad solo
 * veía la activa, y para saber si había un paquete o un huésped en la otra
 * tenía que cambiar de vivienda y mirar. Aquí salen todas con lo que pasa hoy
 * en cada una, y tocar una la deja como activa.
 *
 * Solo aparece con **dos o más**: con una sola, el resto del inicio ya es esa
 * vivienda y esto la repetiría.
 *
 * El ámbito lo fija la base —mis viviendas, aunque además administre el
 * edificio (regla 8)—, así que aquí no se filtra nada.
 */
export function MisViviendas() {
  const ubicaciones = useUbicacionStore((estado) => estado.ubicaciones);
  const elegirVivienda = useElegirVivienda();

  // Las viviendas propias. La estancia de un huésped no es «una vivienda suya».
  const viviendas = ubicaciones.filter(
    (u) => Boolean(u.unidadId) && u.rol !== "huesped-temporal",
  );
  const hayVarias = viviendas.length > 1;

  const { data: resumen = [] } = useQuery({
    queryKey: ["home", "mis-viviendas"],
    queryFn: obtenerResumenDeMisViviendas,
    enabled: hayVarias,
  });

  if (!hayVarias) return null;

  return (
    <View className="gap-2">
      <Text className="text-xs font-semibold text-gray-500">MIS VIVIENDAS</Text>
      {viviendas.map((vivienda) => {
        const deEsta = resumen.find((r) => r.unidadId === vivienda.unidadId);
        const frases = resumenEnFrases(deEsta);
        return (
          <Pressable
            key={vivienda.id}
            onPress={() => elegirVivienda(vivienda.id)}
            accessibilityRole="button"
            accessibilityLabel={`Cambiar a ${nombreDeVivienda(vivienda)}`}
            accessibilityState={{ selected: vivienda.favorito }}
            aria-selected={vivienda.favorito}
            className={`rounded-2xl bg-white px-4 py-3 shadow-sm border ${
              vivienda.favorito ? "border-primary" : "border-transparent"
            }`}
          >
            <View className="flex-row items-center justify-between gap-2">
              <Text
                className="flex-1 text-sm font-bold text-gray-900"
                numberOfLines={1}
              >
                {nombreDeVivienda(vivienda)}
              </Text>
              {vivienda.favorito ? (
                <Text className="text-2xs font-semibold text-primary">
                  ESTÁS AQUÍ
                </Text>
              ) : null}
            </View>
            <Text className="mt-1 text-xs text-gray-500">
              {frases.length > 0 ? frases.join(" · ") : "Sin novedades hoy"}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
