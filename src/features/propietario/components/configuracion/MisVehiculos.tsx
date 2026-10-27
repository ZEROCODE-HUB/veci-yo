import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { theme } from "@/config";
import { Button } from "@/shared/components";
import { useParametrosDeLaBase } from "@/shared/hooks";
import { useUIStore } from "@/stores";
import { errorDePlaca } from "@/features/visitas/helpers/validarVisita";
import {
  TIPOS_VEHICULO_RESIDENTE,
  useVehiculosResidente,
  type VehiculoResidente,
} from "../../hooks/useVehiculosResidente";
import { ModalesConfiguracion } from "./ModalesConfiguracion";
import { ESTILO_DE_TARJETA } from "./gruposDeResidentes";

/**
 * Los vehículos de la vivienda, con su alta.
 *
 * Vivían en un `useState` de la pantalla: se perdían al salir y no llegaban a
 * la portería. Las cocheras son las **de verdad** de la vivienda: se buscaba la
 * vivienda comparando dos identificadores que nunca coinciden, así que salía
 * siempre «0 de 0» y no había forma de registrar un vehículo (13/10/2026).
 */
export function MisVehiculos({ unidadId }: { unidadId: string }) {
  const parametrosDeLaBase = useParametrosDeLaBase();
  const { addToast } = useUIStore();
  const { vehiculos, agregar, quitar, guardando, cocheras } = useVehiculosResidente(unidadId);
  const [mostrarAlta, setMostrarAlta] = useState(false);
  const [form, setForm] = useState({ placa: "", tipo: TIPOS_VEHICULO_RESIDENTE[0] });

  const agregarVehiculo = () => {
    if (!form.placa.trim()) {
      addToast("Ingresa la placa del vehículo", "error");
      return;
    }
    if (vehiculos.length >= cocheras) {
      addToast(`Esta vivienda tiene ${cocheras} cochera(s): no caben más vehículos.`, "error");
      return;
    }
    // La regla de todas las placas, con el largo de la base: aquí eran 4 a
    // 10 con un mensaje que decía 8 (Parametrización, 25/10/2026).
    const errorPlaca = parametrosDeLaBase.listo
      ? errorDePlaca(form.placa, {
          minimo: parametrosDeLaBase.numero("placa_largo_minimo"),
          maximo: parametrosDeLaBase.numero("placa_largo_maximo"),
        })
      : "";
    if (errorPlaca) {
      addToast(errorPlaca, "error");
      return;
    }
    agregar({ placa: form.placa, tipo: form.tipo });
    setForm({ placa: "", tipo: TIPOS_VEHICULO_RESIDENTE[0] });
    setMostrarAlta(false);
  };

  return (
    <>
      <Text className="text-sm font-bold text-gray-900 mt-2">Mis Vehículos</Text>
      <View className="rounded-2xl p-4" style={ESTILO_DE_TARJETA}>
        <Text className="text-xs text-center mb-3" style={{ color: theme.colors.textMuted }}>
          {vehiculos.length} de {cocheras} estacionamiento(s) asignado(s)
        </Text>
        {vehiculos.length > 0 && (
          <View className="flex-col gap-2 mb-3">
            {vehiculos.map((v: VehiculoResidente) => (
              <View
                key={v.uuid}
                className="flex-row justify-between items-center p-2.5 rounded-xl"
                style={{ backgroundColor: theme.colors.bgMuted }}
              >
                <View>
                  <Text className="text-base font-bold text-gray-900">{v.placa}</Text>
                  <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
                    {v.tipo}
                  </Text>
                </View>
                <Pressable onPress={() => quitar(v.uuid)}>
                  <Text className="text-xs font-medium" style={{ color: theme.colors.danger }}>
                    Eliminar
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
        {vehiculos.length < cocheras && (
          <Button variant="primary" onPress={() => setMostrarAlta(true)}>
            + Agregar vehículo
          </Button>
        )}
        {/*
          Sin cocheras no hay botón, y hay que decir por qué. Salía «0 de 0
          estacionamiento(s) asignado(s)» y nada más: indistinguible de una
          pantalla rota (13/10/2026).
        */}
        {cocheras === 0 && (
          <Text className="text-xs text-gray-500">
            Esta vivienda no tiene cocheras asignadas. Se asignan desde la
            administración del edificio.
          </Text>
        )}
      </View>

      <ModalesConfiguracion
        showAgregarVehiculo={mostrarAlta}
        setShowAgregarVehiculo={setMostrarAlta}
        formVehiculo={form}
        setFormVehiculo={setForm}
        handleAgregarVehiculo={agregarVehiculo}
        cantidadVehiculos={vehiculos.length}
        maxEstacionamientos={cocheras}
        guardandoVehiculo={guardando}
      />
    </>
  );
}
