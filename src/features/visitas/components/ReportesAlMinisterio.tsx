import React, { useState } from "react";
import { Text, View } from "react-native";
import { mensajeDeError } from "@/shared/utils";
import { Button, Modal } from "@/shared/components";
import { useUIStore } from "@/stores";
import { reportarAlSire } from "../services/precheckin.repo";
import { ConfirmarTra } from "./ConfirmarTra";

interface Props {
  visitaUuid: string;
  /** Si la portería ya registró la entrada de alguien de la estancia. */
  haEntrado: boolean;
}

/**
 * Los dos reportes del anfitrión al ministerio: TRA y SIRE.
 *
 * Se retiraron el 09/10/2026 porque se ofrecían **antes de tiempo**: la TRA
 * declara que alguien se alojó, y pulsarla antes de que la portería
 * registrara el ingreso solo podía fallar —el cliente recibió un 409—.
 *
 * Vuelven donde el KT (4.2.6) dice que van: **la portería marca la entrada y
 * eso habilita el botón del anfitrión**. Nunca se reporta solo: lo pulsa
 * quien responde por la estancia. Mientras nadie haya entrado no hay botón,
 * hay una línea que dice qué falta.
 *
 * Hoy los dos son un ensayo. La TRA está en simulación para todos —la cuenta
 * del ministerio es real y no se toca— y el SIRE no tiene forma de enviarse
 * desde ninguna aplicación. Lo que enseñan es lo que se declararía.
 */
export function ReportesAlMinisterio({ visitaUuid, haEntrado }: Props) {
  const addToast = useUIStore((state) => state.addToast);
  /** La ventana que enseña y deja corregir lo que se declara (26/10/2026). */
  const [confirmando, setConfirmando] = useState(false);
  /** El borrador del archivo de extranjeros. */
  const [sire, setSire] = useState<string | null>(null);
  const [reportandoSire, setReportandoSire] = useState(false);

  if (!haEntrado) {
    return (
      <Text className="text-xs text-gray-500">
        Los reportes al ministerio (TRA y SIRE) se habilitan cuando la portería
        registre la entrada.
      </Text>
    );
  }

  const reportarExtranjeros = async () => {
    setReportandoSire(true);
    try {
      const resultado = await reportarAlSire(visitaUuid);
      if (!resultado.aplica) {
        addToast(resultado.motivo ?? "Aquí no aplica el SIRE", "success");
      } else if (!resultado.reportables) {
        addToast(resultado.motivo ?? "No hay extranjeros que reportar", "success");
        if (resultado.avisos?.length) setSire(resultado.avisos.join("\n"));
      } else {
        setSire(resultado.archivo ?? null);
      }
    } catch (error) {
      addToast(mensajeDeError(error, "No se pudo armar el reporte"), "error");
    } finally {
      setReportandoSire(false);
    }
  };

  return (
    <View className="gap-2">
      <Button
        variant="secondary"
        onPress={() => setConfirmando(true)}
        fullWidth
      >
        Reportar al ministerio (TRA)
      </Button>
      <Button
        variant="secondary"
        onPress={reportarExtranjeros}
        loading={reportandoSire}
        fullWidth
      >
        Reporte de extranjeros (SIRE)
      </Button>

      <ConfirmarTra
        visible={confirmando}
        visitaUuid={visitaUuid}
        onClose={() => setConfirmando(false)}
        onReportado={(r) =>
          addToast(
            r.enviado ? "Reportado al ministerio" : `TRA simulada: ${r.motivo ?? "no se envió"}`,
            r.enviado ? "success" : "info",
          )
        }
      />

      <Modal
        visible={Boolean(sire)}
        onClose={() => setSire(null)}
        title="Reporte de extranjeros"
      >
        <View className="gap-3">
          <Text className="text-sm text-gray-700">
            El SIRE no se puede enviar desde aquí: Migración Colombia solo
            recibe este reporte subiendo un archivo a su portal. Esto es el
            borrador, y el formato está pendiente del instructivo oficial.
          </Text>
          <View className="rounded-xl bg-gray-100 px-3.5 py-3">
            <Text
              className="text-xs text-gray-900"
              style={{ fontFamily: "monospace" }}
              selectable
            >
              {sire}
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}
