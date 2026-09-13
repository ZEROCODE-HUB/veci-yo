import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheet,
  BottomSheetOption,
  Button,
  Modal,
} from "@/shared/components";
import { PageHeader } from "@/shared/layouts";
import { Coadministrador } from "@/shared/types";
import { useUIStore } from "@/stores";
import { CoadministradorForm } from "../components/coadministradores";
import { useAdministradorCoadministradores } from "../hooks/useAdministradorCoadministradores";
import type { CoadministradorFormValues } from "../types/coadministradores";

const PERMISSIONS = [
  {
    key: "actualizarResidentes",
    label: "Gestionar residentes",
    description:
      "Alta, edición y baja de residentes, inquilinos y propietarios del padrón",
  },
  {
    key: "contestarChat",
    label: "Responder chats",
    description: "Responder y gestionar los chats de residentes y de portería",
  },
  {
    key: "modificarSeguridad",
    label: "Gestionar seguridad",
    description:
      "Crear y editar guardias, porterías, turnos y personal de vigilancia",
  },
  {
    key: "modificarCuadroHonor",
    label: "Administrar cuadro de honor",
    description:
      "Editar ranking, medallas, logros y reconocimientos por departamento",
  },
  {
    key: "visualizarVisitas",
    label: "Consultar visitas",
    description:
      "Acceso de solo lectura a todas las visitas (familiares, profesionales, huéspedes temporales)",
  },
  {
    key: "visualizarCorrespondencia",
    label: "Consultar correspondencia",
    description:
      "Ver toda la paquetería y encomiendas registradas en el edificio",
  },
  {
    key: "visualizarZonasComunes",
    label: "Consultar zonas comunes",
    description:
      "Ver reservas, disponibilidad y ocupación de amenidades (piscina, gimnasio, BBQ, etc.)",
  },
  {
    key: "visualizarEncuestas",
    label: "Consultar encuestas",
    description:
      "Ver encuestas activas, historial y resultados de participación",
  },
] as const;

type PermissionKey = (typeof PERMISSIONS)[number]["key"];
function initials(item: Coadministrador) {
  return `${item.nombre?.[0] || ""}${item.apellido?.[0] || ""}`.toUpperCase();
}

function permissionSummary(item: Coadministrador) {
  if (!item.permisos) return { visible: [], remaining: 0, inherited: true };
  const enabled = PERMISSIONS.filter(({ key }) => item.permisos?.[key]);
  return {
    visible: enabled.slice(0, 4),
    remaining: Math.max(0, enabled.length - 4),
    inherited: false,
  };
}

