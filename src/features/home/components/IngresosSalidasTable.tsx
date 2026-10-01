import { theme } from "@/config";
import { View, Text, ScrollView } from "react-native";

interface IngresoSalidaItem {
  id: number | string;
  nombre: string;
  tipo: string;
  depto: string;
  horaIngreso?: string;
  horaSalida?: string;
  estado: string;
}

interface IngresosSalidasTableProps {
  data: IngresoSalidaItem[];
}

const COLUMNAS = {
  nombre: 170,
  tipo: 110,
  depto: 55,
  ingreso: 65,
  salida: 65,
  estado: 85,
} as const;

const ANCHO_TABLA = 586;

export function IngresosSalidasTable({ data }: IngresosSalidasTableProps) {
  /*
    Sin filas, la tabla pintaba las seis cabeceras y nada debajo: quien mira la
    pantalla no sabe si es que hoy no ha entrado nadie o si el dato no ha
    llegado. Se dice.
  */
  if (data.length === 0) {
    return (
      <View className="py-6 items-center">
        <Text className="text-sm text-gray-500">
          Hoy no hay ingresos ni salidas registrados
        </Text>
      </View>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={{ width: ANCHO_TABLA }}>
        <View className="flex-row gap-1 py-1.5 px-2 rounded-lg bg-gray-50">
          <Text style={{ width: COLUMNAS.nombre }} className="text-2xs font-semibold text-gray-400">
            Nombre
          </Text>
          <Text style={{ width: COLUMNAS.tipo }} className="text-2xs font-semibold text-gray-400">
            Tipo
          </Text>
          <Text style={{ width: COLUMNAS.depto }} className="text-2xs font-semibold text-gray-400 text-center">
            Depto
          </Text>
          <Text style={{ width: COLUMNAS.ingreso }} className="text-2xs font-semibold text-gray-400 text-center">
            Ingreso
          </Text>
          <Text style={{ width: COLUMNAS.salida }} className="text-2xs font-semibold text-gray-400 text-center">
            Salida
          </Text>
          <Text style={{ width: COLUMNAS.estado }} className="text-2xs font-semibold text-gray-400 text-center">
            Estado
          </Text>
        </View>

        {data.map((item, index) => (
          <View
            key={item.id}
            className="flex-row gap-1 py-1.5 px-2 items-center"
            style={{
              backgroundColor: index % 2 === 0 ? "transparent" : theme.colors.bgMuted,
            }}
          >
            <Text
              className="text-xs font-medium text-gray-900"
              numberOfLines={1}
              style={{ width: COLUMNAS.nombre }}
            >
              {item.nombre}
            </Text>
            <Text
              className="text-xs text-gray-500"
              numberOfLines={1}
              style={{ width: COLUMNAS.tipo }}
            >
              {item.tipo}
            </Text>
            <Text
              className="text-xs text-gray-900 text-center"
              style={{ width: COLUMNAS.depto }}
            >
              {item.depto}
            </Text>
            <Text
              className="text-xs text-gray-900 text-center"
              style={{ width: COLUMNAS.ingreso }}
            >
              {item.horaIngreso}
            </Text>
            <Text
              className="text-xs text-gray-900 text-center"
              style={{ width: COLUMNAS.salida }}
            >
              {item.horaSalida}
            </Text>
            <View
              className="px-1.5 py-0.5 rounded-full items-center"
              style={{
                width: COLUMNAS.estado,
                backgroundColor:
                  item.estado === "Ingresó"
                    ? theme.colors.successLight
                    : item.estado === "Finalizado"
                      ? theme.colors.borderLight
                      : theme.colors.secondaryLight,
              }}
            >
              <Text
                className="text-2xs font-semibold"
                numberOfLines={1}
                style={{
                  color:
                    item.estado === "Ingresó"
                      ? theme.colors.success
                      : item.estado === "Finalizado"
                        ? theme.colors.textMuted
                        : theme.colors.secondary,
                }}
              >
                {item.estado}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
