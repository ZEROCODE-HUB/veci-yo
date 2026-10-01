import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { theme } from "@/config";
import { Modal, Button, Input } from "@/shared/components";
import { useCondominioActivo } from "@/shared/hooks";
import { useUIStore } from "@/stores";
import { useAuthStore } from "@/stores/auth-store";
import {
  obtenerCatalogoInsignias,
  otorgarReconocimiento,
} from "../services/cuadroHonor.repo";
import type { UnidadCuadroHonor } from "../services/cuadroHonor.repo";
import type { DestinatarioReconocimiento } from "../hooks/useCuadroHonor";

interface ReconocimientoPopupProps {
  visible: boolean;
  onClose: () => void;
  /** Vecino ya elegido desde su tarjeta; si no hay, se busca en la lista. */
  destinatarioPreseleccionado: DestinatarioReconocimiento | null;
  candidatos: UnidadCuadroHonor[];
}

export function ReconocimientoPopup({
  visible,
  onClose,
  destinatarioPreseleccionado,
  candidatos,
}: ReconocimientoPopupProps) {
  const addToast = useUIStore((s) => s.addToast);
  const queryClient = useQueryClient();
  const otorganteUsuarioId = useAuthStore((s) => s.usuarioId);
  const condominioId = useCondominioActivo() ?? "";

  const [searchTerm, setSearchTerm] = useState("");
  const [elegido, setElegido] = useState<DestinatarioReconocimiento | null>(
    destinatarioPreseleccionado,
  );
  const [insigniaId, setInsigniaId] = useState("");

  // El catálogo de insignias es dato del producto y vive en la tabla
  // `insignia`: se puede ampliar sin publicar una versión de la app.
  const { data: catalogo = [] } = useQuery({
    queryKey: ["insignias"],
    queryFn: obtenerCatalogoInsignias,
  });

  useEffect(() => {
    setElegido(destinatarioPreseleccionado);
    setInsigniaId("");
    setSearchTerm("");
  }, [destinatarioPreseleccionado, visible]);

  const tieneDestinatario = !!destinatarioPreseleccionado;

  // Uno no se reconoce a sí mismo; la base lo rechaza, así que tampoco se ofrece.
  const vecinos = candidatos.filter(
    (c) => c.responsableUsuarioId !== otorganteUsuarioId,
  );
  const filtered = searchTerm
    ? vecinos.filter((c) =>
        c.responsable.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    : vecinos;

  const mutacion = useMutation({
    mutationFn: () =>
      otorgarReconocimiento({
        insigniaId,
        destinatarioUsuarioId: elegido!.usuarioId!,
        condominioId,
        otorganteUsuarioId: otorganteUsuarioId!,
      }),
    onSuccess: () => {
      const insignia = catalogo.find((i) => i.id === insigniaId);
      addToast(
        `Reconocimiento "${insignia?.etiqueta}" enviado a ${elegido?.nombre}`,
        "success",
      );
      queryClient.invalidateQueries({ queryKey: ["cuadro-honor"] });
      queryClient.invalidateQueries({ queryKey: ["home", "reputacion"] });
      /*
        «Regalos por dar» cuenta los vecinos a los que todavia no se ha
        reconocido este mes, asi que dar uno lo cambia. Faltaba invalidarlo:
        tras reconocer al unico vecino del condominio la portada seguia
        diciendo «Regalos por dar 1» --y ya no quedaba ninguno--.
      */
      queryClient.invalidateQueries({ queryKey: ["home", "regalos"] });
      onClose();
    },
    onError: (error: Error) => addToast(error.message, "error"),
  });

  const puedeEnviar =
    !!elegido?.usuarioId && !!insigniaId && !mutacion.isPending;

  return (
    <Modal visible={visible} onClose={onClose} title="Dar reconocimiento">
      <View className="gap-4">
        {!tieneDestinatario && (
          <>
            <Input
              label=""
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholder="Buscar residente..."
            />

            <ScrollView style={{ maxHeight: 240 }} className="gap-1">
              {filtered.map((vecino) => {
                const seleccionado =
                  elegido?.usuarioId === vecino.responsableUsuarioId;
                return (
                  <Pressable
                    key={vecino.id}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: seleccionado }}
                    aria-checked={seleccionado}
                    onPress={() =>
                      setElegido({
                        usuarioId: vecino.responsableUsuarioId,
                        nombre: vecino.responsable,
                      })
                    }
                    className="flex-row items-center gap-2.5 py-2.5 px-3.5 rounded-2xl"
                    style={{
                      borderWidth: 1.5,
                      borderColor: seleccionado
                        ? theme.colors.primary
                        : "transparent",
                      backgroundColor: seleccionado
                        ? theme.colors.primaryLight
                        : theme.colors.bgMuted,
                    }}
                  >
                    <View
                      className="items-center justify-center rounded-full"
                      style={{
                        width: 32,
                        height: 32,
                        backgroundColor: theme.colors.primaryLight,
                      }}
                    >
                      <Text style={{ fontSize: 14 }}>👤</Text>
                    </View>
                    <View className="flex-1">
                      <Text
                        className="text-sm text-gray-900"
                        style={{ fontWeight: seleccionado ? "600" : "400" }}
                      >
                        {vecino.responsable}
                      </Text>
                      <Text className="text-2xs text-gray-500">
                        {vecino.departamento}
                      </Text>
                    </View>
                    {seleccionado && (
                      <Text className="text-primary font-bold">✓</Text>
                    )}
                  </Pressable>
                );
              })}
              {filtered.length === 0 && (
                <Text className="text-sm text-gray-400 text-center py-5">
                  No se encontraron residentes
                </Text>
              )}
            </ScrollView>
          </>
        )}

        {tieneDestinatario && (
          <Text className="text-base font-semibold text-gray-900 text-center py-2">
            Reconocer a: {destinatarioPreseleccionado?.nombre}
          </Text>
        )}

        <View>
          <Text className="text-sm font-semibold text-gray-900 mb-2 text-center">
            Elige un reconocimiento:
          </Text>
          <View className="flex-row gap-2 flex-wrap justify-center">
            {catalogo.map((insignia) => (
              <Pressable
                key={insignia.id}
                onPress={() => setInsigniaId(insignia.id)}
                accessibilityRole="radio"
                accessibilityState={{ checked: insigniaId === insignia.id }}
                aria-checked={insigniaId === insignia.id}
                className="items-center gap-1 py-2.5 px-2 rounded-xl flex-1"
                style={{
                  minWidth: 60,
                  borderWidth: 2,
                  borderColor:
                    insigniaId === insignia.id
                      ? theme.colors.primary
                      : theme.colors.border,
                  backgroundColor:
                    insigniaId === insignia.id
                      ? theme.colors.primaryLight
                      : theme.colors.bgCard,
                }}
              >
                <Text style={{ fontSize: 28 }}>{insignia.icono}</Text>
                <Text className="text-2xs text-gray-900 text-center">
                  {insignia.etiqueta}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Button
          variant="primary"
          onPress={() => mutacion.mutate()}
          disabled={!puedeEnviar}
        >
          {mutacion.isPending
            ? "Enviando..."
            : elegido
              ? `Reconocer a ${elegido.nombre}`
              : "Selecciona un destinatario"}
        </Button>
      </View>
    </Modal>
  );
}
