import React from "react";
import { View } from "react-native";
import { Input } from "@/shared/components";
import { LimitesDelEdificio } from "../LimitesDelEdificio";
import { SeccionDeConfiguracion } from "./SeccionDeConfiguracion";
import type { Parametros, RentaCorta } from "./tipos";

/** Noches mínimas y máximas y capacidad de la vivienda, con los límites del edificio. */
export function EstanciaYAforo({ renta: r, parametros }: { renta: RentaCorta; parametros: Parametros }) {
  const tope = (clave: string, v: string) =>
    Math.min(parametros.numero(clave), Number(v.replace(/\D/g, "")) || 0);
  return (
    <SeccionDeConfiguracion titulo="Parámetros de estancia y aforo">
      <LimitesDelEdificio limites={r.limites} avisos={r.advertenciasDeLimite} />
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Input
            label="Mínimo de noches"
            value={r.minDias ? String(r.minDias) : ""}
            // Solo cifras: vaciarlo volvía a 1 y teclear «5» daba «15».
            onChangeText={(v) => r.setMinDias(tope("renta_corta_estancia_maxima_noches", v))}
            soloCifras
          />
        </View>
        <View className="flex-1">
          {/* Vacío = sin máximo. El calendario de la nueva reserva no deja pasarse (24/10/2026). */}
          <Input
            label="Máximo de noches"
            value={r.maxDias ? String(r.maxDias) : ""}
            placeholder="Sin máximo"
            onChangeText={(v) => r.setMaxDias(tope("renta_corta_estancia_maxima_noches", v))}
            soloCifras
          />
        </View>
      </View>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Input
            label="Capacidad máxima"
            value={r.maxHuespedes ? String(r.maxHuespedes) : ""}
            // Vacío es «sin fijar», lo mismo que ve el huésped.
            placeholder="Sin fijar"
            onChangeText={(v) => r.setMaxHuespedes(tope("renta_corta_capacidad_maxima", v))}
            soloCifras
          />
        </View>
      </View>
    </SeccionDeConfiguracion>
  );
}
