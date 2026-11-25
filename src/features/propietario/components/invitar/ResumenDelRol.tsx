import { theme } from "@/config";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useCondominioActivo } from "@/shared/hooks";
import { permisosDeLosRolesDeLaVivienda } from "@/shared/services/permisosDeRol";
import {
  permisosConfigurablesDe,
  resumenDelRol,
  type RolQueSeCrea,
} from "@/shared/services/capacidadesDelRol";

/**
 * «Podrá: … / No podrá: …» del rol que se está creando (17/11/2026, aprobado
 * por el cliente). Sale de `capacidadesDelRol.ts` --la misma lista con la que
 * la app decide qué enseña-- y de los permisos por rol de este edificio, que
 * llegan de la base con la regla que aplica al guardar. No hay textos sueltos
 * por rol: si cambia un permiso en el panel, cambia aquí.
 */
export function ResumenDelRol({ rol }: { rol: RolQueSeCrea | null }) {
  const condominioId = useCondominioActivo() ?? "";
  const permisos = useQuery({
    queryKey: ["permisos-de-rol", "roles-de-la-vivienda", condominioId],
    queryFn: () => permisosDeLosRolesDeLaVivienda(condominioId),
    enabled: Boolean(condominioId),
  });
  const resumen = useMemo(
    () => (rol ? resumenDelRol(rol, permisosConfigurablesDe(permisos.data ?? [])) : null),
    [rol, permisos.data],
  );
  /*
    Plegada (25/11/2026, el cliente: «hazlo sencillo»): eran once líneas que
    empujaban el resto del formulario hacia abajo. Se abre si se quiere ver.
  */
  const [abierta, setAbierta] = useState(false);
  if (!resumen) return null;

  if (!abierta) {
    return (
      <Pressable
        onPress={() => setAbierta(true)}
        accessibilityRole="button"
        accessibilityLabel="Ver qué podrá hacer con este rol"
        className="flex-row items-center gap-1 py-1 active:opacity-70"
      >
        <Ionicons name="information-circle-outline" size={18} color={theme.colors.secondary} />
        <Text className="text-sm font-medium" style={{ color: theme.colors.secondary }}>
          Ver qué podrá hacer
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={() => setAbierta(false)}
      accessibilityRole="button"
      accessibilityLabel="Ocultar qué podrá hacer"
      className="gap-2 rounded-xl p-3"
      style={{ backgroundColor: theme.colors.successSoft }}
    >
      {resumen.podra.length > 0 ? (
        <View className="gap-1">
          <Text className="text-xs font-semibold" style={{ color: theme.colors.success }}>
            Podrá:
          </Text>
          {resumen.podra.map((linea) => (
            <Text key={linea} className="text-xs text-gray-700">
              {`✓ ${linea}`}
            </Text>
          ))}
        </View>
      ) : null}
      {resumen.noPodra.length > 0 ? (
        <View className="gap-1">
          <Text className="text-xs font-semibold" style={{ color: theme.colors.dangerDark }}>
            No podrá:
          </Text>
          {resumen.noPodra.map((linea) => (
            <Text key={linea} className="text-xs text-gray-700">
              {`✗ ${linea}`}
            </Text>
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}
