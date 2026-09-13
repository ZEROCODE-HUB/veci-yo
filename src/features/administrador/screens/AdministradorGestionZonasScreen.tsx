import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Button, Modal } from "@/shared/components";
import { PageHeader } from "@/shared/layouts";
import { GestionZonasList } from "../components/gestionZonas";
import { useAdministradorGestionZonas } from "../hooks/useAdministradorGestionZonas";

export function AdministradorGestionZonasScreen() {
  const navigation = useNavigation<any>();
  const { data = {}, deleteZona } = useAdministradorGestionZonas();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const zonas = Object.values(data);
  const zonaAEliminar = deleteId ? data[deleteId] : undefined;

  const handleDelete = () => {
    if (!deleteId) return;
    deleteZona(deleteId);
    setDeleteId(null);
  };

  return (
    <View className="flex-1 bg-bg-app">
      <PageHeader title="Gestión de Zonas Comunes" />
      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4 gap-3.5"
      >
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Text className="text-xl font-bold text-gray-900 leading-7">
              Gestión de Zonas Comunes
            </Text>
            <Text className="text-sm text-gray-500 mt-1 leading-5">
              Administra las zonas comunes disponibles para los residentes.
            </Text>
          </View>
          <Button
            size="sm"
            onPress={() => navigation.navigate("GestionZonaForm", { id: undefined })}
          >
            Crear Zona Común
          </Button>
        </View>

        {zonas.length === 0 ? (
          <View className="items-center px-4 py-10">
            <Text className="text-base text-gray-500 text-center">
              No hay zonas comunes configuradas. Crea la primera.
            </Text>
          </View>
        ) : (
          <GestionZonasList
            zonas={zonas}
            onEdit={(id) => navigation.navigate("GestionZonaForm", { id })}
            onDelete={setDeleteId}
          />
        )}
      </ScrollView>

      <Modal
        visible={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Eliminar zona común"
      >
        <View className="gap-4">
          <Text className="text-base text-gray-900 text-center leading-6">
            ¿Deseas eliminar esta zona común?{"\n"}
            <Text className="font-bold">{zonaAEliminar?.nombre}</Text>
          </Text>
          <Text className="text-sm text-gray-500 text-center">
            Esta acción no puede deshacerse.
          </Text>
          <View className="flex-row gap-2.5">
            <View className="flex-1">
              <Button
                variant="secondary"
                fullWidth
                onPress={() => setDeleteId(null)}
              >
                Cancelar
              </Button>
            </View>
            <View className="flex-1">
              <Button variant="danger" fullWidth onPress={handleDelete}>
                Eliminar
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
