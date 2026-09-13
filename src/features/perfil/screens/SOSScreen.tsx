import React from "react";
import { View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SosAlarma } from "../components/sos";

export function SOSScreen() {
  const navigation = useNavigation();
  return (
    <View className="flex-1 bg-gray-50">
      <SosAlarma
        onCancelar={() => navigation.goBack()}
        onGuardia={() => navigation.goBack()}
      />
    </View>
  );
}
