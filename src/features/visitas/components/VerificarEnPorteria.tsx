import { theme } from "@/config";
import React, { useState } from "react";
import { Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Button } from "@/shared/components";
import { urlFotoVisita } from "../services/visitas.repo";
import { ComoQuedoLaFoto } from "./ComoQuedoLaFoto";
import { anotarEnLaBase } from "@/shared/services/erroresDeLaApp";
import { comoMuchoOFalla } from "@/shared/utils/comoMucho.util";
import { mensajeDeError } from "@/shared/utils/error.util";

/*
  Cuánto se espera a cada paso antes de decir que no se pudo (10/11/2026: «se
  queda cargando y la foto no se sube»). Cada paso deja además un rastro en la
  base con lo que tardó, para saber dónde se queda si vuelve a pasar.
*/
const TOPE_SUBIDA_MS = 60_000;
const TOPE_VERIFICAR_MS = 20_000;
const rastro = (donde: string, mensaje: string) =>
  void anotarEnLaBase("rastro", `foto de portería: ${donde}`, mensaje);

interface Props {
  nombre: string;
  /** Si esta persona escribió su documento en el preregistro. */
  tieneDocumento: boolean;
  /** Si ya hay una foto de portería guardada de antes. */
  fotoTomada: boolean;
  /**
   * Manda la foto. Lo que devuelve la cámara, tal cual. Devuelve la ruta de la
   * foto guardada, con su marca de agua, para enseñar cómo quedó.
   */
  onTomarFoto?: (uri: string) => Promise<string | void>;
  /** Manda el número que se lee en el documento. Responde si coincide. */
  onVerificar?: (numero: string) => Promise<boolean>;
  onCerrar: () => void;
  /**
   * Si se ofrece la foto de constancia. Para un huésped, desde el 16/10/2026,
   * no: lo escanea en `ConfirmarIdentidad` y no se guarda.
   */
  pedirFoto?: boolean;
  /** Cómo se numera el paso del número, si van otros delante. */
  numeroDePaso?: number;
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
  pedirFoto = true,
  numeroDePaso = 2,
}: Props) {
  const [numero, setNumero] = useState("");
  const [aviso, setAviso] = useState("");
  const [fotoLista, setFotoLista] = useState(fotoTomada);
  const [subiendo, setSubiendo] = useState(false);
  const [verificando, setVerificando] = useState(false);
  /** La foto recién guardada, para mirarla una vez y decidir (Para Claude 108). */
  const [comoQuedo, setComoQuedo] = useState<string | null>(null);

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
    rastro("abrir cámara", "");
    const resultado = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      // Menos peso que subir: 0,6 daba fotos de 2 a 3 MB (10/11/2026).
      quality: 0.4,
    });
    if (resultado.canceled || !resultado.assets[0]) {
      rastro("cámara cerrada sin foto", "");
      return;
    }
    const foto = resultado.assets[0];
    rastro("tomada", `${foto.width}x${foto.height}, ${Math.round((foto.fileSize ?? 0) / 1024)} KB`);

    setSubiendo(true);
    const inicio = Date.now();
    try {
      const ruta = await comoMuchoOFalla(
        onTomarFoto(foto.uri),
        TOPE_SUBIDA_MS,
        "La foto tardó demasiado en subir. Revisa la conexión y tómala de nuevo.",
      );
      rastro("subida", `${Date.now() - inicio} ms`);
      setFotoLista(true);
      // Si no se puede enseñar, queda guardada igual: no es un fallo.
      if (ruta) {
        setComoQuedo(
          await comoMuchoOFalla(urlFotoVisita(ruta), 15_000, "sin enlace").catch(() => null),
        );
      }
    } catch (e) {
      const motivo = mensajeDeError(e, "sin motivo");
      rastro("falló", `${Date.now() - inicio} ms: ${motivo}`);
      setAviso(
        motivo.startsWith("La foto tardó") ? motivo : "La foto no se guardó. Tómala de nuevo.",
      );
    } finally {
      setSubiendo(false);
    }
  };

  const verificar = async () => {
    if (!onVerificar || verificando || !numero.trim()) return;
    setVerificando(true);
    setAviso("");
    const inicio = Date.now();
    try {
      const coincide = await comoMuchoOFalla(
        onVerificar(numero.trim()),
        TOPE_VERIFICAR_MS,
        "La verificación tardó demasiado",
      );
      rastro("número verificado", `${Date.now() - inicio} ms, ${coincide ? "coincide" : "no coincide"}`);
      if (coincide) {
        onCerrar();
        return;
      }
      setAviso(
        "El número no coincide con el registrado y queda anotado. Revísalo y vuelve a escribirlo: mientras no coincida, esta persona no puede ingresar.",
      );
    } catch (e) {
      rastro("número sin verificar", `${Date.now() - inicio} ms: ${mensajeDeError(e, "sin motivo")}`);
      setAviso("No se pudo comprobar. Revisa la conexión e inténtalo de nuevo.");
    } finally {
      setVerificando(false);
    }
  };

  return (
    <View className="gap-4">
      {pedirFoto ? (
      <View className="gap-2">
        <Text className="text-xs font-semibold text-gray-500">
          1. FOTO DEL DOCUMENTO
        </Text>
        <Text className="text-sm text-gray-700">
          Queda guardada con tu nombre, el edificio y la hora. No se queda en
          este teléfono.
        </Text>
        {comoQuedo ? null : (
          <Button
            variant="secondary"
            fullWidth
            onPress={tomarFoto}
            loading={subiendo}
          >
            <Text>{fotoLista ? "📷 Tomar otra foto" : "📷 Tomar foto"}</Text>
          </Button>
        )}
        {comoQuedo ? (
          <ComoQuedoLaFoto
            url={comoQuedo}
            onBien={() => setComoQuedo(null)}
            onOtra={() => {
              setComoQuedo(null);
              void tomarFoto();
            }}
          />
        ) : fotoLista ? (
          <Text className="text-xs font-semibold text-green-700">
            ✓ Foto guardada
          </Text>
        ) : null}
      </View>
      ) : null}

      <View className="gap-2">
        <Text className="text-xs font-semibold text-gray-500">
          {numeroDePaso}. NÚMERO DEL DOCUMENTO
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
            {nombre} no tiene un documento anotado, así que no hay con qué
            compararlo. Queda como no verificado.
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
