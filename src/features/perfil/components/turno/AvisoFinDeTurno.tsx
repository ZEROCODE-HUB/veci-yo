import React, { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useMutation } from "@tanstack/react-query";
import { theme } from "@/config";
import { Button, ListaDeHoras, Modal } from "@/shared/components";
import { EtiquetaDelCampo } from "@/shared/components/ui/EtiquetaDelCampo";
import { useCondominioActivo } from "@/shared/hooks";
import { useUIStore } from "@/stores";
import { formatTime } from "@/shared/utils";
import { mensajeDeError } from "@/shared/utils/error.util";
import { useFueraDeTurno } from "../../hooks/useFueraDeTurno";
import { solicitarProrroga } from "../../services/prorroga.repo";

/** Cuánto antes del final se avisa. */
const AVISAR_DESDE_MINUTOS = 60;

function textoDeMinutos(minutos: number) {
  if (minutos < 60) return `${minutos} ${minutos === 1 ? "minuto" : "minutos"}`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto ? `${horas} h ${resto} min` : `${horas} h`;
}

/**
 * En el Inicio del guardia, cuando le queda una hora o menos de turno: cuánto
 * le falta, que se actualiza solo, y «Solicitar prórroga» (Para Claude 177 y
 * 178, 30/10/2026). La prórroga pide hasta qué hora y el motivo; la
 * administración la acepta o la rechaza desde el aviso que le llega.
 */
export function AvisoFinDeTurno() {
  const condominioId = useCondominioActivo() ?? "";
  const addToast = useUIStore((s) => s.addToast);
  const { minutosRestantes, prorroga, recargarProrroga } = useFueraDeTurno();
  const [abierto, setAbierto] = useState(false);
  const [hasta, setHasta] = useState("");
  const [motivo, setMotivo] = useState("");

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

  if (minutosRestantes === null || minutosRestantes > AVISAR_DESDE_MINUTOS) return null;

  const pendiente = prorroga?.estado === "pendiente";
  const aceptada = prorroga?.estado === "aceptada";
  const faltaAlgo = !hasta || !motivo.trim();

  return (
    <View className="mx-4 mt-4 gap-2 rounded-2xl p-3" style={{ backgroundColor: theme.colors.warningSoft }}>
      <Text className="text-sm font-semibold" style={{ color: theme.colors.badgeAmberText }}>
        {aceptada
          ? `Tu prórroga termina en ${textoDeMinutos(minutosRestantes)}`
          : `Tu turno termina en ${textoDeMinutos(minutosRestantes)}`}
      </Text>
      {pendiente ? (
        <Text className="text-xs" style={{ color: theme.colors.badgeAmberText }}>
          {`Pediste seguir hasta las ${formatTime(prorroga.hasta)}. Esperando respuesta de la administración.`}
        </Text>
      ) : !aceptada ? (
        <Button size="sm" variant="secondary" onPress={() => setAbierto(true)}>
          Solicitar prórroga
        </Button>
      ) : null}

      <Modal visible={abierto} onClose={() => setAbierto(false)} title="Solicitar prórroga">
        <View className="gap-3">
          <EtiquetaDelCampo label="¿Hasta qué hora? *" />
          <ListaDeHoras value={hasta} onChange={setHasta} paso={15} />
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
