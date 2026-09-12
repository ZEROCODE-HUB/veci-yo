import { Image, Pressable, Text, View } from "react-native";
import type { ZonaComunConfig } from "@/stores/zonas-store";
import zonaIcons from "@/assets/icons/zonas";

export function ZonasComunesAdminList({
  items,
  onEdit,
  onDelete,
}: {
  items: ZonaComunConfig[];
  onEdit: (item: ZonaComunConfig) => void;
  onDelete: (id: string) => void;
}) {
  return <View className="gap-3"></View>;
}
