import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Button, Modal } from "@/shared/components";
import { PageHeader } from "@/shared/layouts";
import { useUIStore } from "@/stores/ui-store";
import { ZonaComunFormModal, ZonasComunesAdminList } from "../components/zonas";
import { useAdministradorZonas } from "../hooks";
import { zonaToForm, type ZonaComunFormValues } from "../types/zonas";
import type { ZonaComunConfig } from "@/stores/zonas-store";

export function AdministradorZonasScreen() {
  const { data, saveZona, deleteZona } = useAdministradorZonas();
  const addToast = useUIStore((state) => state.addToast);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ZonaComunConfig | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const initial = useMemo(() => zonaToForm(editing), [editing]);

  const handleSave = (values: ZonaComunFormValues) => {
    if (!values.nombre) {
      addToast("El nombre del area es obligatorio", "error");
      return;
    }
    const horarios = values.horariosDisponibles
      .split(",")
      .map((horario) => horario.trim())
      .filter(Boolean);
    saveZona.mutate({
      id: editing ? values.id : values.id || `zona-${Date.now()}`,
      emoji: values.emoji || editing?.emoji || "🏠",
      nombre: values.nombre,
      descripcion: values.descripcion,
      reglas: values.reglas,
      capacidadMaxima: Number(values.capacidadMaxima) || 10,
      requiereAprobacion: values.requiereAprobacion,
      horariosDisponibles:
        horarios.length > 0
          ? horarios
          : [
              "08:00 - 10:00",
              "10:00 - 12:00",
              "12:00 - 14:00",
              "14:00 - 16:00",
            ],
      duracionPermitida: Number(values.duracionPermitida) || 2,
    });
    addToast(
      editing ? "Area actualizada exitosamente" : "Area creada exitosamente",
      "success",
    );
    setFormOpen(false);
    setEditing(null);
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteZona.mutate(deleteId);
    setDeleteId(null);
    addToast("Area eliminada", "success");
  };

  return (
    <View className="flex-1 bg-bg-app">
      <PageHeader title="Gestion de Zonas Comunes" />
      <ScrollView className="flex-1" contentContainerClassName="p-4 gap-3">
        <ZonasComunesAdminList
          items={Object.values(data)}
          onEdit={(item) => {
            setEditing(item);
            setFormOpen(true);
          }}
          onDelete={setDeleteId}
        />
      </ScrollView>
      <ZonaComunFormModal
        visible={formOpen}
        editing={!!editing}
        initial={initial}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSave={handleSave}
      />
      <Modal
        visible={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Eliminar Area"
      >
        <View className="gap-4 items-center">
          <Text className="text-base text-gray-900 text-center">
            ¿Seguro que desea eliminar esta area comun?
          </Text>
          <Button fullWidth onPress={handleDelete}>
            Eliminar
          </Button>
        </View>
      </Modal>
    </View>
  );
}
