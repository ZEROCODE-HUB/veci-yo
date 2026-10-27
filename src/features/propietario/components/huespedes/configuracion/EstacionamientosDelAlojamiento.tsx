import React from "react";
import { Text, View } from "react-native";
import { theme } from "@/config";
import { Input } from "@/shared/components";
import { SeccionDeConfiguracion } from "./SeccionDeConfiguracion";
import type { RentaCorta } from "./tipos";

/** Cuántos vehículos puede registrar el huésped en su preregistro. */
export function EstacionamientosDelAlojamiento({ renta: r }: { renta: RentaCorta }) {
  return (
    <SeccionDeConfiguracion titulo="Configuración de estacionamientos">
      <View className="flex-row items-center gap-3">
        <View className="w-[100px]">
          <Input
            label="Cantidad"
            value={r.estacionamientosProp === null ? "" : String(r.estacionamientosProp)}
            placeholder="Sin indicar"
            onChangeText={(v) =>
              r.setEstacionamientosProp(v.trim() === "" ? null : parseInt(v, 10) || 0)
            }
            soloCifras
          />
        </View>
        <Text className="text-sm flex-1" style={{ color: theme.colors.textSecondary }}>
          Estacionamientos para tus huéspedes
        </Text>
      </View>
      <View className="rounded-xl p-3 mt-3" style={{ backgroundColor: theme.colors.bgMuted }}>
        <Text className="text-xs" style={{ color: theme.colors.textMuted, lineHeight: 18 }}>
          {/*
            Prometía una alerta que salía de los estacionamientos de visita del
            edificio, no de este número (hueco 17). Decidido con el cliente el
            25/10/2026: en el preregistro bloquea, con 0 no se registra ninguno
            y vacío no limita.
          */}
          Tu huésped no puede registrar más vehículos que este número en su
          preregistro, y con 0 no puede registrar ninguno. Déjalo vacío si no
          quieres poner límite.
        </Text>
      </View>
    </SeccionDeConfiguracion>
  );
}
