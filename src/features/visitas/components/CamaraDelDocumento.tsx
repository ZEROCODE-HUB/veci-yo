import React, { useRef, useState } from "react";
import { Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Button } from "@/shared/components";
import { tamanoParaLeer } from "../helpers/tamanoDeFoto";

interface Props {
  /** Texto del botón de disparar. */
  etiqueta: string;
  ocupado: boolean;
  onFoto: (uri: string) => void;
  onError: (mensaje: string) => void;
}

/**
 * La cámara para escanear el documento, dentro de la propia app (26/10/2026).
 *
 * Antes se abría la cámara del sistema (`launchCameraAsync`). En Android eso
 * saca a Veciyo de la pantalla, y en el celular del tester la app volvía gris,
 * congelada, y acababa cerrándose (QA 23/10 y 26/10/2026): un Android con poca
 * memoria puede cerrar la app mientras la cámara está delante, y el modal desde
 * el que se abrió no siempre se recupera. Aquí la vista previa va dentro del
 * modal --como el QR de portería, que sí funciona en el celular-- y la foto se
 * toma al tamaño justo para leer un número (`tamanoParaLeer`).
 */
export function CamaraDelDocumento({ etiqueta, ocupado, onFoto, onError }: Props) {
  const camara = useRef<CameraView>(null);
  const [permiso, pedirPermiso] = useCameraPermissions();
  const [tamano, setTamano] = useState<string | undefined>(undefined);
  const [lista, setLista] = useState(false);
  const [disparando, setDisparando] = useState(false);

  if (!permiso?.granted) {
    return (
      <View className="gap-2">
        <Text className="text-xs text-gray-500">
          Hace falta permiso para usar la cámara.
        </Text>
        <Button
          variant="secondary"
          fullWidth
          onPress={() => pedirPermiso().catch(() => onError("No se pudo pedir el permiso de la cámara."))}
        >
          Dar permiso a la cámara
        </Button>
      </View>
    );
  }

  const disparar = async () => {
    if (!camara.current) return;
    setDisparando(true);
    try {
      const foto = await camara.current.takePictureAsync({ quality: 0.5, exif: false, shutterSound: false });
      if (foto?.uri) onFoto(foto.uri);
    } catch {
      onError("No se pudo tomar la foto. Inténtalo otra vez o escribe el número a mano.");
    } finally {
      setDisparando(false);
    }
  };

  return (
    <View className="gap-2">
      <View className="overflow-hidden rounded-xl" style={{ height: 220 }}>
        <CameraView
          ref={camara}
          style={{ flex: 1 }}
          facing="back"
          pictureSize={tamano}
          onCameraReady={async () => {
            setLista(true);
            try {
              const tamanos = await camara.current?.getAvailablePictureSizesAsync();
              setTamano(tamanoParaLeer(tamanos ?? []));
            } catch {
              // Sin la lista se queda el tamaño por defecto de la cámara.
            }
          }}
        />
      </View>
      <Button
        variant="secondary"
        fullWidth
        onPress={disparar}
        loading={ocupado || disparando}
        disabled={!lista}
      >
        {etiqueta}
      </Button>
    </View>
  );
}
