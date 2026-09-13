import { useMemo } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { View } from "react-native";
import { PageHeader } from "@/shared/layouts";
import { useZonasStore } from "@/stores";
import { GestionZonaForm } from "../components/gestionZonas";
import { useAdministradorGestionZonas } from "../hooks/useAdministradorGestionZonas";
import { gestionZonaVacia } from "../types/gestionZona";
export function AdministradorGestionZonaFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const id = route.params?.id as string | undefined;
  const current = useZonasStore((state) =>
    id ? state.gestionZonas[id] : undefined,
  );
  const currentConfig = useZonasStore((state) =>
    id ? state.zonasComunesConfig[id] : undefined,
  );
  const { saveZona } = useAdministradorGestionZonas();
  const initial = useMemo(() => {
    const empty = gestionZonaVacia();
    if (!current) return empty;
    return {
      ...empty,
      ...current,
      usaSlots: currentConfig?.usaSlots ?? current.usaSlots ?? false,
      duracionPermitida: currentConfig?.duracionPermitida ?? current.duracionPermitida ?? 2,
      horariosDisponibles: currentConfig?.horariosDisponibles ?? current.horariosDisponibles ?? [],
      reglamento: currentConfig?.reglas ?? current.reglamento ?? "",
      requiereAprobacion: currentConfig?.requiereAprobacion ?? current.requiereAprobacion ?? false,
      bloques: (currentConfig?.horariosDisponibles || []).map((horario) => {
        const [inicio = "08:00", fin = "10:00"] = horario.split("-").map((value) => value.trim());
        return { inicio, fin };
      }),
      cantidadBloques: currentConfig?.horariosDisponibles?.length || 2,
    };
  }, [current, currentConfig]);
  return (
    <View className="flex-1 bg-bg-app">
      <PageHeader title={id ? "Editar Zona Común" : "Crear Zona Común"} />
      <GestionZonaForm
        initial={initial}
        isNew={!id}
        onSave={(value) => {
          const horariosDisponibles = value.usaSlots
            ? value.bloques.slice(0, value.cantidadBloques).map((bloque) => `${bloque.inicio} - ${bloque.fin}`)
            : value.horariosDisponibles;
          saveZona({
            zona: { ...value, horariosDisponibles },
            zonaConfig: {
              usaSlots: value.usaSlots,
              duracionPermitida: value.duracionPermitida,
              horariosDisponibles,
              reglas: value.reglamento,
              requiereAprobacion: value.requiereAprobacion,
            },
          });
        }}
        onSuccess={() => navigation.goBack()}
      />
    </View>
  );
}
