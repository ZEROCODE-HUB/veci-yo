import { Text, View } from "react-native";
import type { ReactNode } from "react";
import type { ReglaContenido } from "../../types/reglas";

export function ReglaContenidoCard({
  content,
  acciones,
}: {
  content: ReglaContenido;
  acciones?: ReactNode;
}) {
  return (
    <View
      className="rounded-2xl bg-white p-4 gap-4"
      style={{
        elevation: 3,
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      }}
    >
      {acciones}
      <Text className="text-lg font-bold text-gray-900 text-center underline">
        Reglamento
      </Text>
      {content.sections.map((section) => (
        <View key={section.title || section.items[0]} className="gap-2">
          {section.title ? (
            <Text className="text-base font-bold text-gray-900">
              {section.title}
            </Text>
          ) : null}
          {section.items.map((item) => (
            <View key={item} className="flex-row gap-2">
              <Text className="text-sm text-gray-900">•</Text>
              <Text className="flex-1 text-sm text-gray-900 leading-5">
                {item}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
