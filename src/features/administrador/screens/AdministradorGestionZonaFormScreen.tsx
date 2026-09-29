import { useMemo } from "react";
import { View } from "react-native";
import { PageHeader } from "@/shared/layouts";
import { GestionZonaForm } from "../components/gestionZonas";
import { useAdministradorGestionZonas } from "../hooks/useAdministradorGestionZonas";
import { gestionZonaVacia } from "../types/gestionZona";
import { useCondominioActivo, useNavegacion, useParametros } from "@/shared/hooks";
export function AdministradorGestionZonaFormScreen() {
  const navigation = useNavegacion();
  const parametros = useParametros("GestionZonaForm");
  const id = parametros?.id as string | undefined;
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
    };
  }, [current]);
  return (
    <View className="flex-1 bg-bg-app">
      <PageHeader title={id ? "Editar Zona Común" : "Crear Zona Común"} />
      <GestionZonaForm
        initial={initial}
        isNew={!id}
        onSave={(value) => {
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
