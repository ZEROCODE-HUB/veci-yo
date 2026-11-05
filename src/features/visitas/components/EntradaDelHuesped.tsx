import React from "react";
import { View } from "react-native";
import type { Invitado } from "@/shared/types";
import { ConfirmarIdentidad } from "./ConfirmarIdentidad";
import { useFotosDelDocumento } from "../hooks/useFotosDelDocumento";
import { useMarcaDeAgua } from "../hooks/useMarcaDeAgua";
import { useAprobarAMano, useVerificarPorEscaneo } from "../hooks/useAprobarAMano";
import { useUIStore } from "@/stores";

interface Props {
  persona: Invitado;
  onCerrar: () => void;
}

/**
 * El registro de entrada de un huésped en portería: primero es la misma
 * persona (con la foto del preregistro marcada con el nombre del guardia),
 * luego el documento físico, cuyo texto lee el celular y compara con lo
 * registrado (23/10/2026). Si no se puede leer o no coincide, se vuelve a
 * escanear o se aprueba a mano, quedando quién (26/10/2026; el número tecleado
 * a mano lo quitó el cliente ese día).
 *
 * Es la única puerta para verificar a un huésped: la tarjeta de la estancia y
 * «Ver detalles» llevan aquí las dos.
 *
 * 05/11/2026: la verificación dice por qué camino coincidió (código de barras,
 * MRZ, número o nombre) y ya no necesita el número registrado: un huésped que
 * coincide por nombre y no escribió su número también queda validado.
 */
export function EntradaDelHuesped({ persona, onCerrar }: Props) {
  const fotos = useFotosDelDocumento(persona.documentos);

  const marcaDeAgua = useMarcaDeAgua("Portería");
  const aprobar = useAprobarAMano();
  const verificar = useVerificarPorEscaneo();
  const invitadoUuid = persona.uuid;
  const { addToast } = useUIStore();

  return (
    <View className="gap-4">
      <ConfirmarIdentidad
        nombre={persona.nombre}
        fotosGuardadas={fotos.data ?? []}
        cargando={fotos.isLoading}
        marcaDeAgua={marcaDeAgua}
        ficha={{
          numero: persona.documentoNumero,
          nombre: persona.nombre,
          apellidos: persona.apellidos,
        }}
        // Lo leído coincide: la base anota la verificación, por qué camino
        // coincidió, quién y cuándo.
        onCoincide={async (forma) => {
          if (!invitadoUuid) return false;
          const ok = await verificar.mutateAsync({ invitadoUuid, forma });
          if (ok) onCerrar();
          return ok;
        }}
        // No coincide y la portería lo aprueba igual: la base anota quién y por qué.
        onAprobarAMano={
          invitadoUuid
            ? async (motivo) => {
                await aprobar.mutateAsync({ invitadoUuid, motivo });
                addToast(`${persona.nombre}: aprobado a mano. Quedó anotado que lo aprobaste tú.`, "success");
                onCerrar();
                return true;
              }
            : undefined
        }
      />
    </View>
  );
}
