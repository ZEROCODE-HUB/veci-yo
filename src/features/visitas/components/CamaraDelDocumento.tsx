import React, { useRef, useState } from "react";
import { Platform, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { theme } from "@/config";
import { Button } from "@/shared/components";
import { anotarError, anotarYEsperar } from "@/shared/services/erroresDeLaApp";
import { tamanoParaLeer } from "../helpers/tamanoDeFoto";

interface Props {
  /** Texto del botón de disparar. */
  etiqueta: string;
  ocupado: boolean;
  onFoto: (uri: string) => void;
  onError: (mensaje: string) => void;
  /**
   * Un código de barras del documento, leído en vivo mientras la cámara está
   * delante (05/11/2026). Sin esto la cámara no busca códigos.
   */
  onCodigo?: (tipo: string, data: string) => void;
}

/**
 * Los códigos que traen los documentos de identidad: el PDF417 del reverso de
 * la cédula colombiana y el Code39 del DNI peruano. Solo esos dos: cada tipo
 * de más gasta batería y puede leer lo que no es (el QR de la cédula digital
 * va cifrado y no sirve).
 */
const CODIGOS_DEL_DOCUMENTO = ["pdf417", "code39"] as const;

/** Proporción de una tarjeta de identidad (ISO/IEC 7810 ID-1). */
const PROPORCION_DE_TARJETA = 85.6 / 54;

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
 *
 * 05/11/2026 (Para Claude 225, otra vez): ocho escaneos de la misma cédula
 * leyeron el apellido y no el número. Ahora:
 *   · mientras la cámara está delante se leen los códigos del reverso, sin
 *     pulsar nada (`onCodigo`);
 *   · un marco con la forma de una tarjeta dice dónde poner el documento, para
 *     que llene la foto y las cifras salgan grandes;
 *   · la vista previa es más alta, hay linterna, y la foto es más grande.
 *
 * El marco es una guía, no un recorte: recortar exige girar la foto según cómo
 * se sostuvo el celular, y girarla es justo lo que tumbaba la app en Android.
 */
export function CamaraDelDocumento({ etiqueta, ocupado, onFoto, onError, onCodigo }: Props) {
  const camara = useRef<CameraView>(null);
  const [permiso, pedirPermiso] = useCameraPermissions();
  const [tamano, setTamano] = useState<string | undefined>(undefined);
  const [lista, setLista] = useState(false);
  const [disparando, setDisparando] = useState(false);
  const [linterna, setLinterna] = useState(false);

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
    // Rastro de cada paso: si el celular se queda en blanco, lo último anotado
    // dice dónde (QA 26/10/2026).
    try {
      await anotarYEsperar("escaneo: disparar", `tamaño ${tamano ?? "por defecto"}`);
      /*
        `skipProcessing` solo en Android: el registro del 26/10/2026 dejó
        «escaneo: disparar» y nada más --la app murió dentro de la toma--.
        Sin esto, Android abre la foto entera para girarla y escalarla, y en
        un celular con poca memoria eso la tumba; ML Kit respeta la
        orientación anotada en la foto, así que no hace falta girarla.
        En iPhone es al revés: el lector de Apple recibe la imagen sin esa
        anotación, y una foto sin girar le llega de lado.
      */
      const foto = await camara.current.takePictureAsync({
        quality: 0.7,
        skipProcessing: Platform.OS === "android",
        shutterSound: false,
      });
      await anotarYEsperar("escaneo: foto tomada", `${foto?.width ?? "?"}x${foto?.height ?? "?"}`);
      if (foto?.uri) onFoto(foto.uri);
    } catch (e) {
      anotarError("escaneo: tomar la foto", e);
      onError("No se pudo tomar la foto. Inténtalo otra vez o apruébalo a mano.");
    } finally {
      setDisparando(false);
    }
  };

  const buscarCodigos = Boolean(onCodigo) && !ocupado && !disparando;

  return (
    <View className="gap-2">
      <View className="overflow-hidden rounded-xl" style={{ height: 300 }}>
        <CameraView
          ref={camara}
          style={{ flex: 1 }}
          facing="back"
          pictureSize={tamano}
          enableTorch={linterna}
          barcodeScannerSettings={{ barcodeTypes: [...CODIGOS_DEL_DOCUMENTO] }}
          onBarcodeScanned={buscarCodigos ? ({ type, data }) => onCodigo?.(type, data) : undefined}
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
        {/* El marco: no captura toques, para no tapar la cámara. */}
        <View
          pointerEvents="none"
          className="absolute inset-0 items-center justify-center"
        >
          <View
            accessibilityLabel="Marco para el documento"
            style={{
              width: "88%",
              aspectRatio: PROPORCION_DE_TARJETA,
              borderWidth: 2,
              borderRadius: 12,
              borderColor: theme.colors.primary,
            }}
          />
          <Text
            className="mt-2 rounded-full px-3 py-1 text-xs"
            style={{ color: theme.colors.textInverse, backgroundColor: theme.colors.bgOverlay }}
          >
            El documento dentro del marco, de cerca
          </Text>
        </View>
      </View>
      <Button
        variant="secondary"
        size="sm"
        fullWidth
        disabled={!lista}
        onPress={() => setLinterna((antes) => !antes)}
      >
        {linterna ? "🔦 Apagar la linterna" : "🔦 Encender la linterna"}
      </Button>
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
