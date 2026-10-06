import { theme } from "@/config";
import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Cargando } from "@/shared/components";

interface LegalDoc {
  id: string;
  titulo: string;
  contenido: string;
}


/**
 * Los documentos legales, desplegables.
 *
 * Los llevaba dentro, escritos a mano y **con un párrafo de relleno cada
 * uno**: para cambiarlos —para poner el texto de verdad— había que publicar la
 * aplicación. Ahora los recibe: salen de `documento_legal`.
 */
interface LegalAccordionProps {
  docs: LegalDoc[];
  cargando?: boolean;
}

export function LegalAccordion({ docs, cargando }: LegalAccordionProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggle = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  if (cargando) {
    return (
      <Cargando variante="enLinea" texto="los documentos" />
    );
  }

  if (docs.length === 0) {
    return (
      <Text className="text-sm text-center text-gray-500">
        No se pudieron cargar los documentos legales.
      </Text>
    );
  }

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
                backgroundColor: isOpen ? theme.colors.primaryLight : theme.colors.bgCard,
              }}
            >
              <Text className="flex-1 text-base font-semibold text-gray-900">
                {doc.titulo}
              </Text>
              <Ionicons
                name={isOpen ? "chevron-up" : "chevron-down"}
                size={20}
                color={theme.colors.textSecondary}
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
