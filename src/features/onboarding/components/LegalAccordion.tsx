import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

interface LegalDoc {
  id: string;
  titulo: string;
  contenido: string;
}

const LEGAL_DOCS: LegalDoc[] = [
  {
    id: "terminos",
    titulo: "Términos y Condiciones de la App y Web",
    contenido:
      "1. Aceptación de los Términos\n\nAl registrarse en VeciYo, el usuario acepta cumplir con los presentes términos y condiciones de uso.",
  },
  {
    id: "datos",
    titulo: "Tratamiento de Datos Personales",
    contenido:
      "1. Marco Legal\n\nEsta política se rige por la Ley de Protección de Datos Personales vigente.",
  },
  {
    id: "privacidad",
    titulo: "Política de Privacidad",
    contenido:
      "1. Recopilación de Datos\n\nVeciYo recopila información personal necesaria para el funcionamiento de la plataforma.",
  },
  {
    id: "condominio",
    titulo: "Términos y Condiciones del Condominio",
    contenido:
      "1. Normas de Convivencia\n\nTodos los residentes se comprometen a mantener un comportamiento respetuoso.",
  },
];

interface LegalAccordionProps {
  docs?: LegalDoc[];
}

export function LegalAccordion({ docs = LEGAL_DOCS }: LegalAccordionProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggle = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <View className="gap-2">
      {docs.map((doc) => {
        const isOpen = openId === doc.id;
        return (
          <View
            key={doc.id}
            className="border border-gray-200 rounded-md overflow-hidden bg-white"
          >
            <Pressable
              onPress={() => toggle(doc.id)}
              className="flex-row items-center justify-between px-4 py-3.5"
              style={{
                backgroundColor: isOpen ? "#FFF8E1" : "#FFFFFF",
              }}
            >
              <Text className="flex-1 text-base font-semibold text-gray-900">
                {doc.titulo}
              </Text>
              <Ionicons
                name={isOpen ? "chevron-up" : "chevron-down"}
                size={20}
                color="#6B7280"
              />
            </Pressable>
            {isOpen && (
              <View className="px-4 pb-4">
                <Text className="text-sm text-gray-900 leading-5">
                  {doc.contenido}
                </Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
