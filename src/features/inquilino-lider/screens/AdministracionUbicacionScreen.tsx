import { View, ScrollView } from "react-native";
import { Button } from "@/shared/components";
import {
  UbicacionCard,
  UbicacionConfirmacionModal,
  UbicacionFormModal,
  UbicacionIntroduccion,
} from "../components/ubicacion";
import { useAdministracionUbicacion } from "../hooks/useAdministracionUbicacion";

export function AdministracionUbicacionScreen() {
  const {
    esIncognito,
    rolActivo,
    ubicaciones,
    formValues,
    showAgregar,
    deleteUbicacion,
    editUbicacion,
    abrirAgregar,
    abrirEditar,
    cerrarAgregar,
    cerrarEditar,
    cerrarEliminar,
    setDeleteUbicacion,
    toggleFavoritoUbicacion,
    confirmarAgregar,
    confirmarEditar,
    confirmarEliminar,
  } = useAdministracionUbicacion();
  const esGuardia = rolActivo === "guardia";

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" contentContainerClassName="p-4 gap-4">
        <UbicacionIntroduccion />

        {ubicaciones.map((ubicacion) => (
          <UbicacionCard
            key={ubicacion.id}
            ubicacion={ubicacion}
            esGuardia={esGuardia}
            onEditar={abrirEditar}
            onEliminar={setDeleteUbicacion}
            onFavorito={toggleFavoritoUbicacion}
          />
        ))}

        {!esIncognito && (
          <Button variant="primary" onPress={abrirAgregar}>
            + Agregar ubicación
          </Button>
        )}
      </ScrollView>

      <UbicacionFormModal
        key={`agregar-${showAgregar}`}
        visible={showAgregar}
        title="Agregar Ubicación"
        submitLabel="Agregar"
        initialValues={formValues}
        onClose={cerrarAgregar}
        onSubmit={confirmarAgregar}
      />

      <UbicacionConfirmacionModal
        visible={!!deleteUbicacion}
        ubicacion={deleteUbicacion}
        esGuardia={esGuardia}
        onClose={cerrarEliminar}
        onConfirm={confirmarEliminar}
      />

      <UbicacionFormModal
        key={`editar-${editUbicacion?.id || "ninguna"}`}
        visible={!!editUbicacion}
        title="Editar Ubicación"
        submitLabel="Guardar cambios"
        initialValues={formValues}
        onClose={cerrarEditar}
        onSubmit={confirmarEditar}
      />
    </View>
  );
}
