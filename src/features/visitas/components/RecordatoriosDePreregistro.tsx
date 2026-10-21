import React, { useMemo, useState } from "react";
import { Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { theme } from "@/config";
import { Button, Modal } from "@/shared/components";
import { useUIStore } from "@/stores";
import { useParametrosDeLaBase } from "@/shared/hooks";
import { formatDateInput, mensajeDeError } from "@/shared/utils";
import { useVisitas } from "../hooks/useVisitas";
import { recordarPreregistro } from "../services/precheckin.repo";
import { estanciasPorRecordar, mensajeDeRecordatorio } from "../helpers/porRecordar";

/**
 * «Faltan pocos días»: las estancias que llegan pronto sin preregistro.
 * Cuántos son «pocos» lo dice el parámetro `preregistro_alerta_dias`.
 *
 * Lo pidió la responsable de producto el 14/10/2026: al anfitrión le sale una
 * alerta y un botón para mandar el mensaje. Sin correo del huésped --lo
 * normal antes del preregistro-- el botón deja el mensaje listo para pegar en
 * Airbnb o WhatsApp.
 *
 * Solo sale si hay alguna: una tarjeta vacía en el inicio no dice nada.
 */
export function RecordatoriosDePreregistro() {
  const { items } = useVisitas();
  const { addToast } = useUIStore();
  const [enviando, setEnviando] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const parametros = useParametrosDeLaBase();

  // Sin parámetros no se sabe cuáles van tarde: no sale nada hasta saberlo.
  const pendientes = useMemo(
    () =>
      parametros.listo
        ? estanciasPorRecordar(
            items,
            formatDateInput(new Date()),
            parametros.numero("preregistro_alerta_dias"),
          )
        : [],
    [items, parametros],
  );

  if (pendientes.length === 0) return null;

  const recordar = async (uuid: string, nombre: string, dias: number) => {
    setEnviando(uuid);
    try {
      const { enlace, correoEnviado } = await recordarPreregistro(uuid, dias);
      if (correoEnviado) {
        addToast("Recordatorio enviado por correo", "success");
      } else {
        setMensaje(mensajeDeRecordatorio(nombre, dias, enlace));
      }
    } catch (e) {
      addToast(mensajeDeError(e, "No se pudo preparar el recordatorio"), "error");
    } finally {
      setEnviando(null);
    }
  };

  return (
    <View
      className="bg-white rounded-xl p-4 gap-3"
      style={{ boxShadow: theme.shadows.card }}
    >
      <Text className="text-base font-bold text-gray-900">
        Llegan pronto y sin preregistro
      </Text>
      {pendientes.map(({ visita, dias }) => (
        <View
          key={visita.uuid}
          className="flex-row items-center gap-3 rounded-xl bg-amber-50 p-3"
        >
          <View className="flex-1">
            <Text className="text-sm font-semibold text-gray-900">{visita.nombre}</Text>
            <Text className="text-xs text-gray-600">
              {visita.depto ? `Vivienda ${visita.depto} · ` : ""}
              {dias <= 0 ? "Llega hoy" : dias === 1 ? "Llega mañana" : `Llega en ${dias} días`}
            </Text>
          </View>
          <Button
            size="sm"
            loading={enviando === visita.uuid}
            onPress={() => recordar(visita.uuid ?? "", visita.nombre, dias)}
          >
            Enviar recordatorio
          </Button>
        </View>
      ))}

      <Modal visible={!!mensaje} onClose={() => setMensaje(null)} title="Mensaje listo">
        <View className="gap-4">
          <Text className="text-sm leading-5 text-gray-700">
            No tenemos el correo del huésped. Copia el mensaje y pégalo en Airbnb
            o WhatsApp. El enlace anterior deja de valer.
          </Text>
          <View className="rounded-xl bg-gray-100 p-3">
            <Text className="text-sm text-gray-900">{mensaje}</Text>
          </View>
          <Button
            fullWidth
            onPress={async () => {
              await Clipboard.setStringAsync(mensaje ?? "");
              addToast("Mensaje copiado", "success");
              setMensaje(null);
            }}
          >
            Copiar mensaje
          </Button>
        </View>
      </Modal>
    </View>
  );
}
