/**
 * NO ESTA EN USO.
 *
 * Dar de alta un servicio contratado de la vivienda --luz, agua, internet--.
 * La pantalla esta entera y bien hecha: formulario, validacion con zod y su
 * hook. Lo que no existe es **donde guardarlo**: no hay tabla, ni politica, ni
 * nadie que lo consulte, y por eso `usePropietarioServicio` acaba llamando a
 * `simularAgregarServicio`, que espera 180 ms y devuelve lo que le diste.
 *
 * Hasta el 01/10/2026 estaba registrada **solo** en `navigation/stacks/
 * PropietarioStack.tsx`, un stack que no montaba nadie: sus otras cinco
 * pantallas estan en `sharedScreens` y son alcanzables, esta no. O sea que ya
 * era inalcanzable, y lo tapaba un archivo muerto.
 *
 * No se borra porque **no es basura: es trabajo terminado sin conectar**. El
 * KT lista «agregar servicio» entre lo que hace el propietario. El dia que se
 * decida donde se guarda, esto se conecta registrandola en `sharedScreens` y
 * cambiando el simulacro por un repositorio de verdad.
 *
 * Esta en `REVISAR-A-OJO.md` y en `scripts/servicios-que-fingen.baseline.json`.
 */
import React from "react";
import { ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useUIStore } from "@/stores";
import { usePropietarioServicio } from "../hooks/usePropietarioServicio";
import { PropietarioServicioForm } from "../components/servicios";

export function PropietarioAgregarServicioScreen() {
  const navigation = useNavigation();
  const { addToast } = useUIStore();
  const form = usePropietarioServicio();
  const handleAgregar = form.handleSubmit(async (values) => {
    await form.agregar.mutateAsync(values);
    addToast("Servicio agregado correctamente", "success");
    navigation.goBack();
  });
  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerClassName="p-4 gap-3"
    >
      <PropietarioServicioForm
        control={form.control}
        errors={form.formState.errors}
        onSubmit={handleAgregar}
      />
    </ScrollView>
  );
}
