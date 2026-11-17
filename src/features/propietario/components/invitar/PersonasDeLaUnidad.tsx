import { theme } from "@/config";
import { Pressable, Text, View } from "react-native";
import { ahora, formatDateInput, formatDateIso } from "@/shared/utils";
import { Badge } from "@/shared/components";
import { ETIQUETA_ROL } from "../../hooks/useInvitarAUnidad";
import type { PersonaDeLaUnidad } from "../../services/invitacionesUnidad.repo";

const etiquetaRol = (rol: string) =>
  ETIQUETA_ROL[rol as keyof typeof ETIQUETA_ROL] ?? rol;

const detalle = (persona: PersonaDeLaUnidad, hoy: string) => {
  // Un menor figura en la vivienda pero no tiene cuenta. Decirlo evita que
  // alguien se pregunte por que no le llego ninguna invitacion.
  const rol = persona.esMenor
    ? `${etiquetaRol(persona.rol)} · menor de edad`
    : etiquetaRol(persona.rol);
  if (!persona.vigenteHasta) return rol;
  if (persona.vigenteHasta < hoy)
    return `${rol} · se fue el ${formatDateIso(persona.vigenteHasta)}`;
  if (persona.vigenteDesde && persona.vigenteDesde > hoy)
    return `${rol} · llega el ${formatDateIso(persona.vigenteDesde)}`;
  return `${rol} · hasta el ${formatDateIso(persona.vigenteHasta)}`;
};

/**
 * Quién está en la vivienda. Solo lectura: aquí no se echa a nadie.
 *
 * Las estancias terminadas se separan en vez de listarse bajo "En la
 * vivienda", donde daban a entender que esa persona sigue ahí. Tampoco se
 * ocultan: al anfitrión le sirve saber quién pasó por su casa.
 */
export function PersonasDeLaUnidad({
  personas,
  onDarAcceso,
}: {
  personas: PersonaDeLaUnidad[];
  /**
   * «Darle acceso a la app» a quien vive aquí sin ella (17/11/2026). A un
   * menor no: la base no le deja tener cuenta.
   */
  onDarAcceso?: (persona: PersonaDeLaUnidad) => void;
}) {
  const hoy = formatDateInput(ahora());
  const presentes = personas.filter(
    (p) => !p.vigenteHasta || p.vigenteHasta >= hoy,
  );
  const pasadas = personas.filter(
    (p) => p.vigenteHasta && p.vigenteHasta < hoy,
  );

  const fila = (persona: PersonaDeLaUnidad, apagada = false) => (
    <View
      key={persona.id}
      className="flex-row justify-between items-center rounded-xl p-3"
      style={{ backgroundColor: theme.colors.bgMuted, opacity: apagada ? 0.6 : 1 }}
    >
      <View className="flex-1 pr-2">
        <Text className="text-sm font-bold text-gray-900">
          {persona.nombre || "Sin nombre"}
        </Text>
        <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
          {detalle(persona, hoy)}
        </Text>
      </View>
      <View className="items-end gap-1">
        {persona.sinApp ? <Badge status="Sin app" /> : null}
        {persona.sinApp && !persona.esMenor && onDarAcceso ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Darle acceso a la app a ${persona.nombre}`}
            onPress={() => onDarAcceso(persona)}
            hitSlop={8}
          >
            <Text className="text-xs font-semibold" style={{ color: theme.colors.primary }}>
              Darle acceso a la app
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  return (
    <View className="gap-4">
      <View className="gap-2">
        <Text className="text-base font-bold text-gray-900">
          En la vivienda
        </Text>
        {presentes.length === 0 ? (
          <Text
            className="text-sm"
            style={{ color: theme.colors.textSecondary }}
          >
            Todavía no hay nadie dado de alta.
          </Text>
        ) : (
          presentes.map((persona) => fila(persona))
        )}
      </View>

      {pasadas.length > 0 && (
        <View className="gap-2">
          <Text className="text-base font-bold text-gray-900">
            Estancias terminadas
          </Text>
          {pasadas.map((persona) => fila(persona, true))}
        </View>
      )}
    </View>
  );
}
