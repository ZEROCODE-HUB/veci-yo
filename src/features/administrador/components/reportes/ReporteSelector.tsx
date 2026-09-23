import { Pressable, Text, View } from "react-native";

/**
 * La lista de reportes que puede generar la administración.
 *
 * Estaba escrito en una sola línea, contra la regla 12.
 */

interface Reporte {
  id: string;
  label: string;
  icon: string;
}

interface Props {
  reportes: ReadonlyArray<Reporte>;
  onSelect: (id: string) => void;
}

export function ReporteSelector({ reportes, onSelect }: Props) {
  return (
    <>
      {reportes.map((reporte) => (
        <Pressable
          key={reporte.id}
          onPress={() => onSelect(reporte.id)}
          className="flex-row items-center gap-3 rounded-2xl bg-white p-5"
          style={{
            elevation: 2,
            shadowColor: "#000",
            shadowOpacity: 0.06,
            shadowRadius: 7,
            shadowOffset: { width: 0, height: 2 },
          }}
        >
          <View className="h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100">
            <Text className="text-2xl">{reporte.icon}</Text>
          </View>
          <Text className="flex-1 text-base font-semibold text-gray-900">
            {reporte.label}
          </Text>
        </Pressable>
      ))}
    </>
  );
}
