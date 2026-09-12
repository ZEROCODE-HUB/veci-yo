import { Controller, type Control } from "react-hook-form";
import { View } from "react-native";
import { Input, Select } from "@/shared/components";
import type { TowerFormValues } from "../../types";

const towerFields: Array<[keyof TowerFormValues, string, string[]]> = [
  ["depto", "Depto. por torre", ["1", "2", "3", "4", "5", "6", "8"]],
  ["penthouse", "Penthouse", ["Si", "No"]],
  ["tipo", "Tipo", ["101, 102, 103...", "A-101, A-102...", "Personalizada"]],
  ["pisos", "Numero de pisos", ["1", "2", "3", "4", "5", "6", "8", "10"]],
  ["sotanos", "Numero de sotanos", ["0", "1", "2", "3", "4"]],
  [
    "cocherasVisitas",
    "Cocheras de visitas",
    ["0", "1", "2", "3", "4", "5", "10"],
  ],
  [
    "cocherasPrivadas",
    "Cocheras privadas",
    ["0", "1", "2", "3", "4", "5", "10"],
  ],
  ["almacenPrivados", "Almacen privados", ["0", "1", "2", "3", "4", "5"]],
  ["entradasPeatonales", "Entradas peatonales", ["1", "2", "3", "4"]],
  ["entradasVehiculares", "Entradas vehiculares", ["1", "2", "3", "4"]],
];

export function TorreFieldGrid({
  control,
}: {
  control: Control<TowerFormValues>;
}) {
  return (
    <View className="gap-3">
      {Array.from({ length: Math.ceil(towerFields.length / 2) }).map(
        (_, row) => (
          <View key={row} className="flex-row gap-3">
            {towerFields
              .slice(row * 2, row * 2 + 2)
              .map(([name, label, options]) => (
                <View key={name} className="flex-1">
                  <Controller
                    control={control}
                    name={name}
                    render={({ field }) => (
                      <Select
                        label={label}
                        value={field.value}
                        options={options}
                        placeholder="Seleccionar"
                        onChange={field.onChange}
                      />
                    )}
                  />
                </View>
              ))}
          </View>
        ),
      )}
      <Controller
        control={control}
        name="ubicacionParkingVisitas"
        render={({ field }) => (
          <Input
            label="Ubicacion estacionamientos de visita"
            value={field.value}
            onChangeText={field.onChange}
            placeholder="Ej: Sotano -2"
          />
        )}
      />
    </View>
  );
}
