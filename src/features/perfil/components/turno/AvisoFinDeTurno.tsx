import React, { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { theme } from "@/config";
import { Button, Cargando, ListaDeHoras, Modal } from "@/shared/components";
import { EtiquetaDelCampo } from "@/shared/components/ui/EtiquetaDelCampo";
import { useCondominioActivo } from "@/shared/hooks";
import { useUIStore } from "@/stores";
import { mensajeDeError } from "@/shared/utils/error.util";
import { ahoraMs } from "@/shared/utils/reloj.util";
import { useFueraDeTurno } from "../../hooks/useFueraDeTurno";
import { horasDesde } from "../../helpers/horasDeProrroga";
import { obtenerHoraDelEdificio, solicitarProrroga } from "../../services/prorroga.repo";

/** Cuánto antes del final se avisa. */
const AVISAR_DESDE_MINUTOS = 60;

function textoDeMinutos(minutos: number) {
  if (minutos < 60) return `${minutos} ${minutos === 1 ? "minuto" : "minutos"}`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto ? `${horas} h ${resto} min` : `${horas} h`;
}

/**
 * En el Inicio del guardia, encima del buscador: cuánto le queda de turno y la
 * prórroga (Para Claude 177 y 178, 30/10/2026; 212, 213 y 215, 03/11/2026).
 *
 *   · Le queda una hora o menos: cuánto falta y «Solicitar prórroga». Si la
 *     pidió, que espera respuesta; si se la rechazaron, que se la rechazaron y
 *     el botón otra vez, para pedir otra.
 *   · Se la aprobaron: hasta qué hora y «Ver», con el motivo, la hora y el
 *     estado. Sale mientras dure, no solo en la última hora.
 *
 * Las horas son siempre las del edificio, que da la base: con las del teléfono
 * el detalle llegó a decir 13:30 de una prórroga pedida hasta las 12:30 (214).
 */
export function AvisoFinDeTurno() {
  const condominioId = useCondominioActivo() ?? "";
  const addToast = useUIStore((s) => s.addToast);
  const { minutosRestantes, prorroga, recargarProrroga } = useFueraDeTurno();
  const [abierto, setAbierto] = useState(false);
  const [viendo, setViendo] = useState(false);
  const [hasta, setHasta] = useState("");
  const [motivo, setMotivo] = useState("");

  // Las horas que se ofrecen salen de la hora del edificio, al abrir (213).
  const horaDelEdificio = useQuery({
    queryKey: ["prorroga", "hora-del-edificio", condominioId],
    queryFn: () => obtenerHoraDelEdificio(condominioId),
    enabled: abierto && Boolean(condominioId),
    staleTime: 0,
    gcTime: 0,
  });

  const pedir = useMutation({
    mutationFn: () => solicitarProrroga({ condominioId, hasta, motivo }),
    onSuccess: () => {
      setAbierto(false);
      setHasta("");
      setMotivo("");
      recargarProrroga();
      addToast("Prórroga solicitada. Te avisamos cuando respondan.", "success");
    },
    onError: (e) => addToast(mensajeDeError(e, "No se pudo solicitar la prórroga"), "error"),
  });

  const aprobada = prorroga?.estado === "aceptada" && prorroga.hasta.getTime() > ahoraMs();
  if (minutosRestantes === null) return null;
  if (!aprobada && minutosRestantes > AVISAR_DESDE_MINUTOS) return null;

  if (aprobada) {
    return (
      <View
        className="flex-row items-center gap-3 rounded-2xl p-4"
        style={{ backgroundColor: theme.colors.successSoft, borderWidth: 1, borderColor: theme.colors.success }}
      >
        <Ionicons name="checkmark-circle" size={28} color={theme.colors.success} />
        <View className="flex-1 gap-0.5">
          <Text className="text-sm font-bold" style={{ color: theme.colors.badgeGreenText }}>
            Prórroga aprobada
          </Text>
          <Text className="text-xs" style={{ color: theme.colors.badgeGreenText }}>
            {minutosRestantes <= AVISAR_DESDE_MINUTOS
              ? `Tu turno se extendió hasta las ${prorroga.hastaHora}. Quedan ${textoDeMinutos(minutosRestantes)}.`
              : `Tu turno se extendió hasta las ${prorroga.hastaHora}.`}
          </Text>
        </View>
        <Button size="sm" variant="secondary" onPress={() => setViendo(true)}>
          Ver
        </Button>

        <Modal visible={viendo} onClose={() => setViendo(false)} title="Prórroga aprobada">
          <View className="gap-3">
            <View className="gap-1">
              <Text className="text-xs font-semibold text-gray-500">Hora autorizada</Text>
              <Text className="text-base font-bold text-gray-900">{`Hasta las ${prorroga.hastaHora}`}</Text>
            </View>
            <View className="gap-1">
              <Text className="text-xs font-semibold text-gray-500">Motivo</Text>
              <Text className="text-sm text-gray-900">{prorroga.motivo}</Text>
            </View>
            <View className="gap-1">
              <Text className="text-xs font-semibold text-gray-500">Estado</Text>
              <Text className="text-sm font-semibold" style={{ color: theme.colors.badgeGreenText }}>
                Aprobada
              </Text>
            </View>
            <Button fullWidth onPress={() => setViendo(false)}>
              Cerrar
            </Button>
          </View>
        </Modal>
      </View>
    );
  }

  const pendiente = prorroga?.estado === "pendiente";
  const rechazada = prorroga?.estado === "rechazada";
  const faltaAlgo = !hasta || !motivo.trim();
  const opciones = horasDesde(horaDelEdificio.data ?? null);

  return (
    <View
      className="gap-3 rounded-2xl p-4"
      style={{ backgroundColor: theme.colors.warningSoft, borderWidth: 1, borderColor: theme.colors.warning }}
    >
      <View className="flex-row items-center gap-3">
        <Ionicons name="time-outline" size={28} color={theme.colors.badgeAmberText} />
        <View className="flex-1 gap-0.5">
          <Text className="text-sm font-bold" style={{ color: theme.colors.badgeAmberText }}>
            {`Tu turno termina en ${textoDeMinutos(minutosRestantes)}`}
          </Text>
          {pendiente ? (
            <Text className="text-xs" style={{ color: theme.colors.badgeAmberText }}>
              {`Pediste seguir hasta las ${prorroga.hastaHora}. Esperando respuesta de la administración.`}
            </Text>
          ) : rechazada ? (
            <Text className="text-xs" style={{ color: theme.colors.badgeRedText }}>
              {`La administración rechazó tu prórroga hasta las ${prorroga.hastaHora}. Puedes pedir otra.`}
            </Text>
          ) : (
            <Text className="text-xs" style={{ color: theme.colors.badgeAmberText }}>
              Si necesitas seguir, pide una prórroga a la administración.
            </Text>
          )}
        </View>
      </View>
      {!pendiente ? (
        <Button size="sm" variant="secondary" fullWidth onPress={() => setAbierto(true)}>
          Solicitar prórroga
        </Button>
      ) : null}

      <Modal visible={abierto} onClose={() => setAbierto(false)} title="Solicitar prórroga">
        <View className="gap-3">
          <EtiquetaDelCampo label="¿Hasta qué hora? *" />
          {horaDelEdificio.isLoading ? (
            <Cargando variante="enLinea" texto="las horas" />
          ) : (
            <ListaDeHoras value={hasta} onChange={setHasta} horas={opciones} />
          )}
          <EtiquetaDelCampo label="Motivo *" />
          <TextInput
            value={motivo}
            onChangeText={setMotivo}
            placeholder="Por qué necesitas seguir"
            multiline
            className="min-h-[64px] rounded-xl px-3 py-2 text-sm text-gray-900"
            style={{ borderWidth: 1, borderColor: theme.colors.border, textAlignVertical: "top" }}
            placeholderTextColor={theme.colors.textMuted}
          />
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Button variant="secondary" fullWidth onPress={() => setAbierto(false)} disabled={pedir.isPending}>
                Cancelar
              </Button>
            </View>
            <View className="flex-1">
              <Button fullWidth onPress={() => pedir.mutate()} disabled={faltaAlgo || pedir.isPending}>
                {pedir.isPending ? "Solicitando..." : "Solicitar"}
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
