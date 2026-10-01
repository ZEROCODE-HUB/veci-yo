import React from "react";
import { View, Text } from "react-native";
import { ContactoSoporteCard } from "../components/soporte";
import { useContactoSoporte } from "../hooks/useSoporte";

export function ContactoSoporteScreen() {
  const { contacto, cargando } = useContactoSoporte();

  return (
    <View className="flex-1 bg-gray-50 p-4">
      {contacto && <ContactoSoporteCard contacto={contacto} />}
      {!cargando && !contacto && (
        <Text className="text-center text-gray-400 py-8">
          La administración todavía no cargó sus datos de contacto.
        </Text>
      )}
    </View>
  );
}
