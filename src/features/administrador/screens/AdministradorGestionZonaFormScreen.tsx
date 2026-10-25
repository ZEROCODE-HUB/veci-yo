import { useMemo } from "react";
import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/shared/layouts";
import { Cargando } from "@/shared/components";
import { GestionZonaForm } from "../components/gestionZonas";
import { useAdministradorGestionZonas } from "../hooks/useAdministradorGestionZonas";
import { gestionZonaVacia } from "../types/gestionZona";
import { obtenerCondominio } from "../services/condominio.repo";
import { condominioQueryKey } from "../hooks/useAdministradorUbicacion";
import {
  useCondominioActivo,
  useNavegacion,
  useParametros,
  useParametrosDeLaBase,
} from "@/shared/hooks";
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
    Con qué nace una zona nueva, y qué se pone cuando una guardada no tiene
    duración: lo decide el edificio. Antes eran números distintos para lo
    mismo --240 al crear, 120 al editar una sin valor--.
  */
  const parametrosDeLaBase = useParametrosDeLaBase();

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

  // La moneda del edificio, para proponerla en una zona nueva.
  const { data: datosDelEdificio } = useQuery({
    // La misma clave que Arquitectura: si allí se cambia la moneda, aquí se ve.
    queryKey: [...condominioQueryKey, condominioId],
    queryFn: () => obtenerCondominio(condominioId),
    enabled: Boolean(condominioId),
  });
  const monedaDelEdificio = datosDelEdificio?.moneda ?? null;

  const initial = useMemo(() => {
    if (!parametrosDeLaBase.listo) return null;
    const empty = gestionZonaVacia({
      apertura: parametrosDeLaBase.texto("zona_apertura_por_defecto"),
      cierre: parametrosDeLaBase.texto("zona_cierre_por_defecto"),
      duracionMinimaMin: parametrosDeLaBase.numero(
        "zona_duracion_minima_por_defecto",
      ),
      duracionMaximaMin: parametrosDeLaBase.numero(
        "zona_duracion_maxima_por_defecto",
      ),
      tiempoEntreReservasMin: parametrosDeLaBase.numero(
        "zona_tiempo_entre_reservas_por_defecto",
      ),
      cupos: parametrosDeLaBase.numero("zona_cupos_por_defecto"),
      moneda: monedaDelEdificio ?? "",
    });
    if (!current) return empty;
    return {
      ...empty,
      ...current,
      imagen: imagenFirmada ?? null,
      usaSlots: current?.usaSlots ?? false,
      /*
        Una zona sin duración llega con 0 (ver `mapearGestionZona`), y el 0 no
        pasa el formulario: se ofrece la del edificio, igual que a una nueva.
        El `?? 120` de antes no saltaba nunca, justo por ese 0.
      */
      duracionMinimaMin: current.duracionMinimaMin || empty.duracionMinimaMin,
      duracionMaximaMin: current.duracionMaximaMin || empty.duracionMaximaMin,
      capacidadMaxima: current?.capacidadMaxima ?? 0,
      cuposSimultaneos: current.cuposSimultaneos ?? empty.cuposSimultaneos,
      horariosDisponibles: [],
      reglamento: current?.reglamento ?? "",
      requiereAprobacion: current?.requiereAprobacion ?? false,
      condicionesAprobacion: current?.condicionesAprobacion ?? "",
      icono: current?.emoji ?? "",
    };
  }, [current, imagenFirmada, parametrosDeLaBase, monedaDelEdificio]);

  if (!initial) {
    return (
      <View className="flex-1 bg-bg-app">
        <PageHeader title={id ? "Editar Zona Común" : "Crear Zona Común"} />
        <Cargando texto="el formulario" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg-app">
      <PageHeader title={id ? "Editar Zona Común" : "Crear Zona Común"} />
      <GestionZonaForm
        initial={initial}
        isNew={!id}
        duracionRangoMaximo={parametrosDeLaBase.numero(
          "zona_duracion_rango_maximo",
        )}
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
              // El formulario exige al menos 1: no hace falta respaldo.
              cuposSimultaneos: Number(value.cuposSimultaneos),
              usaSlots: value.usaSlots,
              requiereAprobacion: value.requiereAprobacion,
              montoGarantia: Number(value.montoGarantia) || 0,
              costoLimpieza: Number(value.costoLimpieza) || 0,
              costoReserva: Number(value.costoReserva) || 0,
              // Vacía, la base le pone la del edificio.
              moneda: value.moneda,
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
