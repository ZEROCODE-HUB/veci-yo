import { theme } from "@/config";
import React, { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Bloque, Button } from "@/shared/components";
import { useNavegacion, usePermisosEnLaVivienda } from "@/shared/hooks";
import { navigateToRoute } from "@/navigation/helpers/navigation.helpers";
import { ahora, formatDate, formatDateInput } from "@/shared/utils";
import { useCorrespondencia } from "@/features/correspondencia/hooks/useCorrespondencia";
import { useZonas } from "@/features/zonas/hooks/useZonas";
import { useVisitas } from "@/features/visitas/hooks/useVisitas";

interface Props {
  /** Vive en la vivienda: su correspondencia y sus zonas comunes le aplican. */
  residente: boolean;
}

/**
 * El resumen de lo **suyo** en el inicio (QA 23/10/2026, responsable de
 * producto): «sus datos, no de sus huéspedes: si tiene correspondencia, si
 * tiene reserva de zona común, o todo lo que aplique». A quien no vive en la
 * vivienda no le aplican la correspondencia ni las zonas comunes, pero sí
 * puede registrar una visita (por ejemplo, un día que el alojamiento está
 * vacío).
 */
export function TuResumen({ residente }: Props) {
  const navigation = useNavegacion();
  const permisos = usePermisosEnLaVivienda();
  /*
    Cada fila espera a su consulta (13/11/2026): antes de que llegaran los
    datos se leía «No tienes correspondencia…», «No tienes reservas…» y «Hoy no
    tienes visitas», que no eran verdad todavía.
  */
  const { items: paquetes, cargando: cargandoPaquetes } = useCorrespondencia();
  const { reservas, cargando: cargandoReservas } = useZonas();
  const { items: visitas, cargando: cargandoVisitas } = useVisitas();

  const hoyIso = formatDateInput(ahora());
  const hoy = formatDate(ahora());

  const enPorteria = residente ? paquetes.filter((p) => p.estado === "En Portería").length : 0;
  const proxima = useMemo(
    () =>
      residente
        ? reservas
            .filter(
              (r) =>
                r.esMia &&
                !["Cancelado", "Rechazado"].includes(r.estado) &&
                String(r.fechaIso ?? "") >= hoyIso,
            )
            .sort((a, b) => String(a.fechaIso ?? "").localeCompare(String(b.fechaIso ?? "")))[0]
        : undefined,
    [residente, reservas, hoyIso],
  );
  // Sus visitas de hoy: las de su vivienda que no son estancias de huésped.
  const visitasDeHoy = visitas.filter(
    (v) => v.tipo !== "huesped-temporal" && v.fechaDesde === hoy && v.estado !== "Cancelado",
  ).length;

  return (
    <View className="bg-white rounded-xl p-5 gap-1" style={{ boxShadow: theme.shadows.card }}>
      <Text className="text-xl font-bold text-gray-900 mb-1">Tu resumen</Text>

      {residente ? (
        <Fila
          icono="cube-outline"
          texto={
            enPorteria === 0
              ? "No tienes correspondencia en portería"
              : enPorteria === 1
                ? "Tienes 1 paquete en portería"
                : `Tienes ${enPorteria} paquetes en portería`
          }
          onPress={() => navigateToRoute(navigation, "Correspondencia")}
          cargando={cargandoPaquetes}
        />
      ) : null}

      {residente ? (
        <Fila
          icono="calendar-outline"
          texto={
            proxima
              ? `Tu próxima reserva: ${proxima.nombre}, ${proxima.fecha ?? ""} ${proxima.horario}`.trim()
              : "No tienes reservas de zonas comunes"
          }
          onPress={() => navigateToRoute(navigation, "ZonasComunes")}
          cargando={cargandoReservas}
        />
      ) : null}

      <Fila
        icono="people-outline"
        texto={
          visitasDeHoy === 0
            ? "Hoy no tienes visitas"
            : visitasDeHoy === 1
              ? "Hoy tienes 1 visita"
              : `Hoy tienes ${visitasDeHoy} visitas`
        }
        onPress={() => navigateToRoute(navigation, "Visitas")}
        cargando={cargandoVisitas}
      />

      {/* Si su rol puede registrar visitas (huecos 9 y 14: lo decide el panel). */}
      {permisos.puede("registrar_visitas") ? (
        <View className="mt-2">
          <Button variant="secondary" fullWidth onPress={() => navigateToRoute(navigation, "VisitasNuevo")}>
            Registrar una visita
          </Button>
        </View>
      ) : null}
    </View>
  );
}

function Fila({
  icono,
  texto,
  onPress,
  cargando = false,
}: {
  icono: React.ComponentProps<typeof Ionicons>["name"];
  texto: string;
  onPress: () => void;
  /** Mientras llega el dato, un bloque gris en vez de un «no tienes…» falso. */
  cargando?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={cargando ? "Cargando" : texto}
      aria-busy={cargando}
      className="flex-row items-center gap-3 py-3"
      style={{ borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight }}
    >
      <Ionicons name={icono} size={20} color={theme.colors.primary} />
      {cargando ? (
        <View className="flex-1">
          <Bloque ancho="70%" alto={14} />
        </View>
      ) : (
        <Text className="flex-1 text-sm text-gray-900">{texto}</Text>
      )}
      <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
    </Pressable>
  );
}
