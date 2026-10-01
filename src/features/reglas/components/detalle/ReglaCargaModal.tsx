import { Text, View } from "react-native";
import { Button, Modal } from "@/shared/components";
import type { ArchivoElegido } from "@/shared/services/archivos";

/**
 * Carga del reglamento del condominio.
 *
 * "Elegir archivo" y "Aceptar" hacían lo mismo: cerrar el modal. Nada subía a
 * ningún sitio y `reglamento.archivo_path` seguía vacía en todos los
 * condominios.
 */
export function ReglaCargaModal({
  visible,
  titulo,
  elegido,
  subiendo,
  onElegir,
  onSubir,
  onClose,
}: {
  visible: boolean;
  /** El reglamento que se está reemplazando. Antes decía siempre "Residentes Temporales". */
  titulo: string;
  elegido: ArchivoElegido | null;
  subiendo: boolean;
  onElegir: () => void;
  onSubir: () => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} onClose={onClose} title="Carga de reglamento">
      <View className="items-center gap-4">
        <Text className="text-base font-semibold text-gray-900 text-center">
          {titulo}
        </Text>
        <Text className="text-sm text-gray-500 text-center">
          Sube un PDF o un documento de Word. Reemplaza al que esté vigente.
        </Text>

        <Button
          variant="secondary"
          fullWidth
          disabled={subiendo}
          onPress={onElegir}
        >
          {elegido ? "Elegir otro archivo" : "Elegir archivo"}
        </Button>

        {elegido && (
          <Text
            className="text-xs text-gray-600 text-center"
            numberOfLines={2}
          >
            {elegido.nombre}
          </Text>
        )}

        <Button
          fullWidth
          disabled={!elegido || subiendo}
          onPress={onSubir}
        >
          {subiendo ? "Subiendo…" : "Subir reglamento"}
        </Button>
      </View>
    </Modal>
  );
}
