import React from "react";
import { ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/shared/components";
import { PageHeader } from "@/shared/layouts";
import { useNavigation } from "@react-navigation/native";
import { useReglaDetalle } from "../hooks/useReglaDetalle";
import {
  ReglaCargaModal,
  ReglaContenidoCard,
  ReglaDepartamentoInfo,
  ReglaDescargaModal,
} from "../components/detalle";

export function ReglaDetalleScreen({
  route,
}: {
  route: { params?: { tipo?: string } };
}) {
  const navigation = useNavigation<any>();
  const regla = useReglaDetalle(route.params?.tipo);
  const acciones = (
    <View className="flex-row justify-end gap-2">
      {!regla.isTemporaryGuest && (
        <Button
          size="sm"
          variant="secondary"
          onPress={() => regla.setUploadOpen(true)}
        >
          <Ionicons name="share-outline" size={16} color="#374151" />
        </Button>
      )}
      {regla.content.downloadable && (
        <Button
          size="sm"
          variant="secondary"
          onPress={() => regla.setDownloadOpen(true)}
        >
          <Ionicons name="download-outline" size={16} color="#374151" />
        </Button>
      )}
    </View>
  );
  
  return (
    <View className="flex-1 bg-bg-app">
      <PageHeader title={regla.content.title} />
      <ScrollView className="flex-1" contentContainerClassName="p-4 gap-4">
        <ReglaContenidoCard content={regla.content} acciones={acciones} />
        <ReglaDepartamentoInfo />
        {!regla.isTemporaryGuest && (
          <Button
            fullWidth
            onPress={() =>
              navigation.navigate("ReclamoNuevo", {
                categoriaPreseleccionada: "Documentos antiguos",
              })
            }
          >
            Solicitar documentos antiguos
          </Button>
        )}
      </ScrollView>
      <ReglaCargaModal
        visible={regla.uploadOpen}
        onClose={() => regla.setUploadOpen(false)}
      />
      <ReglaDescargaModal
        visible={regla.downloadOpen}
        file={regla.content.file}
        onClose={() => regla.setDownloadOpen(false)}
      />
    </View>
  );
}
