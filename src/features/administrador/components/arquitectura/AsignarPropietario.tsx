import { useState } from "react";
import { Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { theme } from "@/config";
import { Button, Input } from "@/shared/components";
import {
  asignarPropietario,
  propietarioPendiente,
} from "@/features/propietario/services/invitacionesUnidad.repo";
import { desdeLaBase, formatDate } from "@/shared/utils";
import { useUIStore } from "@/stores";
import { ElegidoDeLaVivienda } from "./ElegidoDeLaVivienda";

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
  const addToast = useUIStore((s) => s.addToast);
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  /*
    La invitación que espera respuesta, igual que en el detalle (13/11/2026,
    cliente: «al abrir detalles sí sale que se envió una invitación, pero al
    editar no»). La misma consulta, así que se refresca a la vez.
  */
  const pendiente = useQuery({
    queryKey: ["unidad", "detalle", "propietario-pendiente", unidadId],
    queryFn: () => propietarioPendiente(unidadId),
    enabled: Boolean(unidadId),
  });

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
      /*
        Un aviso claro y se cierra la ventana (13/11/2026, tester: «debería salir
        algo que indique que ya se envió la invitación, y cerrar el modal»).
        Antes quedaba un texto suelto al final del formulario, que no se veía.
      */
      addToast(
        resultado.correoEnviado
          ? `Invitación enviada a ${quien}. ${queSePaso}`
          : `Invitación creada para ${quien}, pero no salió el correo (${resultado.motivo}): avísale tú.`,
        resultado.correoEnviado ? "success" : "info",
      );
      void queryClient.invalidateQueries({ queryKey: ["unidad"] });
      void queryClient.invalidateQueries({ queryKey: ["administrador"] });
      void queryClient.invalidateQueries({ queryKey: ["directorio"] });
      onAsignado?.();
    },
    onError: (e) =>
      setAviso((e as { message?: string } | null)?.message ?? "No se pudo asignar el propietario"),
  });

  /*
    Con un dueño ya registrado, lo que se agrega aquí es un copropietario
    (17/11/2026, cliente: «mejora los textos e indicaciones»). El título y la
    ayuda lo dicen, y el dueño que ya figura se ve marcado como los
    estacionamientos.
  */
  const esCopropietario = Boolean(propietarioActual);
  return (
    <View className="rounded-xl border border-gray-200 p-3" style={{ gap: 10 }}>
      <View className="gap-0.5">
        <Text className="text-sm font-bold text-gray-900">
          {esCopropietario ? "Agregar un copropietario (opcional)" : "Propietario (opcional)"}
        </Text>
        <Text className="text-xs text-gray-500">
          {esCopropietario
            ? "Otro dueño de la vivienda. Solo la administración puede agregarlo. Recibe un correo con su invitación para aceptar la vivienda."
            : "El propietario recibe un correo con su invitación para aceptar la vivienda. Queda como propietario cuando la acepta en la app."}
        </Text>
      </View>
      {propietarioActual ? (
        <ElegidoDeLaVivienda texto={propietarioActual} estado="asignado" etiqueta="Propietario" />
      ) : null}
      {pendiente.data ? (
        <View
          className="rounded-xl p-3"
          style={{ backgroundColor: theme.colors.warningSoft, gap: 2 }}
        >
          <Text className="text-sm font-bold text-gray-900">Invitación enviada, sin aceptar todavía</Text>
          <Text className="text-sm text-gray-900">
            {`${pendiente.data.nombre} (${pendiente.data.correo}), el ${formatDate(desdeLaBase(pendiente.data.desde))}. Queda propietario cuando la acepte en la app.`}
          </Text>
        </View>
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
        {esCopropietario
          ? "Le llega un correo para que descargue la app y entre con este correo (o cree su cuenta con él)."
          : "Le llega un correo para que descargue la app y entre con este correo (o cree su cuenta con él). Los estacionamientos y depósitos de arriba van con la invitación, y los acepta aparte."}
      </Text>
      <Button
        variant="primary"
        disabled={Boolean(falta) || asignar.isPending}
        onPress={() => asignar.mutate()}
      >
        {asignar.isPending
          ? "Enviando…"
          : esCopropietario
            ? "Enviar invitación al copropietario"
            : "Enviar invitación al propietario"}
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
