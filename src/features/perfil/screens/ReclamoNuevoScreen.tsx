import React, { useState } from "react";
import { ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useReclamoNuevo } from "../hooks/useReclamoNuevo";
import { useReclamos } from "../hooks/useReclamos";
import { useUIStore } from "@/stores";
import { useUnidadesDisponibles } from "@/shared/hooks";
import { Cargando } from "@/shared/components";
import {
  type ArchivoElegido,
} from "@/shared/services/archivos";
import {
  elegirDocumento,
  elegirImagen,
} from "@/shared/services/elegir-archivo";
import {
  ReclamoAdjuntosNuevos,
  ReclamoExitoModal,
  ReclamoFormulario,
} from "../components/reclamos";
import { mensajeDeError } from "@/shared/utils/error.util";
import { AREAS } from "../services/pqrs.repo";

/** Una PQRS contra una vivienda es del condominio. Es la etiqueta, como el formulario. */
const AREA_DEL_CONDOMINIO = AREAS.condominio;

export function ReclamoNuevoScreen({
  route,
}: {
  route?: {
    params?: {
      areaPreseleccionada?: string;
      tituloPreseleccionado?: string;
      descripcionPreseleccionada?: string;
      unidadDenunciadaId?: string;
      visitaId?: string;
    };
  };
}) {
  const navigation = useNavigation();
  const { crear } = useReclamos();
  const [creado, setCreado] = useState<{
    numero: string;
    area: string;
  } | null>(null);
  /*
    Desde una reserva o eligiendo departamento (16/10/2026): la PQRS va
    «contra» esa vivienda y, si viene de una reserva, queda atada a ella.
  */
  const unidadDenunciadaId = route?.params?.unidadDenunciadaId;
  const visitaId = route?.params?.visitaId;
  const form = useReclamoNuevo({
    area:
      route?.params?.areaPreseleccionada ||
      (unidadDenunciadaId ? AREA_DEL_CONDOMINIO : ""),
    unidadDenunciada: unidadDenunciadaId,
    titulo: route?.params?.tituloPreseleccionado || "",
    descripcion: route?.params?.descripcionPreseleccionada || "",
  });
  const area = form.watch("area");
  const addToast = useUIStore((s) => s.addToast);

  /*
    Las viviendas del edificio, para poder señalar una en una queja de
    convivencia. Se arman aqui --y no en el formulario-- porque el formulario no
    sabe pedir datos: recibe lo que tiene que pintar.
  */
  const { unidades } = useUnidadesDisponibles();
  const viviendas = unidades.map((u) => ({
    value: u.unidadId,
    label: `${u.torre} · ${u.codigo}`,
  }));

  /*
    Los archivos se retienen aquí y se suben al crear. La política del bucket
    comprueba que quien sube puede ver el reclamo, así que la fila tiene que
    existir primero; el formulario antes se limitaba a avisar de que se podían
    adjuntar "una vez creada la PQRS", y casi nadie volvía a entrar a hacerlo.
  */
  const [adjuntos, setAdjuntos] = useState<ArchivoElegido[]>([]);

  const agregar = async (elegir: () => Promise<ArchivoElegido | null>) => {
    try {
      const archivo = await elegir();
      if (archivo) setAdjuntos((previos) => [...previos, archivo]);
    } catch (error) {
      addToast(
        mensajeDeError(error, "No se pudo elegir el archivo"),
        "error",
      );
    }
  };

  // El repositorio ya decide qué campos aplican a cada área; la pantalla no
  // arma el objeto a mano como antes.
  const handleEnviar = form.handleSubmit(async (values) => {
    const resultado = await crear.mutateAsync({ datos: values, adjuntos, visitaId });
    if (resultado.adjuntosFallidos > 0) {
      // La PQRS ya está creada y no se deshace por un adjunto: se dice cuántos
      // quedaron fuera y desde el detalle se pueden volver a colgar.
      addToast(
        `La PQRS se creó, pero ${resultado.adjuntosFallidos} adjunto(s) no se pudieron subir.`,
        "error",
      );
    }
    setCreado(resultado);
  });

  const cerrarExito = () => {
    setCreado(null);
    navigation.goBack();
  };

  // Los largos que valida el formulario vienen de la base.
  if (!form.listo) return <Cargando texto="el formulario" />;

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerClassName="p-4 gap-4"
    >
      <ReclamoFormulario
        control={form.control}
        errors={form.formState.errors}
        area={area}
        /*
          Las viviendas del edificio, para poder señalar una. Es la misma lista
          que ya alimenta los selectores de torre y departamento en el resto de
          la aplicacion: no hay una segunda fuente.
        */
        viviendas={viviendas}
        onAreaChange={() => form.setValue("tipo", "")}
        onSubmit={handleEnviar}
        enviando={crear.isPending}
        adjuntos={
          <ReclamoAdjuntosNuevos
            archivos={adjuntos}
            deshabilitado={crear.isPending}
            onAgregarDocumento={() => agregar(elegirDocumento)}
            onAgregarImagen={() => agregar(elegirImagen)}
            onQuitar={(indice) =>
              setAdjuntos((previos) =>
                previos.filter((_, i) => i !== indice),
              )
            }
          />
        }
      />
      <ReclamoExitoModal creado={creado} onClose={cerrarExito} />
    </ScrollView>
  );
}
