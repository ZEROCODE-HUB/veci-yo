import { theme } from "@/config";
import React, { useState } from "react";
import { Image, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Button, Cargando } from "@/shared/components";
import { mensajeDeError } from "@/shared/utils";
import { compararDocumento, type Coincidencia } from "../helpers/compararDocumento";
import { leerTextoDelDocumento } from "../services/leerTextoDelDocumento";
import { MarcaDeAgua } from "./MarcaDeAgua";

interface Props {
  nombre: string;
  /** Las fotos del documento que subió en su preregistro, ya firmadas. */
  fotosGuardadas: string[];
  cargando: boolean;
  /** Quién mira y cuándo: va encima de las fotos del preregistro. */
  marcaDeAgua: string;
  /** Lo registrado en el preregistro, con lo que se compara lo leído. */
  ficha: { numero?: string | null; nombre?: string | null; apellidos?: string | null };
  /** Lo leído coincide: se valida en la base. Devuelve si quedó validado. */
  onCoincide: () => Promise<boolean>;
  /** No se pudo leer o no coincide: el guardia sigue con el número a mano. */
  onAMano: () => void;
}

type Paso = "persona" | "escaneo" | "listo" | "no_es";

/**
 * Los dos primeros pasos del registro de entrada de un huésped.
 *
 * 1. **¿Es la misma persona?** Sale la foto del documento que subió en su
 *    preregistro, con una marca de agua que dice qué guardia la está mirando y
 *    cuándo (el cliente, 23/10/2026). Si no es, no entra y ya.
 * 2. **Escanear el documento físico.** El celular lee su texto y lo compara con
 *    lo registrado: si coincide el número, o el nombre y los apellidos, queda
 *    validado (hueco 2: «no lo hagas muy estricto»). La foto no se guarda ni
 *    se sube: el texto se lee dentro del teléfono.
 *
 * Si no se puede leer (APK anterior, mala luz) o no coincide, el guardia
 * escribe el número a mano y lo compara la base, como antes.
 */
export function ConfirmarIdentidad({
  nombre,
  fotosGuardadas,
  cargando,
  marcaDeAgua,
  ficha,
  onCoincide,
  onAMano,
}: Props) {
  const [paso, setPaso] = useState<Paso>("persona");
  const [escaneadas, setEscaneadas] = useState<string[]>([]);
  const [leido, setLeido] = useState("");
  const [leyendo, setLeyendo] = useState(false);
  const [resultado, setResultado] = useState<Coincidencia | "sin_coincidencia" | null>(null);
  const [aviso, setAviso] = useState("");

  const escanear = async () => {
    setAviso("");
    const permiso = await ImagePicker.requestCameraPermissionsAsync();
    if (!permiso.granted) {
      setAviso("Hace falta permiso para usar la cámara.");
      return;
    }
    /*
      Liviana y sin EXIF: en el celular la pantalla se quedaba gris y la app
      congelada al volver de la cámara (QA 23/10/2026). Una foto de 12 MP a
      calidad alta, más la lectura y la miniatura, es mucho para un Android
      modesto, y para leer un número sobra con esto.
    */
    const r = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.4,
      exif: false,
    });
    if (r.canceled || !r.assets[0]) return;
    const uri = r.assets[0].uri;
    setEscaneadas((antes) => [...antes, uri].slice(-2));

    setLeyendo(true);
    try {
      // Que la pantalla alcance a repintarse antes del trabajo pesado.
      await new Promise((listo) => setTimeout(listo, 300));
      const lectura = await Promise.race([
        leerTextoDelDocumento(uri),
        new Promise<string>((_, rechazar) =>
          setTimeout(
            () => rechazar(new Error("La lectura tardó demasiado. Escribe el número a mano.")),
            20_000,
          ),
        ),
      ]);
      const texto = `${leido}\n${lectura}`;
      setLeido(texto);
      const coincide = compararDocumento(texto, ficha);
      if (!coincide) {
        setResultado("sin_coincidencia");
        return;
      }
      setResultado(coincide);
      if (await onCoincide()) setPaso("listo");
      else setAviso("La base no lo dio por validado. Escribe el número a mano.");
    } catch (e) {
      setAviso(mensajeDeError(e, "No se pudo leer el documento."));
    } finally {
      setLeyendo(false);
    }
  };

  if (paso === "no_es") {
    return (
      <View className="gap-3 rounded-xl p-3" style={{ backgroundColor: theme.colors.badgeRedBg }}>
        <Text className="text-sm font-bold" style={{ color: theme.colors.badgeRedText }}>
          No es la misma persona: no la dejes entrar.
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
        {resultado === "nombre"
          ? "✓ Misma persona, y el nombre del documento coincide con el registrado. Validado."
          : "✓ Misma persona, y el número del documento coincide con el registrado. Validado."}
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
            <FilaDeFotos
              urls={fotosGuardadas}
              vacio="No subió fotos de su documento."
              marcaDeAgua={marcaDeAgua}
            />
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
            El celular lee el texto y lo compara con lo registrado. La foto no se guarda ni se
            sube.
          </Text>
          {/*
            Sin miniatura de lo escaneado: no se guarda, y dibujar la foto
            entera pesaba en el celular (QA 23/10/2026).
          */}
          <Text className="text-xs text-gray-500">
            {escaneadas.length === 0
              ? "Todavía no has escaneado."
              : escaneadas.length === 1
                ? "Escaneaste un lado."
                : "Escaneaste los dos lados."}
          </Text>
          <Button variant="secondary" fullWidth onPress={escanear} loading={leyendo}>
            {escaneadas.length === 0 ? "📷 Escanear el documento" : "📷 Escanear el otro lado"}
          </Button>
          {leyendo ? (
            <Text className="text-xs text-gray-500 text-center">Leyendo el documento…</Text>
          ) : null}
          {resultado === "sin_coincidencia" && !leyendo ? (
            <Text className="text-xs text-center" style={{ color: theme.colors.badgeRedText }}>
              No encontré el número ni el nombre de {nombre} en lo escaneado. Escanea el otro lado
              o con más luz, o escribe el número a mano.
            </Text>
          ) : null}
          <Button variant="secondary" fullWidth onPress={onAMano}>
            Escribir el número a mano
          </Button>
        </View>
      )}
      {aviso ? <Text className="text-xs text-red-600 text-center">{aviso}</Text> : null}
    </View>
  );
}

function FilaDeFotos({
  urls,
  vacio,
  marcaDeAgua,
}: {
  urls: string[];
  vacio: string;
  marcaDeAgua?: string;
}) {
  if (urls.length === 0) {
    return <Text className="text-xs text-gray-400">{vacio}</Text>;
  }
  return (
    <View className="flex-row gap-2">
      {urls.map((url) => (
        <View
          key={url}
          style={{ flex: 1, height: 110, borderRadius: 8, overflow: "hidden", backgroundColor: theme.colors.borderLight }}
        >
          <Image
            source={{ uri: url }}
            accessibilityLabel="Foto del documento"
            style={{ width: "100%", height: "100%" }}
            resizeMode="contain"
          />
          {marcaDeAgua ? <MarcaDeAgua texto={marcaDeAgua} /> : null}
        </View>
      ))}
    </View>
  );
}
