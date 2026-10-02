import React from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { theme } from "@/config";
import { Card } from "@/shared/components/ui";
import { mensajeDeError } from "@/shared/utils/error.util";
import { ACCIONES } from "../services/plataforma.repo";
import { useBitacoraPlataforma } from "../hooks/usePlataforma";

/**
 * Lo que se ha hecho desde el panel.
 *
 * Antes de que existiera este rol, dar de alta un edificio se hacía con la clave
 * de servicio del proyecto y no dejaba rastro de quién. Un rol que reparte su
 * propio poder tiene que dejarlo.
 *
 * No se puede editar ni borrar, ni desde aquí ni por la API: la tabla no tiene
 * política de escritura y solo la tocan las funciones del panel. Un registro que
 * su propio actor puede cambiar no sirve de registro.
 */
export function PlataformaBitacoraScreen() {
  const { lineas, cargando, error } = useBitacoraPlataforma();

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
      contentContainerClassName="p-4 gap-3"
    >
      {error ? (
        <Card className="p-4">
          <Text className="text-sm text-danger">
            {mensajeDeError(error, "No se pudo cargar la bitácora")}
          </Text>
        </Card>
      ) : null}

      {lineas.length === 0 ? (
        <Card className="p-4">
          <Text className="text-sm text-gray-500">
            Todavía no se ha hecho nada desde el panel.
          </Text>
        </Card>
      ) : null}

      {lineas.map((l) => (
        <Card key={l.id} className="p-4">
          <Text className="text-sm font-semibold text-gray-900">
            {/*
              La base guarda la clave --`condominio_creado`-- porque es lo que no
              cambia; la frase se decide en el cliente. Una acción que no esté en
              el mapa se enseña con su clave: es más útil leer `algo_raro` que
              «Acción desconocida».
            */}
            {ACCIONES[l.accion] ?? l.accion}
          </Text>
          <Text className="mt-1 text-xs text-gray-500">
            {l.actor}
            {l.condominio ? ` · ${l.condominio}` : ""}
          </Text>
          <Text className="mt-1 text-xs text-gray-400">{l.creadoEn}</Text>
        </Card>
      ))}
    </ScrollView>
  );
}
