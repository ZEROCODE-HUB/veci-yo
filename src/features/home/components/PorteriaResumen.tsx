import React from "react";
import { Image, Pressable, Text, View, type ImageSourcePropType } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/config";
import { useAuthStore } from "@/stores";
import { navigateToRoute } from "@/navigation/helpers/navigation.helpers";
import { useCondominioActivo, useNavegacion } from "@/shared/hooks";

const imagenPorteria = require("@/assets/icons/home/finales/visitas-porteria.png");
const imagenVisitas = require("@/assets/icons/home/finales/visitas-porteria.png");
const imagenCorrespondencia = require("@/assets/icons/home/correspondencia.png");
const imagenZonas = require("@/assets/icons/home/zonascomunes.png");
const imagenAnuncios = require("@/assets/icons/home/anuncios.png");

type Opcion = {
  clave: string;
  titulo: string;
  imagen?: ImageSourcePropType;
  icono?: keyof typeof Ionicons.glyphMap;
  accion: () => void;
};

/**
 * La pestaña del medio de la portería.
 *
 * La pidió la responsable de producto el 14/10/2026: «en Guardia, añadir la
 * pantalla del medio, Vivienda: administrar las áreas comunes; los
 * estacionamientos de visita están en áreas comunes pero portería los asigna;
 * añadir el chat y el intercomunicador».
 *
 * El 15/10/2026 el cliente pidió que se vea **como la de los demás**: la misma
 * tarjeta de arriba y la misma cuadrícula de tarjetas con imagen, no una lista.
 * Y que el chat y las llamadas se vean aunque estén apagados: el KT dice que
 * son de la portería «si el Administrador se lo habilita», así que salen
 * apagados y dicen quién los enciende, en vez de desaparecer sin explicación.
 *
 * El 30/10/2026 (Para Claude 165) se quitaron de aquí el historial de S.O.S.,
 * el directorio, el chat, «Llamar a una vivienda» y los estacionamientos de
 * visita: siguen a mano en otros sitios --directorio y estacionamientos en el
 * Inicio de la portería, chat y llamadas en el botón flotante, el historial en
 * Perfil--, así que aquí solo repetían.
 */
export function PorteriaResumen() {
  const navigation = useNavegacion();
  const condominios = useAuthStore((s) => s.condominios);
  const condominioActivo = useCondominioActivo();
  // La de este edificio: un guardia puede tener portería en más de uno.
  const membresia =
    condominios.find((c) => c.rol === "guardia" && c.condominioId === condominioActivo) ??
    condominios.find((c) => c.rol === "guardia");
  const opciones: Opcion[] = [
    {
      clave: "visitas",
      titulo: "Visitas",
      imagen: imagenVisitas,
      accion: () => navigateToRoute(navigation, "Visitas"),
    },
    {
      clave: "correspondencia",
      titulo: "Correspondencia",
      imagen: imagenCorrespondencia,
      accion: () => navigateToRoute(navigation, "Correspondencia"),
    },
    {
      clave: "zonas",
      titulo: "Zonas Comunes",
      imagen: imagenZonas,
      accion: () => navigateToRoute(navigation, "ZonasComunes"),
    },
    {
      // Los que la administración dirige a la portería (15/10/2026, hueco 31).
      clave: "anuncios",
      titulo: "Anuncios",
      imagen: imagenAnuncios,
      accion: () => navigateToRoute(navigation, "Anuncios"),
    },
  ];

  return (
    <View className="px-4 gap-4 pt-5 pb-8">
      <View
        className="bg-white rounded-xl p-5 items-center gap-2.5"
        style={{ boxShadow: theme.shadows.card }}
      >
        <View
          className="items-center justify-center overflow-hidden"
          style={{
            width: 112,
            height: 112,
            borderRadius: 56,
            borderWidth: 3,
            borderColor: theme.colors.primary,
            backgroundColor: theme.colors.bgVivienda,
          }}
        >
          <Image source={imagenPorteria} style={{ width: "80%", height: "80%" }} resizeMode="contain" />
        </View>
        <Text className="text-xl font-bold text-gray-900">
          {membresia?.condominioNombre ?? "Portería"}
        </Text>
        <View
          className="flex-row items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-gray-200"
          style={{ backgroundColor: theme.colors.bgCampo }}
        >
          <Text style={{ fontSize: 12 }}>🛡️</Text>
          <Text className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
            Portería
          </Text>
        </View>
      </View>

      {/*
        Sin separación fija entre columnas: dos tarjetas del 48 % más 12 px no
        caben en un celular de 320 (288,5 de 288) y la rejilla bajaba a una
        sola columna. Lo que sobra se reparte (auditoría de responsividad,
        25/10/2026).
      */}
      <View className="flex-row flex-wrap justify-between gap-y-3">
        {opciones.map((o) => (
          <Pressable
            key={o.clave}
            accessibilityRole="button"
            accessibilityLabel={o.titulo}
            onPress={o.accion}
            className="bg-white rounded-xl p-3.5 items-center justify-center relative"
            style={{
              width: "48%",
              aspectRatio: 1,
              boxShadow: theme.shadows.card,
            }}
          >
            {o.imagen ? (
              <Image source={o.imagen} style={{ width: 88, height: 88 }} resizeMode="contain" />
            ) : (
              <View
                className="items-center justify-center"
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: 44,
                  backgroundColor: theme.colors.primaryLight,
                }}
              >
                <Ionicons name={o.icono ?? "apps"} size={44} color={theme.colors.primaryDark} />
              </View>
            )}
            <Text
              className="text-sm font-medium text-gray-500 text-center mt-1.5"
              numberOfLines={2}
            >
              {o.titulo}
            </Text>
          </Pressable>
        ))}
      </View>

    </View>
  );
}
