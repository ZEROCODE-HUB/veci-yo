import { theme } from "@/config";
import React from "react";
import { View, Text, Pressable } from "react-native";
import { Input, Select, Toggle } from "@/shared/components";
import { TIPOS_VEHICULO } from "../../constants";

interface Props {
  tieneVehiculo: boolean;
  setTieneVehiculo: (v: boolean) => void;
  cantidadVehiculos: number;
  setCantidadVehiculos: (v: number) => void;
  vehiculos: { placa: string; tipo: string }[];
  setVehiculos: React.Dispatch<
    React.SetStateAction<{ placa: string; tipo: string }[]>
  >;
}

/** Vehiculos con los que llega la visita. La placa identifica al vehiculo. */
export function VehiculosVisita({
  tieneVehiculo,
  setTieneVehiculo,
  cantidadVehiculos,
  setCantidadVehiculos,
  vehiculos,
  setVehiculos,
}: Props) {
  return (
    <>
      {/* Vehicle section */}
      <View
        className="rounded-2xl p-4 gap-3"
        style={{
          backgroundColor: theme.colors.bgMuted,
          boxShadow: theme.shadows.card,
        }}
      >
        <View className="flex-row items-center justify-between">
          <Text className="text-sm text-gray-900">¿Traes vehículos?</Text>
          <Toggle
            value={tieneVehiculo}
            onChange={setTieneVehiculo}
            labelRight={tieneVehiculo ? "Sí" : "No"}
          />
        </View>
        {tieneVehiculo && (
          <>
            <View className="flex-row items-center gap-2">
              <Text className="text-xs text-gray-500">Cantidad</Text>
              <Input
                value={String(cantidadVehiculos)}
                onChangeText={(v) =>
                  setCantidadVehiculos(Math.max(1, parseInt(v) || 1))
                }
                type="numeric"
                style={{ width: 70 }}
              />
            </View>
            {vehiculos.map((v, idx) => (
              <View
                key={idx}
                className="rounded-xl p-3 gap-2"
                style={{ backgroundColor: theme.colors.borderLight }}
              >
                <Text className="text-xs font-semibold text-gray-500">
                  Vehículo {idx + 1}
                </Text>
                <View className="flex-row gap-2">
                  <View style={{ width: 110 }}>
                    <Select
                      value={v.tipo}
                      options={[...TIPOS_VEHICULO]}
                      onChange={(val) => {
                        const updated = [...vehiculos];
                        updated[idx] = {
                          ...updated[idx],
                          tipo: String(val),
                        };
                        setVehiculos(updated);
                      }}
                    />
                  </View>
                  <View className="flex-1">
                    <Input
                      value={v.placa}
                      onChangeText={(val) => {
                        const updated = [...vehiculos];
                        updated[idx] = {
                          ...updated[idx],
                          placa: val.toUpperCase(),
                        };
                        setVehiculos(updated);
                      }}
                      placeholder="Placa"
                    />
                  </View>
                </View>
              </View>
            ))}
          </>
        )}
      </View>
    </>
  );
}
