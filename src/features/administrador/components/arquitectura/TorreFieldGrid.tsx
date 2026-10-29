import { Controller, type Control } from "react-hook-form";
import { View } from "react-native";
import { Input } from "@/shared/components";
import type { TowerFormValues } from "../../types";

/*
  Todos opcionales (pedido del cliente, 29/10/2026: lo obligatorio con «*», lo
  demás con «(opcional)»). Vuelven «Departamentos por torre», «Penthouse» y las
  dos cocheras: los dos primeros solo se muestran en la tarjeta; las cocheras
  **crean** esa cantidad de estacionamientos con su código (ver
  `completarCocheras`). Eran desplegables con listas fijas hasta el
  20/10/2026: un número se escribe.
*/
const towerFields: Array<[keyof TowerFormValues, string]> = [
  ["pisos", "Pisos (opcional)"],
  ["sotanos", "Sótanos (opcional)"],
  ["depto", "Departamentos por torre (opcional)"],
  ["penthouse", "Penthouse (opcional)"],
  ["cocherasPrivadas", "Cocheras privadas (opcional)"],
  ["cocherasVisitas", "Cocheras de visitas (opcional)"],
  ["almacenPrivados", "Almacenes privados (opcional)"],
  ["entradasPeatonales", "Entradas peatonales (opcional)"],
  ["entradasVehiculares", "Entradas vehiculares (opcional)"],
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
              .map(([name, label]) => (
                <View key={name} className="flex-1">
                  <Controller
                    control={control}
                    name={name}
                    render={({ field, fieldState }) => (
                      <Input
                        label={label}
                        value={field.value}
                        onChangeText={field.onChange}
                        onBlur={field.onBlur}
                        placeholder="0"
                        soloCifras
                        error={fieldState.error?.message}
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
        render={({ field, fieldState }) => (
          <Input
            label="Ubicación estacionamientos de visita (opcional)"
            value={field.value}
            onChangeText={field.onChange}
            placeholder="Ej: Sotano -2"
          error={fieldState.error?.message}
          />
        )}
      />
    </View>
  );
}
