import React from "react";
import { View } from "react-native";
import type { Invitado } from "@/shared/types";
import { ConfirmarIdentidad } from "./ConfirmarIdentidad";
import { useAprobarAMano, useVerificarPorEscaneo } from "../hooks/useAprobarAMano";
import { useUIStore } from "@/stores";

interface Props {
  persona: Invitado;
  onCerrar: () => void;
  /**
   * Quedó verificado (por escaneo o a mano). Quien lo abre registra la
   * llegada con esto: el interruptor «Registrar llegada» es el que verifica
   * (09/11/2026, Correcciones fila 22).
   */
  onVerificado?: () => void;
}

/**
 * El registro de entrada de un huésped en portería: primero se escanea el
 * documento físico, cuyo texto lee el celular y compara con lo registrado, y
 * después el guardia dice si la persona que tiene en frente es la del
 * documento (09/11/2026, Correcciones fila 23: «primero escanear, segundo la
 * misma persona, sin la foto del documento»). Si no se puede leer o no
 * coincide, se vuelve a escanear o se aprueba a mano, quedando quién y por qué.
 *
 * Es la única puerta para verificar a un huésped, y se abre desde el
 * interruptor «Registrar llegada» de la estancia.
 *
 * 05/11/2026: la verificación dice por qué camino coincidió (código de barras,
 * MRZ, número o nombre) y ya no necesita el número registrado: un huésped que
 * coincide por nombre y no escribió su número también queda validado.
 */
export function EntradaDelHuesped({ persona, onCerrar, onVerificado }: Props) {
  const aprobar = useAprobarAMano();
  const verificar = useVerificarPorEscaneo();
  const invitadoUuid = persona.uuid;
  const { addToast } = useUIStore();

  return (
    <View className="gap-4">
      <ConfirmarIdentidad
        nombre={persona.nombre}
        ficha={{
          numero: persona.documentoNumero,
          nombre: persona.nombre,
          apellidos: persona.apellidos,
        }}
        // Coincide y es la misma persona: la base anota la verificación, por
        // qué camino coincidió, quién y cuándo.
        onCoincide={async (forma) => {
          if (!invitadoUuid) return false;
          const ok = await verificar.mutateAsync({ invitadoUuid, forma });
          if (ok) {
            onVerificado?.();
            onCerrar();
          }
          return ok;
        }}
        // No coincide y la portería lo aprueba igual: la base anota quién y por qué.
        onAprobarAMano={
          invitadoUuid
            ? async (motivo) => {
                await aprobar.mutateAsync({ invitadoUuid, motivo });
                addToast(`${persona.nombre}: aprobado a mano. Quedó anotado que lo aprobaste tú.`, "success");
                onVerificado?.();
                onCerrar();
                return true;
              }
            : undefined
        }
      />
    </View>
  );
}
