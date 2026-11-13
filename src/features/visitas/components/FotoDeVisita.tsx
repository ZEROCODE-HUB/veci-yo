import { useEffect, useState } from "react";
import { Image, Text, View } from "react-native";
import { Cargando } from "@/shared/components";
import { urlFotoVisita } from "../services/visitas.repo";

/**
 * Una foto de portería guardada en el depósito privado (29/10/2026).
 *
 * En la fila de la visita queda la ruta, no una dirección que se pueda abrir:
 * hay que pedir un enlace temporal. El detalle de la visita ponía la ruta
 * directamente como imagen y no se veía nunca (GSheet, Para Claude 146).
 */
export function FotoDeVisita({ ruta, tamano = 56 }: { ruta: string; tamano?: number }) {
  const [url, setUrl] = useState<string | null>(null);
  /*
    Si el enlace no se pudo pedir. Antes la caja gris se quedaba igual para
    siempre, cargando o no (13/11/2026).
  */
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    let vigente = true;
    setFallo(false);
    urlFotoVisita(ruta)
      .then((firmada) => {
        if (vigente) setUrl(firmada);
      })
      .catch(() => {
        if (vigente) {
          setUrl(null);
          setFallo(true);
        }
      });
    return () => {
      vigente = false;
    };
  }, [ruta]);

  if (!url) {
    return (
      <View
        className="items-center justify-center rounded-lg border border-gray-200 bg-gray-100"
        style={{ height: tamano, width: tamano }}
      >
        {fallo ? (
          <Text className="text-2xs text-gray-500" accessibilityLabel="No se pudo cargar la foto">
            Sin foto
          </Text>
        ) : (
          <Cargando variante="control" texto="la foto" />
        )}
      </View>
    );
  }
  return (
    <Image
      style={{ height: tamano, width: tamano }}
      source={{ uri: url }}
      className="rounded-lg border border-gray-200"
      resizeMode="cover"
    />
  );
}
