import React from "react";
import { Linking, Text, View } from "react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button, Cargando } from "@/shared/components";
import { useAuthStore, useUIStore } from "@/stores";
import { useCondominioActivo, useNavegacion, useNombreDelCitofono } from "@/shared/hooks";
import { mensajeDeError } from "@/shared/utils/error.util";
import { anotarEnLaBase, describirError } from "@/shared/services/erroresDeLaApp";
import { abrirConversacionArea } from "@/features/home/services/chat.repo";
import { permisosDeComunicacion } from "@/features/home/components/permisosComunicacion";
import { llamarAVivienda } from "@/features/intercom/services/intercom.repo";
import { useIntercomStore } from "@/features/intercom/intercom-store";
import { obtenerContactosDeLaVivienda, type ContactoDeLaVivienda } from "../services/contactos.repo";
import { enlaceDeWhatsApp, numeroParaMarcar } from "../helpers/contactos";
import { ordenDeContactacion, type TarjetaDeContacto } from "../helpers/ordenDeContactacion";

interface Props {
  unidadId: string;
  /** Cierra el detalle antes de ir al chat. */
  onAbrirChat: () => void;
}

/**
 * A quién llamar en una vivienda (huecos 11 y 20).
 *
 * Por cada persona: su papel, «Llamar», «WhatsApp» si lo aceptó y «Chat» si
 * aceptó que le escriban; debajo, su contacto alternativo si lo tiene. El
 * chat abre la conversación de la vivienda con el área de quien mira: la
 * administración con «Administración», la portería con «Seguridad».
 *
 * 09/11/2026 (Correcciones fila 8): una tarjeta por contacto, numerada, en el
 * «Orden de contactación» (`ordenDeContactacion`): huésped temporal,
 * anfitrión primario, contacto de emergencia del anfitrión y el resto. Y la
 * llamada por la app (fila 9): a la portería solo se le ofrece si la
 * administración le habilitó las llamadas --antes salía igual y la base la
 * rechazaba--, y cada botón tiene su propio «cargando».
 */
export function ContactosDeLaVivienda({ unidadId, onAbrirChat }: Props) {
  const navigation = useNavegacion();
  const rolActivo = useAuthStore((s) => s.rolActivo);
  const usuarioId = useAuthStore((s) => s.usuarioId ?? "");
  const condominios = useAuthStore((s) => s.condominios);
  const condominioId = useCondominioActivo() ?? "";
  const addToast = useUIStore((s) => s.addToast);
  const { puedeLlamar } = permisosDeComunicacion({
    rolActivo,
    permisos: condominios.find((c) => c.rol === "guardia")?.permisos,
  });

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

  const iniciarLlamada = useIntercomStore((s) => s.iniciar);
  const porLaApp = useMutation({
    mutationFn: (_quien: { membresiaId: string; nombre: string }) => llamarAVivienda(unidadId),
    onSuccess: (id, quien) => {
      onAbrirChat();
      iniciarLlamada(id, true, quien.nombre);
    },
    onError: (e) => {
      const { mensaje, detalle } = describirError(e);
      void anotarEnLaBase("error", "llamar", `a la vivienda desde el directorio: ${mensaje}`, detalle);
      addToast(mensajeDeError(e, "No se pudo llamar"), "error");
    },
  });

  const llamar = async (codigo: string | null, telefono: string) => {
    const numero = numeroParaMarcar(codigo, telefono);
    try {
      await Linking.openURL(`tel:${numero.replace(/\s/g, "")}`);
    } catch {
      addToast(`No se pudo abrir el marcador. Marca ${numero}.`, "error");
    }
  };

  if (contactos.isLoading) return <Cargando variante="enLinea" texto="los contactos" />;
  if (contactos.isError) {
    return (
      <Text className="text-sm text-gray-500">
        {mensajeDeError(contactos.error, "No se pudieron cargar los contactos")}
      </Text>
    );
  }
  const tarjetas = ordenDeContactacion(contactos.data ?? []);
  if (tarjetas.length === 0) {
    return <Text className="text-sm text-center text-gray-500">Esta vivienda no tiene a nadie registrado.</Text>;
  }

  return (
    <View className="gap-3">
      <Text className="text-sm font-semibold text-gray-900">Orden de contactación</Text>
      {tarjetas.map((t) =>
        t.tipo === "persona" ? (
          <Persona
            key={`p-${t.persona.membresiaId}`}
            tarjeta={t}
            onLlamar={(codigo, telefono) => void llamar(codigo, telefono)}
            onChat={() => chat.mutate()}
            abriendoChat={chat.isPending}
            puedeLlamarPorLaApp={puedeLlamar}
            onLlamarPorLaApp={() =>
              porLaApp.mutate({ membresiaId: t.persona.membresiaId, nombre: t.persona.nombre })
            }
            llamandoPorLaApp={porLaApp.isPending && porLaApp.variables?.membresiaId === t.persona.membresiaId}
          />
        ) : (
          <Emergencia
            key={`e-${t.orden}`}
            tarjeta={t}
            onLlamar={(codigo, telefono) => void llamar(codigo, telefono)}
          />
        ),
      )}
    </View>
  );
}

