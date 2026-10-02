import React from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/config";
import { Card } from "@/shared/components/ui";
import { mensajeDeError } from "@/shared/utils/error.util";
import { plural } from "@/shared/utils";
import { useNavegacionPlataforma } from "../hooks/useNavegacionPlataforma";
import { usePlataforma } from "../hooks/usePlataforma";

/**
 * La portada del panel de la plataforma.
 *
 * Cuatro números y la lista de edificios, que es todo lo que este rol ve de
 * cada uno: conteos. Ni un nombre de vecino, ni un teléfono, ni una dirección
 * de vivienda. La función de la base que los sirve devuelve exactamente eso, y
 * hay una prueba que se pone roja si alguien le añade un campo con un nombre
 * de persona dentro.
 */

function Numero({
  valor,
  que,
  icono,
}: {
  valor: number;
  que: string;
  icono: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Card className="flex-1 p-4">
      <Ionicons name={icono} size={18} color={theme.colors.primary} />
      <Text className="mt-2 text-2xl font-bold text-gray-900">{valor}</Text>
      <Text className="text-xs text-gray-500">{que}</Text>
    </Card>
  );
}

export function PlataformaResumenScreen() {
  const navegacion = useNavegacionPlataforma();
  const { resumen, edificios, cargando, error, refrescar, esDueno } =
    usePlataforma();

  if (cargando) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerClassName="p-4 gap-4"
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={refrescar} />
      }
    >
      {error ? (
        <Card className="p-4">
          <Text className="text-sm text-danger">
            {mensajeDeError(error, "No se pudo cargar el panel")}
          </Text>
        </Card>
      ) : null}

      <View className="flex-row gap-3">
        <Numero
          valor={resumen?.condominios ?? 0}
          que="Edificios"
          icono="business-outline"
        />
        <Numero
          valor={resumen?.viviendas ?? 0}
          que="Viviendas"
          icono="home-outline"
        />
      </View>
      <View className="flex-row gap-3">
        <Numero
          valor={resumen?.cuentas ?? 0}
          que="Cuentas"
          icono="people-outline"
        />
        <Numero
          valor={resumen?.reclamosAppAbiertos ?? 0}
          que="PQRS sin atender"
          icono="chatbox-ellipses-outline"
        />
      </View>

      <Card className="p-0">
        <View className="flex-row items-center justify-between p-4">
          <Text className="text-base font-semibold text-gray-900">
            Edificios
          </Text>
          {/*
            Dar de alta un edificio es solo del dueño: `soporte` atiende PQRS y
            nada más. La base lo rechaza igual, así que esconder el botón es
            para no ofrecer lo que va a fallar.
          */}
          {esDueno ? (
            <Text
              accessibilityRole="button"
              accessibilityLabel="Dar de alta un edificio"
              onPress={() => navegacion.navigate("PlataformaEdificioNuevo")}
              className="text-sm font-semibold text-primary"
            >
              + Dar de alta
            </Text>
          ) : null}
        </View>

        {edificios.length === 0 ? (
          <Text className="px-4 pb-4 text-sm text-gray-500">
            Todavía no hay ningún edificio.
          </Text>
        ) : null}

        {edificios.map((e) => (
          <View
            key={e.id}
            className="border-t border-gray-100 px-4 py-3"
          >
            <Text className="text-sm font-semibold text-gray-900">
              {e.nombre}
            </Text>
            <Text className="text-xs text-gray-500">
              {[e.ciudad, e.pais].filter(Boolean).join(" · ")} · desde{" "}
              {e.creadoEn}
            </Text>
            <View className="mt-2 flex-row flex-wrap gap-x-4 gap-y-1">
              <Text className="text-xs text-gray-600">
                {plural(e.viviendas, "vivienda")}
              </Text>
              <Text className="text-xs text-gray-600">
                {plural(e.personas, "persona")}
              </Text>
              <Text className="text-xs text-gray-600">
                {e.administradores} en administración
              </Text>
              <Text className="text-xs text-gray-600">
                {e.guardias} en portería
              </Text>
            </View>
            {/*
              Un edificio sin nadie en administración es el que no está en
              marcha: la invitación no se aceptó, o caducó. Es lo que de verdad
              hay que mirar en esta lista, así que se dice en vez de dejarlo en
              un cero que se pierde entre los demás.
            */}
            {e.administradores === 0 ? (
              <Text className="mt-1 text-xs font-semibold text-warning">
                Sin administración: nadie ha aceptado la invitación
              </Text>
            ) : null}
            {e.reclamosAbiertos > 0 ? (
              <Text className="mt-1 text-xs text-gray-500">
                {plural(e.reclamosAbiertos, "PQRS", "PQRS")} sin resolver en el edificio
              </Text>
            ) : null}
          </View>
        ))}
      </Card>

      <Card className="p-4">
        <Text className="text-xs leading-5 text-gray-500">
          De cada edificio solo se ven estos conteos. Lo de dentro —chats,
          documentos, correspondencia, visitas— es de sus vecinos y de su
          administración, y desde aquí no se puede ver.
        </Text>
      </Card>
    </ScrollView>
  );
}
