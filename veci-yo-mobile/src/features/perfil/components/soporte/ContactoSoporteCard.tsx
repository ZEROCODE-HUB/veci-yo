import { View, Text } from "react-native";
import { contactoSoporte } from "../../soporteMockData";

export function ContactoSoporteCard({
  contacto,
}: {
  contacto: typeof contactoSoporte;
}) {
  const filas = [
    { label: "Telefono:", value: contacto.telefono },
    { label: "Email:", value: contacto.email },
    { label: "Ubicación:", value: contacto.ubicacion },
    { label: "Horarios:", value: contacto.horarios },
  ];
  return (
    <View
      className="rounded-2xl overflow-hidden"
      style={{
        backgroundColor: "#fff",
        borderWidth: 1.5,
        borderColor: "#F59E0B",
      }}
    >
      {filas.map((fila, index) => (
        <View
          key={fila.label}
          className="flex-row items-center justify-between gap-4 py-4 px-4"
          style={{
            borderBottomWidth: index === filas.length - 1 ? 0 : 1,
            borderBottomColor: "#F3F4F6",
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
