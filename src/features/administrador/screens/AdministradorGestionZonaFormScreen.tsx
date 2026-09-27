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
      bloques: (current?.horariosDisponibles || []).map((horario: string) => {
        const [inicio = "08:00", fin = "10:00"] = horario.split("-").map((value) => value.trim());
        return { inicio, fin };
      }),
      cantidadBloques: current?.horariosDisponibles?.length || 2,
    };
  }, [current]);
  return (
    <View className="flex-1 bg-bg-app">
      <PageHeader title={id ? "Editar Zona Común" : "Crear Zona Común"} />
      <GestionZonaForm
        initial={initial}
        isNew={!id}
        onSave={(value) => {
          /*
            No se guarda, y esta a la vista a proposito: el formulario ofrece
            bloques horarios --«usa bloques» mas una lista-- y esto los compone
            para nada, porque las franjas ya no salen de ahi sino de la hora de
            apertura, la de cierre y la duracion maxima (`franjas()`).

            Que el administrador rellene una lista que nadie lee es el punto 45
            de `docs/REVISAR-A-OJO.md`, y la salida --quitar el campo del
            formulario o guardar los bloques de verdad-- es una decision de
            producto. Borrar solo este calculo dejaria el formulario pidiendolos
            igual, sin nada que explicara por que no sirven.
          */
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
