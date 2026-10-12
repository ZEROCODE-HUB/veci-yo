import { theme } from "@/config";
import React from "react";
import { View, Image } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { urlsDeFotos } from "../services/correspondencia.repo";

/**
 * Las fotos de un envío o de su incidencia.
 *
 * Recibe **rutas** del bucket privado y las firma al pintarlas. Antes se
 * pintaba lo guardado tal cual, que era la dirección del archivo en el
 * teléfono de quien tomó la foto: solo se veía en ese teléfono.
 */
export function FotosDeCorrespondencia({ rutas }: { rutas: string[] }) {
  const { data: urls = [] } = useQuery({
    queryKey: ["correspondencia-fotos", ...rutas],
    queryFn: () => urlsDeFotos(rutas),
    enabled: rutas.length > 0,
  });

  if (urls.length === 0) return null;

  return (
    <View className="flex-row flex-wrap gap-2 mt-1">
      {urls.map((url) => (
        <Image
          key={url}
          source={{ uri: url }}
          accessibilityLabel="Foto del envío"
          // El tamaño va en `style`: en web una clase no dimensiona un <Image>.
          style={{
            width: 64,
            height: 64,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}
          resizeMode="cover"
        />
      ))}
    </View>
  );
}
