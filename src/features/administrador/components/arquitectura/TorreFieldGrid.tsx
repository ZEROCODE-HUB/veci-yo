import { Controller, type Control } from "react-hook-form";
import { View } from "react-native";
import { Input, Select } from "@/shared/components";
import type { TowerFormValues } from "../../types";

/*
  "Depto. por torre" y "Penthouse" estaban aqui y **no se guardaban**: no
  son columnas de `torre` ni las escribe `torreHaciaFila`. La
  administracion las rellenaba y se tiraban, y la tarjeta de la torre las
  pintaba siempre como "-". Se retiran en vez de inventarles una columna:
  cuantas viviendas tiene una torre se cuenta con las viviendas, y
  "Penthouse Si/No" para una torre entera no significa nada en el modelo.

  Con ellas se va "Tipo", que era **el mismo campo que el "Tipo de
  nomenclatura" de unas lineas mas arriba en el mismo modal**: dos
  controles sobre la misma clave del formulario, y tampoco se guardaba.
  El rango (`nomenclatura_desde`/`hasta`) si es columna y se queda.
*/
const towerFields: Array<[keyof TowerFormValues, string, string[]]> = [
  ["pisos", "Número de pisos", ["1", "2", "3", "4", "5", "6", "8", "10"]],
  ["sotanos", "Número de sótanos", ["0", "1", "2", "3", "4"]],
  /*
    Aqui estaban «Cocheras de visitas» y «Cocheras privadas». Se guardaban en
    `torre` y no creaban ninguna cochera, asi que la Torre 3 tenia 10
    declaradas y cero de verdad --y la lista de torres, que cuenta las reales,
    decia «0» mientras la ficha decia «10»--.

    Las cocheras se dan de alta una a una en la pestaña «Estacionamientos» de la
    torre, como los depositos. Decidido con el cliente el 30/09/2026
    (REVISAR-A-OJO 72): un numero que nadie usa acaba contradiciendo al real.
  */
  ["almacenPrivados", "Almacén privados", ["0", "1", "2", "3", "4", "5"]],
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
        render={({ field, fieldState }) => (
          <Input
            label="Ubicación estacionamientos de visita"
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
