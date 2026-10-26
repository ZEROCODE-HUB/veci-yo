import React from "react";
import { Linking, Text, View } from "react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button, Cargando } from "@/shared/components";
import { useAuthStore, useUIStore } from "@/stores";
import { useCondominioActivo, useNavegacion } from "@/shared/hooks";
import { mensajeDeError } from "@/shared/utils/error.util";
import { abrirConversacionArea } from "@/features/home/services/chat.repo";
import { obtenerContactosDeLaVivienda, type ContactoDeLaVivienda } from "../services/contactos.repo";
import { enlaceDeWhatsApp, numeroParaMarcar, PAPEL_EN_LA_VIVIENDA } from "../helpers/contactos";

interface Props {
  unidadId: string;
  /** Cierra el detalle antes de ir al chat. */
  onAbrirChat: () => void;
}

/**
 * A quién llamar en una vivienda (huecos 11 y 20).
 *
 * Por cada persona: su papel, «Llamar», «WhatsApp» si lo aceptó y «Chat» si
 * aceptó que le escriban; debajo, su contacto de emergencia y su contacto
 * alternativo si los tiene. El chat abre la conversación de la vivienda con
 * el área de quien mira: la administración con «Administración», la portería
 * con «Seguridad».
 */
export function ContactosDeLaVivienda({ unidadId, onAbrirChat }: Props) {
  const navigation = useNavegacion();
  const rolActivo = useAuthStore((s) => s.rolActivo);
  const usuarioId = useAuthStore((s) => s.usuarioId ?? "");
  const condominioId = useCondominioActivo() ?? "";
  const addToast = useUIStore((s) => s.addToast);

  const contactos = useQuery({
    queryKey: ["directorio", "contactos-de-la-vivienda", unidadId],
    queryFn: () => obtenerContactosDeLaVivienda(unidadId),
  });

  const chat = useMutation({
    mutationFn: () =>
      abrirConversacionArea({
        condominioId,
        unidadId,
        area: rolActivo === "administrador" ? "administracion" : "seguridad",
        usuarioId,
      }),
    onSuccess: (conversacionId) => {
      onAbrirChat();
      navigation.navigate("ChatConversacion", { conversationId: conversacionId });
    },
    onError: (e) => addToast(mensajeDeError(e, "No se pudo abrir el chat"), "error"),
  });

  const llamar = (codigo: string | null, telefono: string) =>
    void Linking.openURL(`tel:${numeroParaMarcar(codigo, telefono).replace(/\s/g, "")}`);

  if (contactos.isLoading) return <Cargando variante="enLinea" texto="los contactos" />;
  if (contactos.isError) {
    return (
      <Text className="text-sm text-gray-500">
        {mensajeDeError(contactos.error, "No se pudieron cargar los contactos")}
      </Text>
    );
  }
  const personas = contactos.data ?? [];
  if (personas.length === 0) {
    return <Text className="text-sm text-center text-gray-500">Esta vivienda no tiene a nadie registrado.</Text>;
  }

  return (
    <View className="gap-3">
      <Text className="text-sm font-semibold text-gray-900">A quién contactar</Text>
      {personas.map((p) => (
        <Persona
          key={p.membresiaId}
          persona={p}
          onLlamar={llamar}
          onChat={() => chat.mutate()}
          abriendoChat={chat.isPending}
        />
      ))}
    </View>
  );
}

function Persona({
  persona: p,
  onLlamar,
  onChat,
  abriendoChat,
}: {
  persona: ContactoDeLaVivienda;
  onLlamar: (codigo: string | null, telefono: string) => void;
  onChat: () => void;
  abriendoChat: boolean;
}) {
  const papeles = [
    p.esAnfitrionPrimario ? "Anfitrión primario" : null,
    p.esAdminPrimario ? "Administrador de la vivienda" : null,
    PAPEL_EN_LA_VIVIENDA[p.rol] ?? null,
  ].filter(Boolean);
  const whatsapp = p.whatsapp && p.telefono ? enlaceDeWhatsApp(p.codigoPais, p.telefono) : null;

  return (
    <View className="gap-2 rounded-xl border border-gray-200 p-3">
      <View>
        <Text className="text-sm font-bold text-gray-900">{p.nombre}</Text>
        <Text className="text-xs text-gray-500">{papeles.join(" · ")}</Text>
        {p.telefono ? (
          <Text className="text-xs text-gray-500">{numeroParaMarcar(p.codigoPais, p.telefono)}</Text>
        ) : null}
      </View>
      <View className="flex-row flex-wrap gap-2">
        {p.telefono ? (
          <Button size="sm" variant="secondary" onPress={() => onLlamar(p.codigoPais, p.telefono ?? "")}>
            📞 Llamar
          </Button>
        ) : null}
        {whatsapp ? (
          <Button size="sm" variant="secondary" onPress={() => void Linking.openURL(whatsapp)}>
            WhatsApp
          </Button>
        ) : null}
        {p.chat ? (
          <Button size="sm" variant="secondary" onPress={onChat} loading={abriendoChat}>
            💬 Chat
          </Button>
        ) : null}
      </View>
      {!p.telefono && !p.chat ? (
        <Text className="text-xs text-gray-500">No dejó teléfono ni aceptó el chat.</Text>
      ) : null}
      {p.emergencia ? (
        <View className="gap-1 rounded-lg bg-gray-100 px-3 py-2">
          <Text className="text-xs font-semibold text-gray-700">
            {`En una emergencia: ${p.emergencia.nombre ?? "contacto de emergencia"}`}
          </Text>
          <Text className="text-xs text-gray-600">
            {numeroParaMarcar(p.emergencia.codigoPais, p.emergencia.telefono)}
          </Text>
          <Button
            size="sm"
            variant="ghost"
            onPress={() => onLlamar(p.emergencia?.codigoPais ?? null, p.emergencia?.telefono ?? "")}
          >
            📞 Llamar al contacto de emergencia
          </Button>
        </View>
      ) : null}
      {p.alterno ? (
        <View className="gap-1 rounded-lg bg-gray-100 px-3 py-2">
          <Text className="text-xs font-semibold text-gray-700">Contacto alternativo</Text>
          {p.alterno.telefono ? (
            <Text className="text-xs text-gray-600">{numeroParaMarcar(p.alterno.codigoPais, p.alterno.telefono)}</Text>
          ) : null}
          {p.alterno.correo ? <Text className="text-xs text-gray-600">{p.alterno.correo}</Text> : null}
          {p.alterno.telefono ? (
            <Button
              size="sm"
              variant="ghost"
              onPress={() => onLlamar(p.alterno?.codigoPais ?? null, p.alterno?.telefono ?? "")}
            >
              📞 Llamar al alternativo
            </Button>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
