import React from "react";
import { Text, View } from "react-native";
import { theme } from "@/config";
import { CampoFecha, Input } from "@/shared/components";
import { formatDateIso } from "@/shared/utils";
import { ConexionTra } from "../../ConexionTra";
import { SeccionDeConfiguracion } from "./SeccionDeConfiguracion";
import type { RentaCorta } from "./tipos";

/** El RNT de la vivienda y la conexión con la TRA. */
export function CumplimientoLegal({ renta: r, esDueno }: { renta: RentaCorta; esDueno: boolean }) {
  const { legal, setLegal } = r;
  return (
    <SeccionDeConfiguracion titulo="Cumplimiento legal">
      <View>
        <Text className="text-sm mb-1.5 font-medium" style={{ color: theme.colors.textSecondary }}>
          RNT (Registro Nacional de Turismo)
        </Text>
        {/*
          Solo el dueño lo carga o lo cambia (KT 0.6 y 4.1; lo exige la base
          desde el 15/10/2026). Los demás lo ven.
        */}
        {esDueno ? (
          <View className="gap-3">
            <Input
              value={legal.rnt}
              onChangeText={(v) => setLegal((p) => ({ ...p, rnt: v }))}
              placeholder="Ej: RNT-12345"
            />
            <CampoFecha
              label="Vence el"
              value={legal.venceEn}
              onChange={(fecha) => setLegal((p) => ({ ...p, venceEn: fecha }))}
              placeholder="Sin fecha de vencimiento"
            />
          </View>
        ) : (
          <View className="gap-1">
            <Text className="text-sm font-semibold text-gray-900">
              {legal.rnt || "Sin cargar"}
              {legal.venceEn ? ` · vence el ${formatDateIso(legal.venceEn)}` : ""}
            </Text>
            <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
              Solo el propietario de la vivienda puede cargarlo o cambiarlo.
            </Text>
          </View>
        )}
      </View>

      {/*
        La TRA va aquí: es el otro dato del mismo trámite, y reportar es un acto
        del anfitrión sobre su vivienda con su RNT. Todo el lado de la base
        existía desde el 02/10/2026 y **no lo llamaba nadie**: no había dónde
        poner el token. Lo preguntó el cliente el 09/10.
      */}
      <ConexionTra
        estado={r.estadoTra}
        onGuardarToken={r.guardarTokenTra}
        guardando={r.guardandoTokenTra}
        onArmar={r.armarTra}
        armando={r.armandoTra}
      />
    </SeccionDeConfiguracion>
  );
}
