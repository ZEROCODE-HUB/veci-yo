import { theme } from "@/config";
import React from "react";
import { Image, Text, View, type ImageSourcePropType } from "react-native";
import { useQuery } from "@tanstack/react-query";
import zonaIcons, { zonaBanners } from "@/assets/icons/zonas";
import { urlImagenDeZona } from "../services/zonas.repo";

const iconos = zonaIcons as Record<string, ImageSourcePropType>;
const banners = zonaBanners as Record<string, ImageSourcePropType>;

interface Props {
  /** La ruta de la foto subida, en el almacén privado. */
  imagen?: string | null;
  /** La clave del icono elegido (la columna `emoji`). */
  icono?: string;
  nombre: string;
  alto: number;
}

/**
 * La foto de una zona común: la que subió la administración y, si no hay, el
 * dibujo del icono elegido.
 *
 * La foto subida solo se veía dentro del formulario de edición: la lista de
 * la administración, las reservas y la ficha del vecino buscaban el dibujo
 * por el **id** de la zona, que es un uuid y no casa con ninguna clave, así
 * que no pintaban ni la foto ni el dibujo (Para Claude, 20/10/2026).
 */
export function FotoDeZona({ imagen, icono, nombre, alto }: Props) {
  const { data: url } = useQuery({
    queryKey: ["zonas", "imagen", imagen],
    queryFn: () => urlImagenDeZona(imagen ?? ""),
    enabled: Boolean(imagen),
  });
  const banner = icono ? banners[icono] : undefined;
  const dibujo = icono ? iconos[icono] : undefined;

  return (
    <View
      className="w-full items-center justify-center overflow-hidden"
      style={{ height: alto, backgroundColor: theme.colors.zonaSinFoto }}
    >
      {url || banner ? (
        <Image
          style={{ width: "100%", height: "100%" }}
          source={url ? { uri: url } : (banner as ImageSourcePropType)}
          accessibilityLabel={nombre}
          resizeMode="cover"
        />
      ) : dibujo ? (
        <Image
          source={dibujo}
          accessibilityLabel={nombre}
          style={{ width: 64, height: 64, opacity: 0.7 }}
          resizeMode="contain"
        />
      ) : icono && !/^[a-z0-9-]+$/.test(icono) ? (
        // Las zonas de antes guardaban un emoji en vez de una clave.
        <Text className="text-5xl">{icono}</Text>
      ) : null}
    </View>
  );
}
