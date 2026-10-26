import React from "react";
import { View } from "react-native";
import type { Invitado } from "@/shared/types";
import { ConfirmarIdentidad } from "./ConfirmarIdentidad";
import { useFotosDelDocumento } from "../hooks/useFotosDelDocumento";
import { useMarcaDeAgua } from "../hooks/useMarcaDeAgua";
import { useAprobarAMano } from "../hooks/useAprobarAMano";
import { useUIStore } from "@/stores";

interface Props {
  persona: Invitado;
  onVerificar: (numero: string) => Promise<boolean>;
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
 */
export function EntradaDelHuesped({ persona, onVerificar, onCerrar }: Props) {
  const fotos = useFotosDelDocumento(persona.documentos);

  const marcaDeAgua = useMarcaDeAgua("Portería");
  const aprobar = useAprobarAMano();
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
        // Lo leído coincide: la base anota la verificación con el número
        // registrado, y deja constancia de quién y cuándo.
        onCoincide={async () => {
          if (!persona.documentoNumero) return false;
          const ok = await onVerificar(persona.documentoNumero);
          if (ok) onCerrar();
          return ok;
        }}
        // No coincide y la portería lo aprueba igual: la base anota quién.
        onAprobarAMano={
          invitadoUuid
            ? async () => {
                await aprobar.mutateAsync({ invitadoUuid });
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
