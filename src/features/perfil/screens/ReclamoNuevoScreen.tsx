import React, { useState } from "react";
import { ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useReclamoNuevo } from "../hooks/useReclamoNuevo";
import { useReclamos } from "../hooks/useReclamos";
import { useUIStore } from "@/stores";
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

export function ReclamoNuevoScreen({
  route,
}: {
  route?: {
    params?: {
      areaPreseleccionada?: string;
      tituloPreseleccionado?: string;
      descripcionPreseleccionada?: string;
    };
  };
}) {
  const navigation = useNavigation();
  const { crear } = useReclamos();
  const [creado, setCreado] = useState<{
    numero: string;
    area: string;
  } | null>(null);
  const form = useReclamoNuevo({
    area: route?.params?.areaPreseleccionada || "",
    titulo: route?.params?.tituloPreseleccionado || "",
    descripcion: route?.params?.descripcionPreseleccionada || "",
  });
  const area = form.watch("area");
  const addToast = useUIStore((s) => s.addToast);

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
        error instanceof Error ? error.message : "No se pudo elegir el archivo",
        "error",
      );
    }
  };

  // El repositorio ya decide qué campos aplican a cada área; la pantalla no
  // arma el objeto a mano como antes.
  const handleEnviar = form.handleSubmit(async (values) => {
    const resultado = await crear.mutateAsync({ datos: values, adjuntos });
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

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerClassName="p-4 gap-4"
    >
      <ReclamoFormulario
        control={form.control}
        errors={form.formState.errors}
        area={area}
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
