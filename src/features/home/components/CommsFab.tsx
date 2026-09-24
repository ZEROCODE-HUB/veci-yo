import { theme } from "@/config";
import React, { useState } from "react";
import { View, Pressable, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { navigateToRoute } from "@/navigation/helpers/navigation.helpers";

export function CommsFab() {
  const navigation = useNavigation<any>();
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      {expanded && (
        <Pressable
          style={{ position: "absolute", inset: 0, zIndex: 98 }}
          onPress={() => setExpanded(false)}
        />
      )}
      <View
        style={{
          position: "absolute",
          bottom: 80,
          right: 16,
          zIndex: 99,
          alignItems: "flex-end",
          gap: 10,
        }}
      >
        {expanded && (
          <>
            <Pressable
              onPress={() => {
                setExpanded(false);
                navigateToRoute(navigation, "Chat");
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                backgroundColor: theme.colors.bgCard,
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 20,
                boxShadow: theme.shadows.cardFuerte,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: theme.colors.text,
                }}
              >
                Chat
              </Text>
              <Ionicons
                name="chatbubble-outline"
                size={18}
                color={theme.colors.secondary}
              />
            </Pressable>
            <Pressable
              onPress={() => {
                setExpanded(false);
                navigateToRoute(navigation, "Llamada");
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                backgroundColor: theme.colors.bgCard,
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 20,
                boxShadow: theme.shadows.cardFuerte,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: theme.colors.text,
                }}
              >
                Llamar
              </Text>
              <Ionicons
                name="call-outline"
                size={18}
                color={theme.colors.success}
              />
            </Pressable>
          </>
        )}
        <Pressable
          onPress={() => setExpanded(!expanded)}
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: theme.colors.primary,
            alignItems: "center",
            justifyContent: "center",
            boxShadow: theme.shadows.fab,
          }}
        >
          <Ionicons
            name={expanded ? "close" : "chatbubbles"}
            size={24}
            color={theme.colors.text}
          />
        </Pressable>
      </View>
    </>
  );
}