export function CoadministradoresScreen() {
  const { data: items = [], saveCoadministrador, deleteCoadministrador } = useAdministradorCoadministradores();
  const addToast = useUIStore((state) => state.addToast);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Coadministrador | null>(null);
  const [menuItem, setMenuItem] = useState<Coadministrador | null>(null);
  const [deleteItem, setDeleteItem] = useState<Coadministrador | null>(null);
  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (item: Coadministrador) => {
    setMenuItem(null);
    setEditing(item);
    setFormOpen(true);
  };
  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };
  const save = (formValue: CoadministradorFormValues) => {
    if (!formValue.nombre.trim() || !formValue.correo.trim()) {
      addToast("Nombre y correo son obligatorios", "error");
      return;
    }
    const payload = {
      nombre: formValue.nombre.trim(),
      apellido: formValue.apellido.trim(),
      correo: formValue.correo.trim(),
      email: formValue.correo.trim(),
      celular: formValue.celular.trim(),
      permisos: formValue.permisos,
      unidadId: editing?.unidadId || 0,
      estado: editing?.estado || "pendiente",
      fechaInvitacion:
        editing?.fechaInvitacion || new Date().toLocaleDateString("es-AR"),
    };
    if (editing) {
      saveCoadministrador({ ...editing, ...payload });
      addToast("Coadministrador actualizado", "success");
    } else {
      saveCoadministrador({ ...payload, id: Date.now() });
      addToast("Coadministrador agregado correctamente", "success");
    }
    closeForm();
  };
  const confirmDelete = () => {
    if (!deleteItem) return;
    deleteCoadministrador(deleteItem.id);
    setDeleteItem(null);
    addToast("Coadministrador eliminado", "success");
  };

  return (
    <View className="flex-1 bg-bg-app">
      <PageHeader title="Coadministradores" />
      <ScrollView className="flex-1" contentContainerClassName="p-4 gap-3">
        <View className="rounded-2xl bg-white p-4">
          <Text className="text-sm leading-5 text-gray-500">
            Define qué puede hacer cada coadministrador. Activa solo los
            permisos necesarios para su rol; los permisos de solo lectura no
            permiten editar.
          </Text>
        </View>
        <View className="items-end">
          <Button size="sm" onPress={openCreate}>
            <Ionicons name="add" size={18} color="#111827" />
            <Text className="ml-1 font-semibold text-gray-900">Agregar</Text>
          </Button>
        </View>
        {items.length === 0 ? (
          <View className="items-center rounded-2xl bg-white p-8">
            <Text className="mb-2 text-3xl">👤</Text>
            <Text className="text-sm text-gray-500">
              No hay coadministradores registrados.
            </Text>
          </View>
        ) : (
          items.map((item) => {
            const summary = permissionSummary(item);
            return (
              <View
                key={item.id}
                className="flex-row items-start gap-3 rounded-2xl bg-white p-4"
                style={{
                  elevation: 2,
                  shadowColor: "#000",
                  shadowOpacity: 0.06,
                  shadowRadius: 7,
                  shadowOffset: { width: 0, height: 2 },
                }}
              >
                <View className="h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50">
                  <Text className="text-base font-bold text-blue-700">
                    {initials(item)}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-gray-900">
                    {item.nombre} {item.apellido}
                  </Text>
                  <View className="mt-1 gap-0.5">
                    <Text className="text-xs text-gray-500">
                      📧 {item.correo || item.email}
                    </Text>
                    {item.celular && (
                      <Text className="text-xs text-gray-500">
                        📱 {item.celular}
                      </Text>
                    )}
                  </View>
                  <View className="mt-2 flex-row flex-wrap gap-1">
                    {summary.inherited ? (
                      <Text className="text-[10px] text-gray-400">
                        Todos los permisos (heredado)
                      </Text>
                    ) : (
                      <>
                        {summary.visible.map(({ key, label }) => (
                          <View
                            key={key}
                            className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5"
                          >
                            <Text className="text-[10px] text-gray-500">
                              {label}
                            </Text>
                          </View>
                        ))}
                        {summary.remaining > 0 && (
                          <View className="rounded-full bg-blue-50 px-2 py-0.5">
                            <Text className="text-[10px] text-blue-700">
                              +{summary.remaining} más
                            </Text>
                          </View>
                        )}
                      </>
                    )}
                  </View>
                </View>
                <Pressable
                  onPress={() => setMenuItem(item)}
                  className="h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-gray-50"
                >
                  <Ionicons
                    name="ellipsis-vertical"
                    size={20}
                    color="#374151"
                  />
                </Pressable>
              </View>
            );
          })
        )}
        <View className="h-2" />
      </ScrollView>

      <BottomSheet visible={!!menuItem} onClose={() => setMenuItem(null)}>
        <BottomSheetOption
          label="Editar"
          onPress={() => menuItem && openEdit(menuItem)}
        />
        <BottomSheetOption
          label="Eliminar"
          variant="danger"
          onPress={() => {
            setDeleteItem(menuItem);
            setMenuItem(null);
          }}
        />
      </BottomSheet>

      <Modal
        visible={formOpen}
        onClose={closeForm}
        title={editing ? "Editar coadministrador" : "Agregar coadministrador"}
      >
        <CoadministradorForm editing={editing} onSave={(values) => {
          save(values);
        }} />
      </Modal>

      <Modal
        visible={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        title="Eliminar coadministrador"
      >
        <View className="gap-4 text-center">
          <Text className="text-base text-center text-gray-900">
            ¿Eliminar a{" "}
            <Text className="font-bold">
              {deleteItem?.nombre} {deleteItem?.apellido}
            </Text>
            ?
          </Text>
          <Text className="-mt-2 text-sm text-center text-gray-500">
            Perderá todos los privilegios de administración.
          </Text>
          <Button variant="danger" fullWidth onPress={confirmDelete}>
            Eliminar
          </Button>
          <Button variant="ghost" fullWidth onPress={() => setDeleteItem(null)}>
            Cancelar
          </Button>
        </View>
      </Modal>
    </View>
  );
}
