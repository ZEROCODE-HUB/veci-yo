import { theme } from "@/config";
import { View, Text } from "react-native";
import { Controller, type Control } from "react-hook-form";
import { Toggle } from "@/shared/components";
import type { SeguridadFormularioValores } from "../../schemas/seguridad.schema";

/*
  Eran cuatro. Face ID, la huella y el «Factor F2A» se quitaron el 29/09/2026:
  no hacian nada --el store es en memoria-- y el de 2FA prometia una segunda
  barrera inexistente. Queda pausar la cuenta, que si avisa de que todavia no
  esta disponible en vez de fingir.
*/
const preferencias = [
  { key: "pausarCuenta" as const, label: "Pausar cuenta" },
];

export function SeguridadPreferencias({
  control,
  onChange,
  onPausar,
}: {
  control: Control<SeguridadFormularioValores>;
  onChange: (key: "pausarCuenta", value: boolean) => void;
  onPausar: () => void;
}) {
  return (
    <View
      className="bg-white rounded-xl p-4"
      style={{
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      <Text className="text-base font-bold text-gray-900 text-center mb-1">
        Cuenta
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
                borderBottomColor: theme.colors.borderLight,
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
