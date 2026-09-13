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
      categoriaPreseleccionada?: string;
      tituloPreseleccionado?: string;
      descripcionPreseleccionada?: string;
    };
  };
}) {
  const navigation = useNavigation();
  const { crear } = useReclamos();
  const [creado, setCreado] = useState<{
    numero: string;
    categoria: string;
  } | null>(null);
  const form = useReclamoNuevo({
    categoria: route?.params?.categoriaPreseleccionada || "",
    titulo: route?.params?.tituloPreseleccionado || "",
    descripcion: route?.params?.descripcionPreseleccionada || "",
  });
  const categoria = form.watch("categoria");

  const handleEnviar = form.handleSubmit(async (values) => {
    const { modelo, subcategoria, ...resto } = values;
    const datos = {
      ...resto,
      tipo: subcategoria || values.categoria,
      ...(values.categoria === "Aplicación VeciYo" ? { modelo } : {}),
      ...(["Condominio", "Aplicación VeciYo"].includes(values.categoria)
        ? { subcategoria }
        : {}),
    };
    const nuevo = await crear.mutateAsync(datos);
    setCreado({ numero: nuevo.numero, categoria: nuevo.categoria });
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
        categoria={categoria}
        onCategoriaChange={() => form.setValue("subcategoria", "")}
        onSubmit={handleEnviar}
      />
      <ReclamoExitoModal creado={creado} onClose={cerrarExito} />
    </ScrollView>
  );
}
