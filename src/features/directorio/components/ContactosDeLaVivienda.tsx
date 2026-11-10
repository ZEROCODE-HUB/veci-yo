import React, { useState } from "react";
import { Linking, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Cargando } from "@/shared/components";
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
import { BotonDeContacto } from "./BotonDeContacto";

interface Props {
  unidadId: string;
  /** Cierra el detalle antes de ir al chat. */
  onAbrirChat: () => void;
}

/**
 * A quién llamar en una vivienda (huecos 11 y 20).
 *
 * Una tarjeta por contacto, numerada, en el «Orden de contactación»
 * (`ordenDeContactacion`, Correcciones fila 8): huésped temporal, anfitrión
 * primario, contacto de emergencia del anfitrión y el resto.
 *
 * 10/11/2026, pedido del cliente: «muchos botones». Cada tarjeta lleva el
 * número en grande y debajo solo iconos: copiar, llamar por la app (si la
 * persona las recibe y a la portería se las habilitaron), WhatsApp (si lo
 * aceptó) y chat (si lo aceptó). La llamada por teléfono se quitó: para eso
 * está copiar el número.
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
            onChat={() => chat.mutate()}
            abriendoChat={chat.isPending}
            puedeLlamarPorLaApp={puedeLlamar}
            onLlamarPorLaApp={() =>
              porLaApp.mutate({ membresiaId: t.persona.membresiaId, nombre: t.persona.nombre })
            }
            llamandoPorLaApp={porLaApp.isPending && porLaApp.variables?.membresiaId === t.persona.membresiaId}
          />
        ) : (
          <Emergencia key={`e-${t.orden}`} tarjeta={t} />
        ),
      )}
    </View>
  );
}

function Orden({ orden }: { orden: number }) {
  return (
    <View className="h-6 w-6 items-center justify-center rounded-full bg-primary">
      <Text className="text-xs font-bold text-white">{orden}</Text>
    </View>
  );
}

/** Copiar al portapapeles, con el visto verde un momento. */
function Copiar({ valor, nombre }: { valor: string; nombre: string }) {
  const [copiado, setCopiado] = useState(false);
  const addToast = useUIStore((s) => s.addToast);
  return (
    <BotonDeContacto
      icono="copy-outline"
      nombre={nombre}
      hecho={copiado}
      onPress={() => {
        Clipboard.setStringAsync(valor)
          .then(() => {
            setCopiado(true);
            setTimeout(() => setCopiado(false), 1500);
          })
          .catch(() => addToast("No se pudo copiar", "error"));
      }}
    />
  );
}

function WhatsApp({ enlace }: { enlace: string }) {
  const addToast = useUIStore((s) => s.addToast);
  return (
    <BotonDeContacto
      icono="logo-whatsapp"
      nombre="Escribir por WhatsApp"
      onPress={() => {
        Linking.openURL(enlace).catch(() => addToast("No se pudo abrir WhatsApp", "error"));
      }}
    />
  );
}

/** El número en grande, como se marca, con el prefijo del país. */
function NumeroGrande({ numero }: { numero: string }) {
  return (
    <Text className="text-xl font-bold text-gray-900" selectable>
      {numero}
    </Text>
  );
}

function Persona({
  tarjeta,
  onChat,
  abriendoChat,
  puedeLlamarPorLaApp,
  onLlamarPorLaApp,
  llamandoPorLaApp,
}: {
  tarjeta: Extract<TarjetaDeContacto, { tipo: "persona" }>;
  onChat: () => void;
  abriendoChat: boolean;
  puedeLlamarPorLaApp: boolean;
  onLlamarPorLaApp: () => void;
  llamandoPorLaApp: boolean;
}) {
  const citofono = useNombreDelCitofono();
  const p: ContactoDeLaVivienda = tarjeta.persona;
  const numero = p.telefono ? numeroParaMarcar(p.codigoPais, p.telefono) : null;
  const whatsapp = p.whatsapp && p.telefono ? enlaceDeWhatsApp(p.codigoPais, p.telefono) : null;
  const porLaApp = p.recibeLlamadasApp && puedeLlamarPorLaApp;
  const alterno = p.alterno?.telefono ? numeroParaMarcar(p.alterno.codigoPais, p.alterno.telefono) : null;
  const whatsappAlterno = p.alterno?.telefono
    ? enlaceDeWhatsApp(p.alterno.codigoPais, p.alterno.telefono)
    : null;

  return (
    <View className="gap-2 rounded-xl border border-gray-200 p-3">
      <View className="flex-row items-start gap-2">
        <Orden orden={tarjeta.orden} />
        <View className="flex-1">
          <Text className="text-sm font-bold text-gray-900">{p.nombre}</Text>
          <Text className="text-xs text-gray-500">{tarjeta.papel}</Text>
        </View>
      </View>
      {numero ? <NumeroGrande numero={numero} /> : null}
      {numero || porLaApp || p.chat ? (
        <View className="flex-row flex-wrap gap-3">
          {numero ? <Copiar valor={numero} nombre="Copiar el número" /> : null}
          {porLaApp ? (
            <BotonDeContacto
              icono="call-outline"
              nombre={`Llamar por el ${citofono}`}
              onPress={onLlamarPorLaApp}
              cargando={llamandoPorLaApp}
            />
          ) : null}
          {whatsapp ? <WhatsApp enlace={whatsapp} /> : null}
          {p.chat ? (
            <BotonDeContacto
              icono="chatbubble-ellipses-outline"
              nombre="Abrir el chat"
              onPress={onChat}
              cargando={abriendoChat}
            />
          ) : null}
        </View>
      ) : null}
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
        <View className="gap-2 rounded-lg bg-gray-100 px-3 py-2">
          <Text className="text-xs font-semibold text-gray-700">Contacto alternativo</Text>
          {alterno ? (
            <>
              <Text className="text-base font-bold text-gray-900" selectable>
                {alterno}
              </Text>
              <View className="flex-row flex-wrap gap-3">
                <Copiar valor={alterno} nombre="Copiar el número alternativo" />
                {whatsappAlterno ? <WhatsApp enlace={whatsappAlterno} /> : null}
              </View>
            </>
          ) : null}
          {p.alterno.correo ? (
            <View className="flex-row items-center gap-3">
              <Text className="flex-1 text-sm text-gray-700" selectable>
                {p.alterno.correo}
              </Text>
              <Copiar valor={p.alterno.correo} nombre="Copiar el correo alternativo" />
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function Emergencia({ tarjeta }: { tarjeta: Extract<TarjetaDeContacto, { tipo: "emergencia" }> }) {
  const e = tarjeta.emergencia;
  const numero = numeroParaMarcar(e.codigoPais, e.telefono);
  const whatsapp = enlaceDeWhatsApp(e.codigoPais, e.telefono);
  return (
    <View className="gap-2 rounded-xl border border-gray-200 p-3">
      <View className="flex-row items-start gap-2">
        <Orden orden={tarjeta.orden} />
        <View className="flex-1">
          <Text className="text-sm font-bold text-gray-900">{e.nombre ?? "Contacto de emergencia"}</Text>
          <Text className="text-xs text-gray-500">{tarjeta.papel}</Text>
        </View>
      </View>
      <NumeroGrande numero={numero} />
      <View className="flex-row flex-wrap gap-3">
        <Copiar valor={numero} nombre="Copiar el número" />
        {whatsapp ? <WhatsApp enlace={whatsapp} /> : null}
      </View>
    </View>
  );
}
