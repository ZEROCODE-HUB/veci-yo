import { useState } from "react";
import { Text, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { theme } from "@/config";
import { Button, Input } from "@/shared/components";
import { useCondominioActivo } from "@/shared/hooks";
import { invitarAUnidad } from "@/features/propietario/services/invitacionesUnidad.repo";

/**
 * La administración invita al propietario de una vivienda (15/10/2026).
 *
 * El KT (4.3) decide que al dueño lo registra la administración, y la base ya
 * se lo permitía solo a ella. Pero no había pantalla: «Invitar a alguien»
 * trabaja sobre la vivienda propia de quien la usa, así que la administración
 * solo podía invitar al dueño de su propio piso. Aquí elige la vivienda en el
 * directorio y lo invita desde su ficha.
 */
const ES_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function InvitarPropietario({
  unidadId,
  propietarioActual,
}: {
  unidadId: string;
  /** El nombre del dueño que ya figura, si hay. */
  propietarioActual?: string;
}) {
  const condominioId = useCondominioActivo() ?? "";
  const queryClient = useQueryClient();
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [enlace, setEnlace] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const falta = !nombre.trim()
    ? "Falta el nombre del propietario"
    : !ES_CORREO.test(correo.trim())
      ? "El correo no parece válido"
      : null;

  const invitar = useMutation({
    mutationFn: () =>
      invitarAUnidad({
        condominioId,
        unidadId,
        rol: "propietario",
        nombre: nombre.trim(),
        correo: correo.trim().toLowerCase(),
      }),
    onSuccess: (resultado) => {
      setNombre("");
      setCorreo("");
      setEnlace(resultado.correoEnviado ? null : resultado.enlace);
      setAviso(
        resultado.correoEnviado
          ? "Invitación enviada por correo."
          : "Invitación creada. Copia el enlace y pásaselo: es de un solo uso y solo sirve para su correo.",
      );
      queryClient.invalidateQueries({ queryKey: ["unidad", "invitaciones"] });
    },
    onError: (e) => {
      setEnlace(null);
      // El error de Supabase es un objeto plano, no un `Error`: se lee su
      // `message` igual, para que llegue el motivo que da la base.
      setAviso(
        (e as { message?: string } | null)?.message ??
          "No se pudo crear la invitación",
      );
    },
  });

  return (
    <View style={{ gap: 10 }}>
      <Text className="text-base font-bold text-gray-900">
        Invitar propietario
      </Text>
      {propietarioActual ? (
        <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
          Ya figura {propietarioActual}. Si la vivienda tiene otro dueño,
          invítalo aquí.
        </Text>
      ) : null}
      <Input
        label="Nombre y apellido"
        value={nombre}
        onChangeText={setNombre}
        placeholder="Ej. Ana Restrepo"
      />
      <Input
        label="Correo"
        type="email"
        value={correo}
        onChangeText={setCorreo}
        placeholder="ana@correo.com"
      />
      <Button
        variant="primary"
        disabled={Boolean(falta) || invitar.isPending || !condominioId}
        onPress={() => invitar.mutate()}
      >
        {invitar.isPending ? "Invitando…" : "Invitar propietario"}
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
      {enlace ? (
        <Text selectable className="text-xs text-gray-900">
          {enlace}
        </Text>
      ) : null}
    </View>
  );
}
