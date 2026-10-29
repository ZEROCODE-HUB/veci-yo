import { useEffect, useState } from "react";
import { Image, View } from "react-native";
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

  useEffect(() => {
    let vigente = true;
    urlFotoVisita(ruta)
      .then((firmada) => {
        if (vigente) setUrl(firmada);
      })
      .catch(() => {
        if (vigente) setUrl(null);
      });
    return () => {
      vigente = false;
    };
  }, [ruta]);

  if (!url) {
    return <View className="rounded-lg border border-gray-200 bg-gray-100" style={{ height: tamano, width: tamano }} />;
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
