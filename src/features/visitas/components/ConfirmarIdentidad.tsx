import { theme } from "@/config";
import React, { useState } from "react";
import { Image, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Button, Cargando } from "@/shared/components";

interface Props {
  nombre: string;
  /** Las fotos del documento que subió en su preregistro, ya firmadas. */
  fotosGuardadas: string[];
  cargando: boolean;
  /** Las dos comprobaciones pasaron: se sigue con el número. */
  onConfirmado: () => void;
}

type Paso = "persona" | "escaneo" | "listo" | "no_es" | "no_coincide";

/**
 * Los dos primeros pasos del registro de entrada de un huésped (16/10/2026).
 *
 * La responsable de producto:
 *   1. «le muestra el documento guardado y le pide confirmar que son la misma
 *      persona»;
 *   2. «escanear el documento y ahí confirma que son el mismo documento; no se
 *      guarda. Se comparan imágenes, anverso y reverso, y que se compare con
 *      texto». «Desarrollar primero visualmente».
 *
 * Así que esto es lo visual: el guardia pone lo guardado al lado de lo que
 * escanea y decide él. Lo escaneado vive solo en la pantalla, no se sube. La
 * comparación automática de imágenes y de texto queda para después
 * (REVISAR-A-OJO); la de texto ya la hace la base con el número, en el paso
 * siguiente.
 */
export function ConfirmarIdentidad({ nombre, fotosGuardadas, cargando, onConfirmado }: Props) {
  const [paso, setPaso] = useState<Paso>("persona");
  const [escaneadas, setEscaneadas] = useState<string[]>([]);
  const [aviso, setAviso] = useState("");

  const escanear = async () => {
    setAviso("");
    const permiso = await ImagePicker.requestCameraPermissionsAsync();
    if (!permiso.granted) {
      setAviso("Hace falta permiso para usar la cámara.");
      return;
    }
    const r = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.5 });
    if (r.canceled || !r.assets[0]) return;
    setEscaneadas((antes) => [...antes, r.assets[0].uri].slice(-2));
  };

  if (paso === "no_es" || paso === "no_coincide") {
    return (
      <View className="gap-3 rounded-xl p-3" style={{ backgroundColor: theme.colors.badgeRedBg }}>
        <Text className="text-sm font-bold" style={{ color: theme.colors.badgeRedText }}>
          {paso === "no_es"
            ? "No es la misma persona"
            : "El documento no coincide con el registrado"}
        </Text>
        <Text className="text-sm" style={{ color: theme.colors.badgeRedText }}>
          No la dejes entrar. Avisa al anfitrión para que lo revise.
        </Text>
        <Button variant="secondary" fullWidth onPress={() => setPaso("persona")}>
          Volver a comprobar
        </Button>
      </View>
    );
  }

  if (paso === "listo") {
    return (
      <Text className="text-xs font-semibold text-green-700">
        ✓ Misma persona y mismo documento
      </Text>
    );
  }

  return (
    <View className="gap-3">
      {paso === "persona" ? (
        <View className="gap-2">
          <Text className="text-xs font-semibold text-gray-500">1. ¿ES LA MISMA PERSONA?</Text>
          <Text className="text-sm text-gray-700">
            Este es el documento que subió <Text className="font-bold">{nombre}</Text> en su
            preregistro. Compáralo con quien tienes delante.
          </Text>
          {cargando ? (
            <Cargando texto="el documento" variante="enLinea" />
          ) : (
            <FilaDeFotos urls={fotosGuardadas} vacio="No subió fotos de su documento." />
          )}
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Button fullWidth onPress={() => setPaso("escaneo")}>
                Sí, es la misma
              </Button>
            </View>
            <View className="flex-1">
              <Button variant="danger" fullWidth onPress={() => setPaso("no_es")}>
                No es
              </Button>
            </View>
          </View>
        </View>
      ) : (
        <View className="gap-2">
          <Text className="text-xs font-semibold text-gray-500">2. ESCANEA SU DOCUMENTO</Text>
          <Text className="text-sm text-gray-700">
            Toma el anverso y el reverso. No se guarda: es para compararlo aquí con lo
            registrado.
          </Text>
          <Text className="text-2xs font-semibold text-gray-500">Registrado</Text>
          <FilaDeFotos urls={fotosGuardadas} vacio="Sin fotos registradas." />
          <Text className="text-2xs font-semibold text-gray-500">Escaneado ahora</Text>
          <FilaDeFotos urls={escaneadas} vacio="Todavía no has escaneado." />
          <Button variant="secondary" fullWidth onPress={escanear}>
            {escaneadas.length === 0
              ? "📷 Escanear anverso"
              : escaneadas.length === 1
                ? "📷 Escanear reverso"
                : "📷 Escanear de nuevo"}
          </Button>
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Button
                fullWidth
                disabled={escaneadas.length === 0}
                onPress={() => {
                  setPaso("listo");
                  onConfirmado();
                }}
              >
                Son el mismo
              </Button>
            </View>
            <View className="flex-1">
              <Button
                variant="danger"
                fullWidth
                disabled={escaneadas.length === 0}
                onPress={() => setPaso("no_coincide")}
              >
                No coinciden
              </Button>
            </View>
          </View>
        </View>
      )}
      {aviso ? <Text className="text-xs text-red-600 text-center">{aviso}</Text> : null}
    </View>
  );
}

function FilaDeFotos({ urls, vacio }: { urls: string[]; vacio: string }) {
  if (urls.length === 0) {
    return <Text className="text-xs text-gray-400">{vacio}</Text>;
  }
  return (
    <View className="flex-row gap-2">
      {urls.map((url) => (
        <Image
          key={url}
          source={{ uri: url }}
          accessibilityLabel="Foto del documento"
          style={{ flex: 1, height: 110, borderRadius: 8, backgroundColor: theme.colors.borderLight }}
          resizeMode="contain"
        />
      ))}
    </View>
  );
}
