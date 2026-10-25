import { theme } from "@/config";
import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Badge, Button, Modal } from "@/shared/components";

export function AdminRow({
  title,
  subtitle,
  status,
  onPress,
  onDelete,
}: {
  title: string;
  subtitle?: string;
  status?: string;
  onPress?: () => void;
  onDelete?: () => void;
}) {
  /*
    La papelera pregunta antes. Borraba al primer toque --una vivienda, una
    cochera, un depósito--, a un dedo de distancia de abrir la fila
    (13/10/2026).
  */
  const [confirmando, setConfirmando] = useState(false);

  return (
    <>
      <Pressable
        onPress={onPress}
        className="flex-row items-center gap-3 border-b border-gray-100 py-3"
      >
        <View className="flex-1">
          <Text className="text-sm font-semibold text-gray-900">{title}</Text>
          {Boolean(subtitle) && (
            <Text className="text-xs text-gray-500 mt-1">{subtitle}</Text>
          )}
        </View>
        {status ? <Badge status={status}>{status}</Badge> : null}
        {onDelete && (
          <Pressable
            hitSlop={10}
            accessibilityLabel={`Eliminar ${title}`}
            onPress={(event) => {
              event.stopPropagation();
              setConfirmando(true);
            }}
            className="p-2"
          >
            <Ionicons
              name="trash-outline"
              size={18}
              color={theme.colors.danger}
            />
          </Pressable>
        )}
        {onPress && (
          <Ionicons
            name="chevron-forward"
            size={18}
            color={theme.colors.textMuted}
          />
        )}
      </Pressable>
      {onDelete ? (
        <Modal
          visible={confirmando}
          onClose={() => setConfirmando(false)}
          title="Eliminar"
        >
          <View className="gap-4">
            <Text className="text-base text-center text-gray-900">
              ¿Eliminar <Text className="font-bold">{title}</Text>?
            </Text>
            <Button
              variant="danger"
              fullWidth
              onPress={() => {
                setConfirmando(false);
                onDelete();
              }}
            >
              <Text>Eliminar</Text>
            </Button>
            <Button
              variant="ghost"
              fullWidth
              onPress={() => setConfirmando(false)}
            >
              <Text>Cancelar</Text>
            </Button>
          </View>
        </Modal>
      ) : null}
    </>
  );
}
