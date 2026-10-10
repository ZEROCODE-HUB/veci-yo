import { theme } from "@/config";
import React, { useState } from "react";
import { Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Button } from "@/shared/components";

interface Props {
  nombre: string;
  /** Si esta persona escribió su documento en el preregistro. */
  tieneDocumento: boolean;
  /** Si ya hay una foto de portería guardada de antes. */
  fotoTomada: boolean;
  /** Manda la foto. Lo que devuelve la cámara, tal cual. */
  onTomarFoto?: (uri: string) => Promise<void>;
  /** Manda el número que se lee en el documento. Responde si coincide. */
  onVerificar?: (numero: string) => Promise<boolean>;
  onCerrar: () => void;
}

/**
 * Lo que la portería hace con el documento de quien llega: una foto y un número.
 *
 * Decidido con el cliente el 09/10/2026:
 *
 *   · **la foto es constancia**. La toma el guardia con la cámara, sube al
 *     servidor —que le pone la marca de agua— y no se queda en el teléfono;
 *   · **«coincide» es número contra número**: el que el guardia lee en el
 *     documento contra el que el huésped escribió. Lo decide la base, no este
 *     componente: aquí no se compara nada.
 *
 * Hasta ese día la comparación la hacía la pantalla, letra por letra —«1.234»
 * no era «1234»—, y solo se ofrecía a un tipo de visita.
 */
export function VerificarEnPorteria({
  nombre,
  tieneDocumento,
  fotoTomada,
  onTomarFoto,
  onVerificar,
  onCerrar,
}: Props) {
  const [numero, setNumero] = useState("");
  const [aviso, setAviso] = useState("");
  const [fotoLista, setFotoLista] = useState(fotoTomada);
  const [subiendo, setSubiendo] = useState(false);
  const [verificando, setVerificando] = useState(false);

  const tomarFoto = async () => {
    if (!onTomarFoto || subiendo) return;
    setAviso("");
    /*
      La cámara y no la galería: lo que se guarda es lo que el guardia tiene
      delante ahora. `launchCameraAsync` deja la foto en la caché de la
      aplicación, no en el carrete, y de ahí se borra al mandarla.
    */
    const permiso = await ImagePicker.requestCameraPermissionsAsync();
    if (!permiso.granted) {
      setAviso("Hace falta permiso para usar la cámara.");
      return;
    }
    const resultado = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.6,
    });
    if (resultado.canceled || !resultado.assets[0]) return;

    setSubiendo(true);
    try {
      await onTomarFoto(resultado.assets[0].uri);
      setFotoLista(true);
    } catch {
      // El motivo ya salió en pantalla; aquí solo se deja repetir.
      setAviso("La foto no se guardó. Tómala de nuevo.");
    } finally {
      setSubiendo(false);
    }
  };

  const verificar = async () => {
    if (!onVerificar || verificando || !numero.trim()) return;
    setVerificando(true);
    setAviso("");
    try {
      const coincide = await onVerificar(numero.trim());
      if (coincide) {
        onCerrar();
        return;
      }
      setAviso(
        "El número no coincide con el registrado. Queda anotado y esta persona no puede ingresar.",
      );
    } catch {
      setAviso("No se pudo comprobar. Inténtalo de nuevo.");
    } finally {
      setVerificando(false);
    }
  };

  return (
    <View className="gap-4">
      <View className="gap-2">
        <Text className="text-xs font-semibold text-gray-500">
          1. FOTO DEL DOCUMENTO
        </Text>
        <Text className="text-sm text-gray-700">
          Queda guardada con tu nombre, el edificio y la hora. No se queda en
          este teléfono.
        </Text>
        <Button
          variant="secondary"
          fullWidth
          onPress={tomarFoto}
          loading={subiendo}
        >
          <Text>{fotoLista ? "📷 Tomar otra foto" : "📷 Tomar foto"}</Text>
        </Button>
        {fotoLista && (
          <Text className="text-xs font-semibold text-green-700">
            ✓ Foto guardada
          </Text>
        )}
      </View>

      <View className="gap-2">
        <Text className="text-xs font-semibold text-gray-500">
          2. NÚMERO DEL DOCUMENTO
        </Text>
        {tieneDocumento ? (
          <>
            <Text className="text-sm text-gray-700">
              Escribe el número que lees en el documento de{" "}
              <Text className="font-bold">{nombre}</Text>.
            </Text>
            <TextInput
              value={numero}
              onChangeText={(valor) => {
                setNumero(valor);
                setAviso("");
              }}
              placeholder="Número de identificación"
              placeholderTextColor={theme.colors.textMuted}
              className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-base text-gray-900 text-center"
            />
            <Button
              variant="primary"
              fullWidth
              onPress={verificar}
              loading={verificando}
              disabled={!numero.trim()}
            >
              <Text>Verificar</Text>
            </Button>
          </>
        ) : (
          <Text className="text-sm text-gray-700">
            {nombre} no escribió su documento en el preregistro, así que no hay
            con qué compararlo. Queda como no verificado.
          </Text>
        )}
      </View>

      {Boolean(aviso) && (
        <Text className="text-xs text-red-600 text-center">{aviso}</Text>
      )}

      <Button variant="secondary" fullWidth onPress={onCerrar}>
        <Text>Cerrar</Text>
      </Button>
    </View>
  );
}
