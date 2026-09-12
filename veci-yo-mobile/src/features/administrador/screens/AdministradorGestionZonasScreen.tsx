import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Button, Modal } from "@/shared/components";
import { PageHeader } from "@/shared/layouts";
import { GestionZonasList } from "../components/gestionZonas";
import { useAdministradorGestionZonas } from "../hooks/useAdministradorGestionZonas";
export function AdministradorGestionZonasScreen() {
  const navigation = useNavigation<any>(); const { data = {}, deleteZona } = useAdministradorGestionZonas(); const [deleteId, setDeleteId] = useState<string | null>(null);
  return <View className="flex-1 bg-bg-app"><PageHeader title="Gestion de Zonas Comunes" /><ScrollView className="flex-1" contentContainerClassName="p-4 gap-4"><View><Text className="text-xl font-bold text-gray-900">Gestion de Zonas Comunes</Text><Text className="text-sm text-gray-500 mt-1">Administra las zonas comunes disponibles para los residentes.</Text></View><Button fullWidth onPress={() => navigation.navigate("GestionZonaForm", { id: undefined })}>Crear zona comun</Button><GestionZonasList zonas={Object.values(data)} onEdit={(id) => navigation.navigate("GestionZonaForm", { id })} onDelete={setDeleteId} /></ScrollView><Modal visible={!!deleteId} onClose={() => setDeleteId(null)} title="Eliminar zona comun"><View className="gap-4"><Text className="text-sm text-gray-600 text-center">Esta accion no se puede deshacer.</Text><Button variant="danger" fullWidth onPress={() => { if (deleteId) deleteZona(deleteId); setDeleteId(null); }}>Eliminar</Button></View></Modal></View>;
}
