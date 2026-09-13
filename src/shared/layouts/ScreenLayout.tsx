import React from "react";
import { View, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { ToastContainer } from "@/shared/components/ui/Toast";
import { SafeAreaView } from "react-native-safe-area-context";

interface ScreenLayoutProps {
  children: React.ReactNode;
  withScroll?: boolean;
  withToast?: boolean;
  padding?: boolean;
  edges?: ("top" | "bottom" | "left" | "right")[];
  floatingChild?: React.ReactNode;
}

export function ScreenLayout({
  children,
  withScroll = true,
  withToast = true,
  padding = true,
  edges = ["left", "right"],
  floatingChild,
}: ScreenLayoutProps) {
  const content = withScroll ? (
    <ScrollView
      className="flex-1 bg-bg-app"
      contentContainerStyle={padding ? { padding: 16 } : undefined}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View
      className="flex-1 bg-bg-app"
      style={padding ? { padding: 16 } : undefined}
    >
      {children}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-bg-app" edges={edges}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={{ flex: 1 }}>
          {content}
          {floatingChild}
        </View>
        {withToast && <ToastContainer />}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
