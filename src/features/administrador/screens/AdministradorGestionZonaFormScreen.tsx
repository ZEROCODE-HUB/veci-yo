import { useMemo } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { View } from "react-native";
import { PageHeader } from "@/shared/layouts";
import { GestionZonaForm } from "../components/gestionZonas";
import { useAdministradorGestionZonas } from "../hooks/useAdministradorGestionZonas";
import { gestionZonaVacia } from "../types/gestionZona";
import { useCondominioActivo } from "@/shared/hooks";
export function AdministradorGestionZonaFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const id = route.params?.id as string | undefined;
  const condominioId = useCondominioActivo() ?? "";
  const { data: gestionZonas, saveZona, updateZona } =
    useAdministradorGestionZonas();
  const current = id ? gestionZonas[id] : undefined;
  const initial = useMemo(() => {
    const empty = gestionZonaVacia();
    if (!current) return empty;
    return {
      ...empty,
      ...current,
      usaSlots: current?.usaSlots ?? false,
      duracionMaximaMin: current?.duracionMaximaMin ?? 120,
      horariosDisponibles: current?.horariosDisponibles ?? [],
      reglamento: current?.reglamento ?? "",
      requiereAprobacion: current?.requiereAprobacion ?? false,
      bloques: (current?.horariosDisponibles || []).map((horario: string) => {
        const [inicio = "08:00", fin = "10:00"] = horario.split("-").map((value) => value.trim());
        return { inicio, fin };
      }),
      cantidadBloques: current?.horariosDisponibles?.length || 2,
    };
  }, [current, current]);
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
          const datos = {
            nombre: value.nombre,
            tipo: value.tipo,
            descripcion: value.descripcion,
            horarioApertura: value.horarioApertura,
            horarioCierre: value.horarioCierre,
            duracionMinimaMin: Number(value.duracionMinimaMin) || undefined,
            duracionMaximaMin: Number(value.duracionMaximaMin) || undefined,
            tiempoMinimoEntreReservas: Number(value.tiempoMinimoEntreReservas) || 0,
            usaSlots: value.usaSlots,
            requiereAprobacion: value.requiereAprobacion,
            montoGarantia: Number(value.montoGarantia) || 0,
            costoLimpieza: Number(value.costoLimpieza) || 0,
            costoReserva: Number(value.costoReserva) || 0,
            moneda: value.moneda || "COP",
            reglamento: value.reglamento,
            activa: value.activa,
          };
          if (id && id !== "nueva") updateZona(id, datos);
          else saveZona({ condominioId, ...datos });
        }}
        onSuccess={() => navigation.goBack()}
      />
    </View>
  );
}
