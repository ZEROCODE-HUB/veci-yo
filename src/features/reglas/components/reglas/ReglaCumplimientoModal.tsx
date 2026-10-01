import { Text, View } from "react-native";
import { Modal } from "@/shared/components";
import type { DepartamentoRentaCorta } from "../../types/reglas";

export function ReglaCumplimientoModal({
  departamento,
  onClose,
}: {
  departamento: DepartamentoRentaCorta | null;
  onClose: () => void;
}) {
  const items = [
    { key: "antirruido", icon: "🔇", label: "Dispositivo antirruido" },
    { key: "noFumar", icon: "🚭", label: "Señalética de no fumar" },
    { key: "sensor", icon: "🔥", label: "Sensor de incendio/gas/CO2" },
  ];
  return (
    <Modal
      visible={!!departamento}
      onClose={onClose}
      title="Cumplimiento del departamento"
    >
      <View className="gap-3">
        <Text className="text-base font-bold text-gray-900">
          {departamento?.departamento}
        </Text>
        {items.map((item) => {
          const active =
            !!departamento?.cumplimiento[
              item.key as keyof DepartamentoRentaCorta["cumplimiento"]
            ];
          return (
            <View
              key={item.key}
              className="flex-row items-center gap-2.5 rounded-xl bg-gray-50 p-3"
            >
              <Text className="text-lg">{item.icon}</Text>
              <Text className="flex-1 text-sm text-gray-900">{item.label}</Text>
              <Text
                className={`text-xs font-bold ${active ? "text-green-600" : "text-red-500"}`}
              >
                {active ? "Registrado" : "No registrado"}
              </Text>
            </View>
          );
        })}
      </View>
    </Modal>
  );
}
