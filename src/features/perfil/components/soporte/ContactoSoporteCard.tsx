import { theme } from "@/config";
import { View, Text } from "react-native";
import type { ContactoSoporte } from "../../services";

export function ContactoSoporteCard({
  contacto,
}: {
  contacto: ContactoSoporte;
}) {
  // Un dato que la administración no cargó no se muestra vacío: se omite.
  const filas = [
    { label: "Teléfono:", value: contacto.telefono },
    { label: "Email:", value: contacto.email },
    { label: "Ubicación:", value: contacto.ubicacion },
    { label: "Horarios:", value: contacto.horarios },
  ].filter((fila): fila is { label: string; value: string } => !!fila.value);
  return (
    <View
      className="rounded-2xl overflow-hidden"
      style={{
        backgroundColor: theme.colors.bgCard,
        borderWidth: 1.5,
        borderColor: theme.colors.warning,
      }}
    >
      {filas.map((fila, index) => (
        <View
          key={fila.label}
          className="flex-row items-center justify-between gap-4 py-4 px-4"
          style={{
            borderBottomWidth: index === filas.length - 1 ? 0 : 1,
            borderBottomColor: theme.colors.borderLight,
          }}
        >
          <Text
            className="text-base font-bold text-gray-900"
            style={{ flexShrink: 0 }}
          >
            {fila.label}
          </Text>
          <Text
            className="text-base text-gray-900 text-right"
            style={{ flex: 1 }}
          >
            {fila.value}
          </Text>
        </View>
      ))}
    </View>
  );
}
