import React, { useState } from "react";
import { Linking, Text, View } from "react-native";
import { Button, Input, Modal } from "@/shared/components";
import { useUIStore } from "@/stores";
import { mensajeDeError } from "@/shared/utils";
import type { Invitado } from "@/shared/types";
import { TEXTO_DEL_MOTIVO } from "../helpers/estadoDeLaVerificacion";

interface Props {
  invitado: Invitado;
  onResolver: (aprobar: boolean, nota?: string) => Promise<void>;
  onAbrirInforme: () => Promise<string>;
}

/**
 * El paso de la verificación de antecedentes, para el anfitrión.
 *
 * Sustituye a «Aprobar / Aprobar con hallazgos», que escribían una
 * verificación simulada y enseñaban un texto de hallazgos inventado
 * (14/10/2026). Ahora la consulta es real y corre sola; el anfitrión solo
 * decide cuando hace falta —hallazgo, consulta imposible o incapacidad
 * declarada— y para eso ve el informe, con la marca de «no compartir».
 */
/**
 * Lo que tiene que hacer el anfitrión después de no autorizar a alguien. Lo
 * pidió la responsable de producto el 16/10/2026: la reserva sigue viva en la
 * plataforma, y el huésped tiene que enterarse cuanto antes.
 */
const QUE_HACER_AL_NO_AUTORIZAR =
  "Contacta a tu plataforma de reservas (Airbnb, Booking…) para sustentar la " +
  "cancelación de la reserva, y que tu huésped sea notificado cuanto antes.";

export function VerificacionDelHuesped({ invitado, onResolver, onAbrirInforme }: Props) {
  const { addToast } = useUIStore();
  const [confirmando, setConfirmando] = useState(false);
  const [rechazando, setRechazando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [errorMotivo, setErrorMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [abriendo, setAbriendo] = useState(false);

  const estado = invitado.verificacion ?? "sin_iniciar";

  const verInforme = async () => {
    setAbriendo(true);
    try {
      await Linking.openURL(await onAbrirInforme());
    } catch (e) {
      addToast(mensajeDeError(e, "No se pudo abrir el informe"), "error");
    } finally {
      setAbriendo(false);
    }
  };

  const decidir = async (aprobar: boolean) => {
    if (!aprobar && !motivo.trim()) {
      setErrorMotivo("Escribe por qué no la autorizas.");
      return;
    }
    setEnviando(true);
    try {
      await onResolver(aprobar, aprobar ? undefined : motivo.trim());
      setConfirmando(false);
      setRechazando(false);
      addToast(aprobar ? "Aprobada bajo tu responsabilidad" : "No autorizada", "success");
    } catch {
      // El aviso del fallo lo da el hook.
    } finally {
      setEnviando(false);
    }
  };

  const botonInforme = invitado.tieneInforme ? (
    <Button variant="secondary" size="sm" loading={abriendo} onPress={verInforme}>
      Ver informe
    </Button>
  ) : null;

  return (
    <View className="ml-6 gap-2">
      {estado === "sin_iniciar" ? (
        <Text className="text-2xs text-gray-500">
          Se consulta sola al cerrar el preregistro.
        </Text>
      ) : null}
      {estado === "en_curso" ? (
        <Text className="text-2xs text-gray-500">
          Consulta en curso. Tarda alrededor de un minuto.
        </Text>
      ) : null}
      {estado === "aprobada" ? (
        <Text className="text-2xs text-gray-500">Sin hallazgos.</Text>
      ) : null}

      {estado === "revision" ? (
        <View className="gap-2 rounded-xl bg-amber-100 p-3">
          <Text className="text-xs font-bold text-amber-900">
            Requiere tu aprobación
          </Text>
          <Text className="text-xs text-amber-900">
            {invitado.motivoRevision ? TEXTO_DEL_MOTIVO[invitado.motivoRevision] : ""}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {botonInforme}
            <Button size="sm" onPress={() => setConfirmando(true)}>
              Aprobar
            </Button>
            <Button
              variant="danger"
              size="sm"
              onPress={() => {
                setMotivo("");
                setErrorMotivo("");
                setRechazando(true);
              }}
            >
              No autorizar
            </Button>
          </View>
        </View>
      ) : null}

      {estado === "aprobada_manual" ? (
        <View className="flex-row flex-wrap items-center gap-2">
          <Text className="text-2xs text-gray-500">
            La aprobaste tú, bajo tu responsabilidad.
          </Text>
          {botonInforme}
        </View>
      ) : null}

      {estado === "rechazada" ? (
        <View className="gap-1 rounded-xl bg-red-50 p-3">
          <Text className="text-xs font-bold text-red-700">No autorizada</Text>
          {invitado.revisionNota ? (
            <Text className="text-xs text-red-700">Motivo: {invitado.revisionNota}</Text>
          ) : null}
          <Text className="text-2xs text-gray-700">
            La portería no le dejará entrar.
          </Text>
          <Text className="text-2xs text-gray-700">{QUE_HACER_AL_NO_AUTORIZAR}</Text>
        </View>
      ) : null}

      <Modal
        visible={confirmando}
        onClose={() => setConfirmando(false)}
        title="Aprobar a esta persona"
      >
        <View className="gap-4">
          <Text className="text-sm leading-5 text-gray-700">
            Al aprobar a {invitado.nombre} asumes la responsabilidad de su
            estancia. Queda anotado que lo decidiste tú y cuándo.
          </Text>
          <View className="flex-row gap-2.5">
            <View className="flex-1">
              <Button variant="secondary" fullWidth onPress={() => setConfirmando(false)}>
                Volver
              </Button>
            </View>
            <View className="flex-1">
              <Button fullWidth loading={enviando} onPress={() => decidir(true)}>
                Aprobar
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={rechazando}
        onClose={() => setRechazando(false)}
        title="No autorizar"
      >
        <View className="gap-4">
          <Text className="text-sm leading-5 text-gray-700">
            {invitado.nombre} no podrá entrar al edificio: la portería verá que
            no autorizaste su ingreso.
          </Text>
          <Text className="text-sm leading-5 text-gray-700">
            {QUE_HACER_AL_NO_AUTORIZAR}
          </Text>
          <Input
            label="Motivo"
            value={motivo}
            onChangeText={(texto) => {
              setMotivo(texto);
              setErrorMotivo("");
            }}
            placeholder="Ej.: el informe trae antecedentes"
            multiline
            showEditIcon={false}
            error={errorMotivo || undefined}
          />
          <View className="flex-row gap-2.5">
            <View className="flex-1">
              <Button variant="secondary" fullWidth onPress={() => setRechazando(false)}>
                Volver
              </Button>
            </View>
            <View className="flex-1">
              <Button
                variant="danger"
                fullWidth
                loading={enviando}
                onPress={() => decidir(false)}
              >
                No autorizar
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
