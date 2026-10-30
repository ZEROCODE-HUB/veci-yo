import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { theme } from "@/config";
import { Button, Modal } from "@/shared/components";
import { useUIStore } from "@/stores";
import { mensajeDeError } from "@/shared/utils/error.util";
import { urlFotoVisita } from "../services/visitas.repo";
import { crearAnotacion, obtenerAnotaciones } from "../services/anotaciones.repo";

interface Props {
  visitaUuid?: string;
  /** La persona de la visita que se está mirando, si es una en concreto. */
  invitadoUuid?: string | null;
  /** Lo que se anotaba antes en las dos casillas: se sigue enseñando. */
  anteriores?: { etiqueta: string; texto?: string; fotos?: string[] }[];
}

/** Una foto del bucket privado: pide su enlace y se abre en grande al tocarla. */
function FotoGuardada({ ruta, onAbrir }: { ruta: string; onAbrir: (url: string) => void }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let vigente = true;
    urlFotoVisita(ruta)
      .then((u) => vigente && setUrl(u))
      .catch(() => {});
    return () => {
      vigente = false;
    };
  }, [ruta]);
  return (
    <Pressable
      onPress={() => url && onAbrir(url)}
      accessibilityLabel="Ver el archivo en grande"
      className="items-center justify-center rounded-lg"
      style={{ width: 64, height: 64, backgroundColor: theme.colors.bgMuted }}
    >
      {url ? (
        <Image source={{ uri: url }} style={{ width: 64, height: 64, borderRadius: 8 }} resizeMode="cover" />
      ) : (
        <ActivityIndicator size="small" color={theme.colors.textSecondary} />
      )}
    </Pressable>
  );
}

/**
 * La bitácora de la portería sobre una visita (Para Claude 169 y 170,
 * 30/10/2026). Una sola «anotación» en vez de dos casillas compartidas entre
 * todas las personas: se escribe algo, se adjunta un archivo si hace falta y
 * queda con la hora y quién la puso, junto al historial de entradas y
 * salidas. El archivo elegido se ve en su recuadro desde el primer momento, se
 * puede quitar o abrir en grande, y mientras sube lo dice.
 */
export function AnotacionesDeLaVisita({ visitaUuid, invitadoUuid, anteriores = [] }: Props) {
  const client = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  const clave = ["anotaciones-de-la-visita", visitaUuid ?? ""];
  const anotaciones = useQuery({
    queryKey: clave,
    queryFn: () => obtenerAnotaciones(visitaUuid ?? ""),
    enabled: Boolean(visitaUuid),
  });

  const [texto, setTexto] = useState("");
  const [elegidas, setElegidas] = useState<string[]>([]);
  const [enGrande, setEnGrande] = useState<string | null>(null);

  const guardar = useMutation({
    mutationFn: () =>
      crearAnotacion({ visitaUuid: visitaUuid ?? "", invitadoUuid, texto, uris: elegidas }),
    onSuccess: () => {
      setTexto("");
      setElegidas([]);
      void client.invalidateQueries({ queryKey: clave });
    },
    onError: (e) => addToast(mensajeDeError(e, "No se pudo guardar la anotación"), "error"),
  });

  const elegir = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) setElegidas((antes) => [...antes, ...result.assets.map((a) => a.uri)]);
  };

  const hayAlgo = texto.trim() !== "" || elegidas.length > 0;
  const lista = (anotaciones.data ?? []).filter(
    (a) => !invitadoUuid || !a.invitadoId || a.invitadoId === invitadoUuid,
  );
  const conAnteriores = anteriores.filter((a) => a.texto || (a.fotos?.length ?? 0) > 0);

  return (
    <View className="gap-2">
      <Text className="text-xs font-semibold text-gray-600">Anotaciones</Text>

      {conAnteriores.map((a) => (
        <View key={a.etiqueta} className="gap-1 rounded-xl p-2.5" style={{ backgroundColor: theme.colors.bgMuted }}>
          <Text className="text-2xs text-gray-500">{a.etiqueta}</Text>
          {a.texto ? <Text className="text-sm text-gray-900">{a.texto}</Text> : null}
          {a.fotos?.length ? (
            <View className="flex-row flex-wrap gap-2">
              {a.fotos.map((ruta) => (
                <FotoGuardada key={ruta} ruta={ruta} onAbrir={setEnGrande} />
              ))}
            </View>
          ) : null}
        </View>
      ))}

      {lista.map((a) => (
        <View key={a.id} className="gap-1 rounded-xl p-2.5" style={{ backgroundColor: theme.colors.bgMuted }}>
          <Text className="text-2xs text-gray-500">
            {`${a.fecha} ${a.hora}${a.autor ? ` · ${a.autor}` : ""}`}
          </Text>
          {a.texto ? <Text className="text-sm text-gray-900">{a.texto}</Text> : null}
          {a.archivos.length ? (
            <View className="flex-row flex-wrap gap-2">
              {a.archivos.map((ruta) => (
                <FotoGuardada key={ruta} ruta={ruta} onAbrir={setEnGrande} />
              ))}
            </View>
          ) : null}
        </View>
      ))}

      <TextInput
        value={texto}
        onChangeText={setTexto}
        placeholder="Escribe una anotación"
        multiline
        className="min-h-[64px] rounded-xl px-3 py-2 text-sm text-gray-900"
        style={{ borderWidth: 1, borderColor: theme.colors.border, textAlignVertical: "top" }}
        placeholderTextColor={theme.colors.textMuted}
      />

      {elegidas.length > 0 ? (
        <View className="flex-row flex-wrap gap-2">
          {elegidas.map((uri, i) => (
            <View key={uri} style={{ width: 64, height: 64 }}>
              <Pressable onPress={() => setEnGrande(uri)} accessibilityLabel="Ver el archivo en grande">
                <Image source={{ uri }} style={{ width: 64, height: 64, borderRadius: 8 }} resizeMode="cover" />
              </Pressable>
              {guardar.isPending ? (
                <View
                  className="absolute inset-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: theme.colors.bgOverlay }}
                >
                  <ActivityIndicator size="small" color={theme.colors.bgCard} />
                </View>
              ) : (
                <Pressable
                  onPress={() => setElegidas((antes) => antes.filter((_, j) => j !== i))}
                  accessibilityLabel="Quitar este archivo"
                  hitSlop={6}
                  className="absolute -right-1.5 -top-1.5 h-5 w-5 items-center justify-center rounded-full"
                  style={{ backgroundColor: theme.colors.danger }}
                >
                  <Text className="text-2xs font-bold text-white">✕</Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>
      ) : null}

      <View className="flex-row gap-2">
        <View className="flex-1">
          <Button size="sm" variant="secondary" fullWidth onPress={elegir} disabled={guardar.isPending}>
            Adjuntar archivo
          </Button>
        </View>
        <View className="flex-1">
          <Button
            size="sm"
            fullWidth
            onPress={() => guardar.mutate()}
            loading={guardar.isPending}
            disabled={!hayAlgo || guardar.isPending || !visitaUuid}
          >
            {guardar.isPending ? "Guardando…" : "Guardar anotación"}
          </Button>
        </View>
      </View>

      <Modal visible={Boolean(enGrande)} onClose={() => setEnGrande(null)} title="Archivo">
        {enGrande ? (
          <Image source={{ uri: enGrande }} style={{ width: "100%", height: 360 }} resizeMode="contain" />
        ) : null}
      </Modal>
    </View>
  );
}
