import { View, Text } from "react-native";
import { Controller, type Control } from "react-hook-form";
import { Input } from "@/shared/components";
import type { SeguridadFormularioValores } from "../../schemas/seguridad.schema";

export function SeguridadContacto({
  control,
  onChange,
}: {
  control: Control<SeguridadFormularioValores>;
  onChange: (value: string) => void;
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
      <Text className="text-base font-bold text-gray-900 text-center mb-3.5">
        Información Contacto
      </Text>
      <Controller
        control={control}
        name="correoRespaldo"
        render={({ field }) => (
          <Input
            label="Correo de respaldo"
            value={field.value}
            onChangeText={(value) => {
              field.onChange(value);
              onChange(value);
            }}
          />
        )}
      />
    </View>
  );
}
