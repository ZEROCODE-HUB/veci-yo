import { Text, View } from "react-native";
import { theme } from "@/config";
import type { LimitesDelCondominio } from "../../services/suscripcion.repo";

/**
 * Lo que el edificio impone y lo que solo advierte.
 *
 * Este bloque estaba escrito a mano: decía "el Administrador ha configurado un
 * mínimo de 1 noche(s) y una capacidad máxima de 6 huéspedes" a cualquier
 * propietario de cualquier condominio, y la tabla de límites estaba vacía.
 * También afirmaba "puedes establecer valores más restrictivos, pero no
 * menos", que es justo lo contrario de lo que el KT decide: los límites
 * numéricos se **advierten**, no se imponen (flujo 4.1 paso 5).
 */

interface Props {
  limites: LimitesDelCondominio | null;
  /** Frases ya resueltas por `advertencias()`; vacío si nada se excede. */
  avisos: string[];
}

function Caja({
  fondo,
  color,
  icono,
  children,
}: {
  fondo: string;
  color: string;
  icono: string;
  children: React.ReactNode;
}) {
  return (
    <View
      className="rounded-xl p-3 mb-3.5 flex-row gap-2 items-start"
      style={{ backgroundColor: fondo }}
    >
      <Text style={{ fontSize: 16 }}>{icono}</Text>
      <View className="flex-1">
        <Text className="text-xs" style={{ color, lineHeight: 18 }}>
          {children}
        </Text>
      </View>
    </View>
  );
}

export function LimitesDelEdificio({ limites, avisos }: Props) {
  const sinLimites =
    !limites ||
    (limites.estanciaMinimaNoches === null && limites.capacidadMaxima === null);

  if (sinLimites) {
    return (
      <Caja
        fondo={theme.colors.bgApp}
        color={theme.colors.textSecondary}
        icono="ℹ️"
      >
        El edificio no ha fijado un mínimo de noches ni un aforo máximo para la
        renta corta.
      </Caja>
    );
  }

  const partes: string[] = [];
  if (limites.estanciaMinimaNoches !== null) {
    partes.push(
      `un mínimo de ${limites.estanciaMinimaNoches} ${
        limites.estanciaMinimaNoches === 1 ? "noche" : "noches"
      }`,
    );
  }
  if (limites.capacidadMaxima !== null) {
    partes.push(`un aforo máximo de ${limites.capacidadMaxima} huéspedes`);
  }

  return (
    <>
      <Caja
        fondo={theme.colors.bgApp}
        color={theme.colors.textSecondary}
        icono="ℹ️"
      >
        El edificio recomienda {partes.join(" y ")}.
      </Caja>

      {avisos.length > 0 && (
        <Caja
          fondo={theme.colors.warningSoft}
          color={theme.colors.badgeAmberText}
          icono="⚠️"
        >
          {avisos.join(" ")} Podés continuar: es una advertencia, no un límite.
        </Caja>
      )}
    </>
  );
}
