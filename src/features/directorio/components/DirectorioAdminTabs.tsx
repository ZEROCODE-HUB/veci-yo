import { theme } from "@/config";
import { Pressable, Text, View } from "react-native";
export function DirectorioAdminTabs({
  tab,
  onChange,
}: {
  tab: "directorio" | "pagos";
  onChange: (tab: "directorio" | "pagos") => void;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {[
        { key: "directorio", label: "Directorio" },
        { key: "pagos", label: "Pagos / Comité" },
      ].map((item) => (
        <Pressable
          key={item.key}
          onPress={() => onChange(item.key as typeof tab)}
          style={{
            flex: 1,
            padding: 8,
            borderRadius: 999,
            backgroundColor:
              tab === item.key
                ? theme.colors.primary
                : theme.colors.borderLight,
          }}
        >
          <Text
            className="text-center text-sm font-semibold"
            style={{
              color:
                tab === item.key
                  ? theme.colors.textInverse
                  : theme.colors.textSecondary,
            }}
          >
            {item.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
