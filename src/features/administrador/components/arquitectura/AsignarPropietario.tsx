import { useState } from "react";
import { Text, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { theme } from "@/config";
import { Button, Input } from "@/shared/components";
import { asignarPropietario } from "@/features/propietario/services/invitacionesUnidad.repo";

/**
 * La administración asigna el propietario de una vivienda, desde la vivienda
 * (Arquitectura).
 *
 * Desde el 30/10/2026 (Para Claude 183) la persona **acepta** la invitación en
 * la app: la ve en Inicio, revisa los datos y acepta los términos; los
 * estacionamientos y depósitos de la vivienda los acepta aparte. Le llega un
 * correo que se lo dice.
 */
const ES_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function AsignarPropietario({
  unidadId,
  propietarioActual,
  onAsignado,
}: {
  unidadId: string;
  /** El nombre del dueño que ya figura, si hay. */
  propietarioActual?: string;
  onAsignado?: () => void;
}) {
  const queryClient = useQueryClient();
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);

  const falta = !nombre.trim()
    ? "Falta el nombre del propietario"
    : !ES_CORREO.test(correo.trim())
      ? "El correo no parece válido"
      : null;

  const asignar = useMutation({
    mutationFn: () => asignarPropietario({ unidadId, nombre, correo }),
    onSuccess: (resultado) => {
      const quien = nombre.trim();
      const conCorreo = correo.trim().toLowerCase();
      setNombre("");
      setCorreo("");
      const queSePaso = resultado.asignado
        ? `${quien} verá la invitación en Inicio la próxima vez que entre a la app; queda propietario cuando la acepte.`
        : `${quien} verá la invitación cuando cree su cuenta en la app con ${conCorreo}; queda propietario cuando la acepte.`;
      setAviso(
        resultado.correoEnviado
          ? `${queSePaso} Le avisamos por correo.`
          : `${queSePaso} No salió el correo (${resultado.motivo}): avísale tú.`,
      );
      void queryClient.invalidateQueries({ queryKey: ["unidad"] });
      void queryClient.invalidateQueries({ queryKey: ["administrador"] });
      void queryClient.invalidateQueries({ queryKey: ["directorio"] });
      onAsignado?.();
    },
    onError: (e) =>
      setAviso((e as { message?: string } | null)?.message ?? "No se pudo asignar el propietario"),
  });

  return (
    <View style={{ gap: 10 }}>
      <Text className="text-base font-bold text-gray-900">Asignar propietario (opcional)</Text>
      {propietarioActual ? (
        <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
          Ya figura {propietarioActual}. Si la vivienda tiene otro dueño, asígnalo aquí.
        </Text>
      ) : null}
      <Input
        label="Nombre y apellido *"
        soloLetras
        value={nombre}
        onChangeText={setNombre}
        placeholder="Ej. Ana Restrepo"
      />
      <Input label="Correo *" type="email" value={correo} onChangeText={setCorreo} placeholder="ana@correo.com" />
      <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
        Tiene que aceptar la invitación en la app, y aparte los estacionamientos y depósitos de
        la vivienda. Le llega un correo para que descargue la app e inicie sesión con este
        correo (o cree su cuenta con él).
      </Text>
      <Button
        variant="primary"
        disabled={Boolean(falta) || asignar.isPending}
        onPress={() => asignar.mutate()}
      >
        {asignar.isPending ? "Asignando…" : "Asignar propietario"}
      </Button>
      {falta && (nombre || correo) ? (
        <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
          {falta}
        </Text>
      ) : null}
      {aviso ? (
        <Text accessibilityRole="alert" className="text-sm text-gray-900">
          {aviso}
        </Text>
      ) : null}
    </View>
  );
}
