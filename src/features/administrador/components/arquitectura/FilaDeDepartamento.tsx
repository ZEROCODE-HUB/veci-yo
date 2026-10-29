import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/config";
import { Badge, Button, Modal } from "@/shared/components";

/**
 * Un departamento en la lista de su torre (29/10/2026).
 *
 * El cliente pidió quitar la papelera y la flecha y dejar un ⋮ con «Editar»,
 * «Ver detalle» y «Eliminar», como en el prototipo. Eliminar sigue
 * preguntando antes.
 */
export function FilaDeDepartamento({
  titulo,
  subtitulo,
  estado,
  onEditar,
  onVerDetalle,
  onEliminar,
}: {
  titulo: string;
  subtitulo?: string;
  estado?: string;
  onEditar: () => void;
  onVerDetalle: () => void;
  onEliminar: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  return (
    <>
      <Pressable onPress={onVerDetalle} className="flex-row items-center gap-3 border-b border-gray-100 py-3">
        <View className="flex-1">
          <Text className="text-sm font-semibold text-gray-900">{titulo}</Text>
          {subtitulo ? <Text className="text-xs text-gray-500 mt-1">{subtitulo}</Text> : null}
        </View>
        {estado ? <Badge status={estado}>{estado}</Badge> : null}
        <Pressable
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`Opciones de ${titulo}`}
          onPress={(event) => {
            event.stopPropagation();
            setMenu(true);
          }}
          className="p-2"
        >
          <Ionicons name="ellipsis-vertical" size={18} color={theme.colors.textSecondary} />
        </Pressable>
      </Pressable>

      <Modal visible={menu} onClose={() => setMenu(false)} title={titulo}>
        <View className="gap-3">
          <Button
            variant="secondary"
            fullWidth
            onPress={() => {
              setMenu(false);
              onEditar();
            }}
          >
            <Text>Editar</Text>
          </Button>
          <Button
            variant="secondary"
            fullWidth
            onPress={() => {
              setMenu(false);
              onVerDetalle();
            }}
          >
            <Text>Ver detalle</Text>
          </Button>
          <Button
            variant="danger"
            fullWidth
            onPress={() => {
              setMenu(false);
              setConfirmando(true);
            }}
          >
            <Text>Eliminar</Text>
          </Button>
        </View>
      </Modal>

      <Modal visible={confirmando} onClose={() => setConfirmando(false)} title="Eliminar">
        <View className="gap-4">
          <Text className="text-base text-center text-gray-900">
            ¿Eliminar <Text className="font-bold">{titulo}</Text>?
          </Text>
          <Button
            variant="danger"
            fullWidth
            onPress={() => {
              setConfirmando(false);
              onEliminar();
            }}
          >
            <Text>Eliminar</Text>
          </Button>
          <Button variant="ghost" fullWidth onPress={() => setConfirmando(false)}>
            <Text>Cancelar</Text>
          </Button>
        </View>
      </Modal>
    </>
  );
}
