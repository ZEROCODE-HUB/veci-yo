import React from "react";
import { View } from "react-native";
import { Input, SegunLaCarga } from "@/shared/components";
import { LimitesDelEdificio } from "../LimitesDelEdificio";
import { SeccionDeConfiguracion } from "./SeccionDeConfiguracion";
import type { Parametros, RentaCorta } from "./tipos";

/** Noches mínimas y máximas y capacidad de la vivienda, con los límites del edificio. */
export function EstanciaYAforo({ renta: r, parametros }: { renta: RentaCorta; parametros: Parametros }) {
  const tope = (clave: string, v: string) =>
    Math.min(parametros.numero(clave), Number(v.replace(/\D/g, "")) || 0);
  return (
    <SeccionDeConfiguracion titulo="Parámetros de estancia y aforo">
      {/* Sin los límites decía «el edificio no ha fijado un mínimo» (13/11/2026). */}
      <SegunLaCarga
        estado={r.cargaDeLimites}
        texto="los límites del edificio"
        forma="lineas"
        cuantos={2}
        enLinea
      >
        <LimitesDelEdificio limites={r.limites} avisos={r.advertenciasDeLimite} />
      </SegunLaCarga>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Input
            label="Mínimo de noches *"
            explicacion="Lo menos que puede quedarse un huésped en una reserva."
            value={r.minDias ? String(r.minDias) : ""}
            error={r.erroresConfig.minDias}
            // Solo cifras: vaciarlo volvía a 1 y teclear «5» daba «15».
            onChangeText={(v) => r.setMinDias(tope("renta_corta_estancia_maxima_noches", v))}
            soloCifras
          />
        </View>
        <View className="flex-1">
          {/* Vacío = sin máximo. El calendario de la nueva reserva no deja pasarse (24/10/2026). */}
          <Input
            label="Máximo de noches (opcional)"
            explicacion="Lo más que puede quedarse un huésped. Déjalo vacío si no hay máximo."
            value={r.maxDias ? String(r.maxDias) : ""}
            error={r.erroresConfig.maxDias}
            placeholder="Sin máximo"
            onChangeText={(v) => r.setMaxDias(tope("renta_corta_estancia_maxima_noches", v))}
            soloCifras
          />
        </View>
      </View>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Input
            label="Capacidad máxima *"
            explicacion="Cuántas personas pueden alojarse a la vez en la vivienda, contando a los niños."
            value={r.maxHuespedes ? String(r.maxHuespedes) : ""}
            error={r.erroresConfig.maxHuespedes}
            // Obligatoria, como el mínimo de noches: al guardar se pide al menos 1
            // (Para Claude 113, 27/10/2026).
            placeholder="Ej.: 4"
            onChangeText={(v) => r.setMaxHuespedes(tope("renta_corta_capacidad_maxima", v))}
            soloCifras
          />
        </View>
      </View>
    </SeccionDeConfiguracion>
  );
}
