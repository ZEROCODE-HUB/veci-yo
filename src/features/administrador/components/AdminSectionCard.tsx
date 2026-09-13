import React from "react";
import { Text, View } from "react-native";

export function AdminSectionCard({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <View
      className="rounded-2xl bg-white p-4 gap-3"
      style={{
        elevation: 3,
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      }}
    >
      {title && (
        <Text className="text-base font-bold text-gray-900 text-center">
          {title}
        </Text>
      )}
      {children}
    </View>
  );
}
