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
      condicionesAprobacion: current?.condicionesAprobacion ?? "",
      icono: current?.emoji ?? "",
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
            /*
              Estos cuatro **no se mandaban**, aunque el formulario los pinta y
              el repositorio los acepta desde hace días. Es la cadena de tres
              eslabones rota en el último, otra vez: `permiteCorta` y
              `permiteLarga` se arreglaron en `haciaFila` --con su comentario
              diciendo «faltaban, se podían cambiar y no se guardaban nunca»--
              y la pantalla siguió sin pasarlos.

              Salió al conectar la galería de iconos y contar cuántos campos
              del formulario no llegaban al guardado. Eran cuatro.
            */
            permiteCorta: value.permiteCorta,
            permiteLarga: value.permiteLarga,
            condicionesAprobacion: value.condicionesAprobacion,
            // La clave del icono elegido. La columna se llama `emoji` por
            // historia: nació para guardar uno y nunca se usó.
            emoji: value.icono || undefined,
          };
          if (id && id !== "nueva") updateZona(id, datos);
          else saveZona({ condominioId, ...datos });
        }}
        onSuccess={() => navigation.goBack()}
      />
    </View>
  );
}
