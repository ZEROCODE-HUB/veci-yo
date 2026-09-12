import React from "react";
import { View } from "react-native";
import { contactoSoporte } from "../soporteMockData";
import { ContactoSoporteCard } from "../components/soporte";

export function ContactoSoporteScreen() {
  return (
    <View className="flex-1 bg-gray-50 p-4">
      <ContactoSoporteCard contacto={contactoSoporte} />
    </View>
  );
}
