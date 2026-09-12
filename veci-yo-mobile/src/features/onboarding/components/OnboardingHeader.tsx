import React from "react";
import { View, Text } from "react-native";
import { Logo } from "@/shared/components";

export function OnboardingHeader() {
  return (
    <View className="flex-row items-center justify-center gap-2.5 pt-[22px] pb-4 px-4">
      <Logo size={40} />
      <Text className="text-xl font-bold text-gray-900">Veciyo</Text>
    </View>
  );
}
