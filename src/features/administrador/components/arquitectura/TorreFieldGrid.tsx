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

  Desde el 16/11/2026 las dos cocheras solo salen al **editar** una torre de
  antes: al crear, los estacionamientos se piden por nivel
  (`EstacionamientosPorNivel`). Y desde el 17/11/2026 ni eso ni «Sótanos»: el
  cliente pidió quitar el sótano de la torre --se crea después, en
  Estacionamientos, eligiendo de qué torre es--.
*/
/** Los campos de texto del formulario (no las filas de niveles). */
type CampoDeTexto = {
  [K in keyof TowerFormValues]: TowerFormValues[K] extends string ? K : never;
}[keyof TowerFormValues];

const towerFields: Array<[CampoDeTexto, string]> = [
  ["pisos", "Pisos (opcional)"],
  ["depto", "Departamentos por torre (opcional)"],
  ["penthouse", "Penthouse (opcional)"],
  ["cocherasPrivadas", "Cocheras privadas (opcional)"],
  ["cocherasVisitas", "Cocheras de visitas (opcional)"],
  ["almacenPrivados", "Almacenes privados (opcional)"],
  ["entradasPeatonales", "Entradas peatonales (opcional)"],
  ["entradasVehiculares", "Entradas vehiculares (opcional)"],
];

const COCHERAS: CampoDeTexto[] = ["cocherasPrivadas", "cocherasVisitas"];

export function TorreFieldGrid({
  control,
  conCocheras,
}: {
  control: Control<TowerFormValues>;
  conCocheras: boolean;
}) {
  const campos = conCocheras
    ? towerFields
    : towerFields.filter(([name]) => !COCHERAS.includes(name));
  return (
    <View className="gap-3">
      {Array.from({ length: Math.ceil(campos.length / 2) }).map(
        (_, row) => (
          <View key={row} className="flex-row gap-3">
            {campos
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
