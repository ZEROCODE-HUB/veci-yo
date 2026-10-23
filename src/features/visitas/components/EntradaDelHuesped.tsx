import React, { useMemo, useState } from "react";
import { View } from "react-native";
import type { Invitado } from "@/shared/types";
import { useAuthStore } from "@/stores";
import { formatDateTime } from "@/shared/utils";
import { ConfirmarIdentidad } from "./ConfirmarIdentidad";
import { VerificarEnPorteria } from "./VerificarEnPorteria";
import { useFotosDelDocumento } from "../hooks/useFotosDelDocumento";

interface Props {
  persona: Invitado;
  onVerificar: (numero: string) => Promise<boolean>;
  onCerrar: () => void;
}

/**
 * El registro de entrada de un huésped en portería: primero es la misma
 * persona (con la foto del preregistro marcada con el nombre del guardia),
 * luego el documento físico, cuyo texto lee el celular y compara con lo
 * registrado (23/10/2026). Si no se puede leer o no coincide, el número a mano,
 * que compara la base.
 *
 * Es la única puerta para verificar a un huésped: la tarjeta de la estancia y
 * «Ver detalles» llevan aquí las dos.
 */
export function EntradaDelHuesped({ persona, onVerificar, onCerrar }: Props) {
  const fotos = useFotosDelDocumento(persona.documentos);
  const usuario = useAuthStore((s) => s.usuario);
  const [aMano, setAMano] = useState(false);

  const marcaDeAgua = useMemo(() => {
    const guardia = [usuario?.nombre, usuario?.apellido].filter(Boolean).join(" ") || "Portería";
    return `${guardia} · Portería · ${formatDateTime(new Date())}`;
  }, [usuario?.nombre, usuario?.apellido]);

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
        onAMano={() => setAMano(true)}
      />
      {aMano ? (
        <VerificarEnPorteria
          nombre={persona.nombre}
          tieneDocumento={Boolean(persona.documentoNumero)}
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
