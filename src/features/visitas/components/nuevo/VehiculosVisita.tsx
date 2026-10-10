import { theme } from "@/config";
import React from "react";
import { View, Text } from "react-native";
import { Contador, Input, Select, Toggle } from "@/shared/components";
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
            <View
              style={{ height: 1, backgroundColor: theme.colors.borderLight }}
            />
            <Contador
              emoji="🚗"
              label="Cantidad"
              ayuda="Cada uno necesita su placa."
              valor={cantidadVehiculos}
              minimo={1}
              onCambiar={setCantidadVehiculos}
            />
            {vehiculos.map((v, idx) => (
              <View
                key={idx}
                className="rounded-xl p-3 gap-3"
                style={{ backgroundColor: theme.colors.borderLight }}
              >
                <Text className="text-xs font-semibold text-gray-500">
                  Vehículo {idx + 1}
                </Text>
                {/*
                  En columna, y la placa primero.

                  Estaban en fila, con el tipo en 110 px fijos: «Automóvil» no
                  cabia --quedaban 56 px de texto-- asi que la etiqueta llegaba
                  pegada al chevron y los dos al borde. A 376 px de pantalla no
                  hay sitio para un desplegable y un campo uno al lado del otro.

                  Y la placa va arriba porque es la que **identifica** el
                  vehiculo: es lo que mira la porteria y lo unico que no se
                  puede dejar vacio para que la fila se guarde.
                */}
                <Input
                  label="Placa"
                  value={v.placa}
                  onChangeText={(val) => {
                    const updated = [...vehiculos];
                    updated[idx] = {
                      ...updated[idx],
                      placa: val.toUpperCase(),
                    };
                    setVehiculos(updated);
                  }}
                  placeholder="ABC123"
                />
                <Select
                  label="Tipo"
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
            ))}
          </>
        )}
      </View>
    </>
  );
}
