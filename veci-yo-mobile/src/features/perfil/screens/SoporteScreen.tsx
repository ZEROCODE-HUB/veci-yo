import React from "react";
import { View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { PerfilStackParamList } from "@/shared/types";
import { SoporteSeccionCard } from "../components/soporte";

const iconFaq = require("@/assets/icons/soporte/finales/preguntas_frecuentes_1.png");
const iconReclamos = require("@/assets/icons/soporte/finales/reclamos_1.png");
const iconContacto = require("@/assets/icons/soporte/finales/contacto.png");
type Nav = NativeStackNavigationProp<PerfilStackParamList>;
const secciones = [
  {
    key: "faq",
    label: "Preguntas frecuentes",
    icon: iconFaq,
    destino: "PreguntasFrecuentes" as const,
  },
  {
    key: "reclamos",
    label: "Centro de Atención",
    icon: iconReclamos,
    destino: "Reclamos" as const,
  },
  {
    key: "contacto",
    label: "Contacto",
    icon: iconContacto,
    destino: "ContactoSoporte" as const,
  },
];

export function SoporteScreen() {
  const navigation = useNavigation<Nav>();
  return (
    <View className="flex-1 bg-gray-50 p-4">
      <View className="flex-row flex-wrap justify-between gap-3">
        {secciones.map((seccion) => (
          <SoporteSeccionCard
            key={seccion.key}
            icon={seccion.icon}
            label={seccion.label}
            onPress={() => navigation.navigate(seccion.destino)}
          />
        ))}
      </View>
    </View>
  );
}
