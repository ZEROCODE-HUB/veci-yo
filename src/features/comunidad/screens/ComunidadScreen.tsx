/**
 * NO ESTA EN USO.
 *
 * Tres tarjetas --Ofertas, Venta de garaje, Paginas amarillas-- cuyo `onPress`
 * es `undefined`: no llevan a ninguna parte porque no hay nada detras. El KT
 * solo nombra esta pantalla en una tabla, con «alcance por rol sin confirmar»,
 * y no existe ninguna tabla en la base para esas tres secciones.
 *
 * Su ruta se retiro de `sharedScreens` el 25/09/2026 (R-11): estaba
 * registrada y ningun boton llevaba a ella. El archivo se queda porque el
 * diseño y los iconos ya estan hechos; si la seccion se retoma, hay que
 * volver a registrarla Y construir lo que hay detras.
 */

import { theme } from "@/config";
import React from "react";
import { View, Text, Pressable, Image } from "react-native";

const iconOfertas = require("@/assets/icons/comunidad/ofertas.png");
const iconVentaGaraje = require("@/assets/icons/comunidad/venta-garaje.png");
const iconPaginasAmarillas = require("@/assets/icons/comunidad/paginas-amarillas.png");

const SECCIONES = [
  { key: "ofertas", label: "Ofertas", icon: iconOfertas },
  { key: "venta-garaje", label: "Venta de garaje", icon: iconVentaGaraje },
  {
    key: "paginas-amarillas",
    label: "Páginas amarillas",
    icon: iconPaginasAmarillas,
  },
];

export function ComunidadScreen() {
  return (
    <View className="flex-1 bg-gray-50" style={{ padding: 16 }}>
      <View
        style={{
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        {SECCIONES.map((sec) => (
          <Pressable
            key={sec.key}
            onPress={undefined}
            className="active:opacity-80"
            style={{
              flex: 1,
              minWidth: 140,
              backgroundColor: theme.colors.bgCard,
              borderRadius: 20,
              padding: 24,
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              boxShadow: theme.shadows.card,
              minHeight: 120,
            }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                overflow: "hidden",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Image
                source={sec.icon}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            </View>
            <Text className="text-sm text-gray-900" style={{ fontWeight: 500 }}>
              {sec.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
