import { Text, View } from "react-native";
import { Button, Modal } from "@/shared/components";

/**
 * Descarga del reglamento.
 *
 * Mostraba el nombre de un archivo y un botón "Aceptar" que cerraba el modal:
 * era un cartel. Ahora abre el documento con una URL firmada, porque el bucket
 * es privado.
 */
export function ReglaDescargaModal({
  visible,
  file,
  abriendo,
  onAbrir,
  onClose,
}: {
  visible: boolean;
  /** Ruta en el bucket. Se muestra solo el nombre del archivo. */
  file: string;
  abriendo: boolean;
  onAbrir: () => void;
  onClose: () => void;
}) {
  const nombre = file.slice(file.lastIndexOf("/") + 1);

  return (
    <Modal visible={visible} onClose={onClose} title="Descarga de reglamento">
      <View className="items-center gap-4">
        <Text
          className="text-base font-semibold text-gray-900 text-center"
          numberOfLines={2}
        >
          {nombre}
        </Text>
        <Button fullWidth disabled={abriendo} onPress={onAbrir}>
          {abriendo ? "Abriendo…" : "Abrir documento"}
        </Button>
        <Button variant="secondary" fullWidth onPress={onClose}>
          Cancelar
        </Button>
      </View>
    </Modal>
  );
}
