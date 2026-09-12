import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import * as Clipboard from "expo-clipboard";

interface CopiarFilaProps {
  label: string;
  value: string;
  mono?: boolean;
}

export function CopiarFila({ label, value, mono }: CopiarFilaProps) {
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    await Clipboard.setStringAsync(value);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  };

  return (
    <View
      className="flex-row items-center justify-between gap-3 px-3 py-2.5 rounded-xl"
      style={{
        backgroundColor: "#F9FAFB",
        borderWidth: 1,
        borderColor: "#E5E7EB",
      }}
    >
      <View className="flex-1" style={{ minWidth: 0 }}>
        <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
          {label}
        </Text>
        <Text
          className="text-base text-gray-900 font-medium"
          style={{ fontFamily: mono ? "monospace" : undefined }}
        >
          {value}
        </Text>
      </View>
      <Pressable
        onPress={copiar}
        className="px-3.5 py-2 rounded-full flex-shrink-0"
        style={{
          borderWidth: 1.5,
          borderColor: copiado ? "#16A34A" : "#F5B800",
          backgroundColor: copiado ? "#16A34A" : "#F5B800",
        }}
      >
        <Text className="text-xs font-semibold text-white">
          {copiado ? "✓ Copiado" : "Copiar"}
        </Text>
      </Pressable>
    </View>
  );
}

