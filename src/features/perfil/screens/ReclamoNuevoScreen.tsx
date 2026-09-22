import React, { useState } from "react";
import { ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useReclamoNuevo } from "../hooks/useReclamoNuevo";
import { useReclamos } from "../hooks/useReclamos";
import { ReclamoExitoModal, ReclamoFormulario } from "../components/reclamos";

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

  // El repositorio ya decide qué campos aplican a cada área; la pantalla no
  // arma el objeto a mano como antes.
  const handleEnviar = form.handleSubmit(async (values) => {
    setCreado(await crear.mutateAsync(values));
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
      />
      <ReclamoExitoModal creado={creado} onClose={cerrarExito} />
    </ScrollView>
  );
}
