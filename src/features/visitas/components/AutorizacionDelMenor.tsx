import { theme } from "@/config";
import React, { useEffect, useState } from "react";
import { Image, Linking, Pressable, Text, View } from "react-native";
import { Button } from "@/shared/components";
import { urlFotoVisita } from "../services/visitas.repo";
import { MarcaDeAgua } from "./MarcaDeAgua";
import { VisorDeDocumento } from "./VisorDeDocumento";

interface Props {
  rutas: string[];
  marcaDeAgua: string;
}

const esPdf = (ruta: string) => ruta.toLowerCase().endsWith(".pdf");

/**
 * El permiso del menor (patria potestad o autorización) que subió quien
 * responde por él en el preregistro.
 *
 * El anfitrión solo veía «con autorización» y no podía abrirla (QA
 * 23/10/2026). Puede ser una foto o un PDF: la foto se ve aquí con la marca de
 * agua; el PDF se abre aparte, porque la app no dibuja PDF.
 */
export function AutorizacionDelMenor({ rutas, marcaDeAgua }: Props) {
  const [urls, setUrls] = useState<string[]>([]);
  const [fallo, setFallo] = useState(false);
  const [abierta, setAbierta] = useState<number | null>(null);
  const clave = rutas.join("|");

  useEffect(() => {
    let vigente = true;
    Promise.all(rutas.map((ruta) => urlFotoVisita(ruta)))
      .then((firmadas) => {
        if (vigente) setUrls(firmadas);
      })
      .catch(() => {
        if (vigente) setFallo(true);
      });
    return () => {
      vigente = false;
    };
    // `rutas` se mira por su contenido (`clave`), no por su identidad.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);

  if (fallo) {
    return (
      <Text className="text-xs text-gray-500">No se pudo cargar la autorización.</Text>
    );
  }

  const imagenes = urls.filter((_, i) => !esPdf(rutas[i] ?? ""));
  const pdfs = urls.filter((_, i) => esPdf(rutas[i] ?? ""));

  return (
    <View className="gap-2">
      {imagenes.length > 0 ? (
        <View className="flex-row flex-wrap gap-2">
          {imagenes.map((url, i) => (
            <Pressable
              key={url}
              accessibilityRole="button"
              accessibilityLabel={`Ver en grande la autorización ${i + 1}`}
              onPress={() => setAbierta(i)}
              style={{ width: "48%", height: 120, borderRadius: 8, overflow: "hidden" }}
            >
              <Image
                source={{ uri: url }}
                style={{
                  width: "100%",
                  height: "100%",
                  backgroundColor: theme.colors.borderLight,
                }}
                resizeMode="contain"
                accessibilityLabel={`Autorización ${i + 1}`}
              />
              <MarcaDeAgua texto={marcaDeAgua} />
            </Pressable>
          ))}
        </View>
      ) : null}
      {pdfs.map((url, i) => (
        <Button key={url} variant="secondary" fullWidth onPress={() => void Linking.openURL(url)}>
          {pdfs.length > 1 ? `📄 Abrir la autorización (PDF ${i + 1})` : "📄 Abrir la autorización (PDF)"}
        </Button>
      ))}
      {urls.length === 0 ? (
        <Text className="text-xs text-gray-500">Cargando la autorización…</Text>
      ) : null}
      <VisorDeDocumento
        urls={imagenes}
        indice={abierta}
        onCerrar={() => setAbierta(null)}
        onCambiar={setAbierta}
        marcaDeAgua={marcaDeAgua}
      />
    </View>
  );
}
