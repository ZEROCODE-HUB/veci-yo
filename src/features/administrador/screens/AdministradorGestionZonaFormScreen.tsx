import { useMemo } from "react";
import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/shared/layouts";
import { GestionZonaForm } from "../components/gestionZonas";
import { useAdministradorGestionZonas } from "../hooks/useAdministradorGestionZonas";
import { gestionZonaVacia } from "../types/gestionZona";
import { useCondominioActivo, useNavegacion, useParametros } from "@/shared/hooks";
import {
  diasConNumero,
  urlImagenDeZona,
} from "@/features/zonas/services/zonas.repo";

export function AdministradorGestionZonaFormScreen() {
  const navigation = useNavegacion();
  const parametros = useParametros("GestionZonaForm");
  const id = parametros?.id as string | undefined;
  const condominioId = useCondominioActivo() ?? "";
  const { data: gestionZonas, guardarZonaEntera } =
    useAdministradorGestionZonas();
  const current = id ? gestionZonas[id] : undefined;

  /*
    La imagen guardada es una **ruta** en un almacén privado, no una
    dirección: para verla hace falta una URL firmada. Se le pasaba la ruta
    tal cual a la vista previa, así que la foto de una zona no se vio nunca.
  */
  const rutaGuardada = current?.imagen ?? null;
  const { data: imagenFirmada } = useQuery({
    queryKey: ["zonas", "imagen", rutaGuardada],
    queryFn: () => urlImagenDeZona(rutaGuardada ?? ""),
    enabled: Boolean(rutaGuardada),
  });

  const initial = useMemo(() => {
    const empty = gestionZonaVacia();
    if (!current) return empty;
    return {
      ...empty,
      ...current,
      imagen: imagenFirmada ?? null,
      usaSlots: current?.usaSlots ?? false,
      duracionMaximaMin: current?.duracionMaximaMin ?? 120,
      capacidadMaxima: current?.capacidadMaxima ?? 0,
      cuposSimultaneos: current?.cuposSimultaneos ?? 1,
      horariosDisponibles: [],
      reglamento: current?.reglamento ?? "",
      requiereAprobacion: current?.requiereAprobacion ?? false,
      condicionesAprobacion: current?.condicionesAprobacion ?? "",
      icono: current?.emoji ?? "",
    };
  }, [current, imagenFirmada]);

  return (
    <View className="flex-1 bg-bg-app">
      <PageHeader title={id ? "Editar Zona Común" : "Crear Zona Común"} />
      <GestionZonaForm
        initial={initial}
        isNew={!id}
        onSave={async (value) => {
          /*
            Todo lo que el formulario pinta, viaja. Faltaban cuatro cosas: los
            días habilitados, las fechas especiales, la imagen y un campo de
            «horarios disponibles» que no tenía dónde guardarse y se retiró
            (13/10/2026). Antes de eso habían faltado otras cuatro; es la
            cadena de tres eslabones rota en el último, por tercera vez en
            esta pantalla.
          */
          await guardarZonaEntera({
            zonaId: id && id !== "nueva" ? id : undefined,
            zona: {
              condominioId,
              nombre: value.nombre.trim(),
              tipo: value.tipo,
              descripcion: value.descripcion,
              horarioApertura: value.horarioApertura,
              horarioCierre: value.horarioCierre,
              diasHabilitados: diasConNumero(value.diasHabilitados),
              duracionMinimaMin: Number(value.duracionMinimaMin) || undefined,
              duracionMaximaMin: Number(value.duracionMaximaMin) || undefined,
              tiempoMinimoEntreReservas:
                Number(value.tiempoMinimoEntreReservas) || 0,
              capacidadMaxima: Number(value.capacidadMaxima) || null,
              cuposSimultaneos: Number(value.cuposSimultaneos) || 1,
              usaSlots: value.usaSlots,
              requiereAprobacion: value.requiereAprobacion,
              montoGarantia: Number(value.montoGarantia) || 0,
              costoLimpieza: Number(value.costoLimpieza) || 0,
              costoReserva: Number(value.costoReserva) || 0,
              moneda: value.moneda || "COP",
              reglamento: value.reglamento,
              activa: value.activa,
              permiteCorta: value.permiteCorta,
              permiteLarga: value.permiteLarga,
              condicionesAprobacion: value.condicionesAprobacion,
              // La clave del icono elegido. La columna se llama `emoji` por
              // historia: nació para guardar uno y nunca se usó.
              emoji: value.icono || undefined,
            },
            fechas: value.fechasEspeciales,
            // Solo si se eligió una nueva: la que ya estaba llega como la
            // URL firmada de arriba y no hay nada que subir.
            imagenNueva:
              value.imagen && value.imagen !== imagenFirmada
                ? { uri: value.imagen }
                : null,
          });
        }}
        onSuccess={() => navigation.goBack()}
      />
    </View>
  );
}
