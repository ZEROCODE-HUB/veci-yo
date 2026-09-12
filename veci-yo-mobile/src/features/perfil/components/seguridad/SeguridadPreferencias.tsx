import { View, Text } from "react-native";
import { Controller, type Control } from "react-hook-form";
import { Toggle } from "@/shared/components";
import type { SeguridadFormularioValores } from "../../schemas/seguridad.schema";

const preferencias = [
  { key: "faceId" as const, label: "Face ID" },
  { key: "huellaDactilar" as const, label: "Huella Dactilar" },
  { key: "f2a" as const, label: "Factor F2A" },
  { key: "pausarCuenta" as const, label: "Pausar cuenta" },
];

export function SeguridadPreferencias({
  control,
  onChange,
  onPausar,
}: {
  control: Control<SeguridadFormularioValores>;
  onChange: (
    key: "faceId" | "huellaDactilar" | "f2a" | "pausarCuenta",
    value: boolean,
  ) => void;
  onPausar: () => void;
}) {
  return (
    <View
      className="bg-white rounded-xl p-4"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      <Text className="text-base font-bold text-gray-900 text-center mb-1">
        Usabilidad
      </Text>
      {preferencias.map((item, index) => (
        <Controller
          key={item.key}
          control={control}
          name={item.key}
          render={({ field }) => (
            <View
              className="flex-row items-center justify-between py-3.5"
              style={{
                borderBottomWidth: index === preferencias.length - 1 ? 0 : 1,
                borderBottomColor: "#F3F4F6",
              }}
            >
              <Text className="text-base text-gray-900">{item.label}</Text>
              <Toggle
                value={field.value}
                onChange={(value) => {
                  if (item.key === "pausarCuenta") {
                    if (value) onPausar();
                    else {
                      field.onChange(false);
                      onChange(item.key, false);
                    }
                  } else {
                    field.onChange(value);
                    onChange(item.key, value);
                  }
                }}
              />
            </View>
          )}
        />
      ))}
    </View>
  );
}