function Numero({ orden }: { orden: number }) {
  return (
    <View className="h-6 w-6 items-center justify-center rounded-full bg-primary">
      <Text className="text-xs font-bold text-white">{orden}</Text>
    </View>
  );
}

function Persona({
  tarjeta,
  onLlamar,
  onChat,
  abriendoChat,
  puedeLlamarPorLaApp,
  onLlamarPorLaApp,
  llamandoPorLaApp,
}: {
  tarjeta: Extract<TarjetaDeContacto, { tipo: "persona" }>;
  onLlamar: (codigo: string | null, telefono: string) => void;
  onChat: () => void;
  abriendoChat: boolean;
  puedeLlamarPorLaApp: boolean;
  onLlamarPorLaApp: () => void;
  llamandoPorLaApp: boolean;
}) {
  const citofono = useNombreDelCitofono();
  const p: ContactoDeLaVivienda = tarjeta.persona;
  const whatsapp = p.whatsapp && p.telefono ? enlaceDeWhatsApp(p.codigoPais, p.telefono) : null;

  return (
    <View className="gap-2 rounded-xl border border-gray-200 p-3">
      <View className="flex-row items-start gap-2">
        <Numero orden={tarjeta.orden} />
        <View className="flex-1">
          <Text className="text-sm font-bold text-gray-900">{p.nombre}</Text>
          <Text className="text-xs text-gray-500">{tarjeta.papel}</Text>
          {p.telefono ? (
            <Text className="text-xs text-gray-500">{numeroParaMarcar(p.codigoPais, p.telefono)}</Text>
          ) : null}
        </View>
      </View>
      <View className="flex-row flex-wrap gap-2">
        {p.recibeLlamadasApp && puedeLlamarPorLaApp ? (
          <Button size="sm" onPress={onLlamarPorLaApp} loading={llamandoPorLaApp}>
            {`📱 Llamar por el ${citofono}`}
          </Button>
        ) : null}
        {p.telefono ? (
          <Button size="sm" variant="secondary" onPress={() => onLlamar(p.codigoPais, p.telefono ?? "")}>
            📞 Llamar por teléfono
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
      {p.tieneCuenta && !p.recibeLlamadasApp ? (
        <Text className="text-xs text-gray-500">{`Desactivó las llamadas por el ${citofono}.`}</Text>
      ) : null}
      {p.recibeLlamadasApp && !puedeLlamarPorLaApp ? (
        <Text className="text-xs text-gray-500">
          {`La administración no te habilitó las llamadas por el ${citofono}.`}
        </Text>
      ) : null}
      {!p.telefono && !p.chat && !p.recibeLlamadasApp ? (
        <Text className="text-xs text-gray-500">No dejó teléfono ni aceptó el chat.</Text>
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

function Emergencia({
  tarjeta,
  onLlamar,
}: {
  tarjeta: Extract<TarjetaDeContacto, { tipo: "emergencia" }>;
  onLlamar: (codigo: string | null, telefono: string) => void;
}) {
  const e = tarjeta.emergencia;
  return (
    <View className="gap-2 rounded-xl border border-gray-200 p-3">
      <View className="flex-row items-start gap-2">
        <Numero orden={tarjeta.orden} />
        <View className="flex-1">
          <Text className="text-sm font-bold text-gray-900">{e.nombre ?? "Contacto de emergencia"}</Text>
          <Text className="text-xs text-gray-500">{tarjeta.papel}</Text>
          <Text className="text-xs text-gray-500">{numeroParaMarcar(e.codigoPais, e.telefono)}</Text>
        </View>
      </View>
      <View className="flex-row flex-wrap gap-2">
        <Button size="sm" variant="secondary" onPress={() => onLlamar(e.codigoPais, e.telefono)}>
          📞 Llamar por teléfono
        </Button>
      </View>
    </View>
  );
}
