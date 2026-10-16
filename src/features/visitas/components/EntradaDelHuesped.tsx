import React, { useState } from "react";
import { View } from "react-native";
import type { Invitado } from "@/shared/types";
import { ConfirmarIdentidad } from "./ConfirmarIdentidad";
import { VerificarEnPorteria } from "./VerificarEnPorteria";
import { useFotosDelDocumento } from "../hooks/useFotosDelDocumento";

interface Props {
  persona: Invitado;
  onVerificar: (numero: string) => Promise<boolean>;
  onCerrar: () => void;
}

/**
 * El registro de entrada de un huésped en portería (16/10/2026): primero es la
 * misma persona, luego el mismo documento, y al final el número, que lo
 * compara la base.
 */
export function EntradaDelHuesped({ persona, onVerificar, onCerrar }: Props) {
  const fotos = useFotosDelDocumento(persona.documentos);
  const [confirmado, setConfirmado] = useState(false);

  return (
    <View className="gap-4">
      <ConfirmarIdentidad
        nombre={persona.nombre}
        fotosGuardadas={fotos.data ?? []}
        cargando={fotos.isLoading}
        onConfirmado={() => setConfirmado(true)}
      />
      {confirmado ? (
        <VerificarEnPorteria
          nombre={persona.nombre}
          tieneDocumento
          fotoTomada={Boolean(persona.fotoDePorteria)}
          pedirFoto={false}
          numeroDePaso={3}
          onVerificar={onVerificar}
          onCerrar={onCerrar}
        />
      ) : null}
    </View>
  );
}
