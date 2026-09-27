import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/config";
import { Button } from "@/shared/components";
import type { ArchivoElegido } from "@/shared/services/archivos";

/**
 * Los archivos que se adjuntan **al crear** la PQRS.
 *
 * El formulario decía "Podrás adjuntar documentos e imágenes una vez creada la
 * PQRS", que era cierto pero no es lo que se pide: una queja por ruido o una
 * fuga se sostienen con una foto, y pedirla en un segundo paso hace que casi
 * nadie la suba.
 *
 * La política del bucket comprueba que quien sube puede ver el reclamo, así
 * que la fila tiene que existir primero. Por eso aquí solo se **eligen**: se
 * guardan en memoria y `crearReclamo` los sube en cuanto tiene el id.
 */
export function ReclamoAdjuntosNuevos({
  archivos,
  deshabilitado,
  onAgregarDocumento,
  onAgregarImagen,
  onQuitar,
}: {
  archivos: ArchivoElegido[];
  deshabilitado: boolean;
  onAgregarDocumento: () => void;
  onAgregarImagen: () => void;
  onQuitar: (indice: number) => void;
}) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold text-gray-900">
        Adjuntos (opcional)
      </Text>

      <View className="flex-row gap-2">
        <View className="flex-1">
          <Button
            variant="secondary"
            fullWidth
            disabled={deshabilitado}
            onPress={onAgregarDocumento}
          >
            Documento
          </Button>
        </View>
        <View className="flex-1">
          <Button
            variant="secondary"
            fullWidth
            disabled={deshabilitado}
            onPress={onAgregarImagen}
          >
            Imagen
          </Button>
        </View>
      </View>

      {archivos.map((archivo, indice) => (
        <View
          key={`${archivo.uri}-${indice}`}
          className="flex-row items-center justify-between rounded-lg bg-white px-3 py-2"
        >
          <Text
            className="flex-1 pr-2 text-xs text-gray-700"
            numberOfLines={1}
          >
            {archivo.nombre}
          </Text>
          <Pressable
            accessibilityLabel="Quitar este adjunto"
            onPress={() => onQuitar(indice)}
            disabled={deshabilitado}
            hitSlop={8}
          >
            <Ionicons
              name="close-circle-outline"
              size={20}
              color={theme.colors.textSecondary}
            />
          </Pressable>
        </View>
      ))}
    </View>
  );
}
