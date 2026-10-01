import { theme } from "@/config";
import React from "react";
import { ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/shared/components";
import { PageHeader } from "@/shared/layouts";
import { useReglaDetalle } from "../hooks/useReglaDetalle";
import {
  ReglaCargaModal,
  ReglaContenidoCard,
  ReglaDepartamentoInfo,
  ReglaDescargaModal,
} from "../components/detalle";
import { useNavegacion, useParametros } from "@/shared/hooks";

export function ReglaDetalleScreen() {
  const navigation = useNavegacion();
  /*
    Los parametros se piden, no se reciben como prop: era la unica pantalla que
    los tomaba por `route`, y su tipo estaba escrito a mano --`{ tipo?: string }`--
    en paralelo al `ParamList`, que dice `{ tipo: string }`. Dos declaraciones
    del mismo dato es la forma en que se desincronizan.
  */
  const { tipo } = useParametros("ReglaDetalle");
  const regla = useReglaDetalle(tipo);
  const acciones = (
    <View className="flex-row justify-end gap-2">
      {/* Subirlo es de la administración, como dicen la política de la tabla
          y la del bucket. Se ofrecía a todo el que no fuera huésped temporal,
          o sea a cualquier residente, y no funcionaba para nadie. */}
      {regla.puedeSubir && (
        <Button
          size="sm"
          variant="secondary"
          onPress={() => regla.setUploadOpen(true)}
        >
          <Ionicons name="share-outline" size={16} color={theme.colors.textStrong} />
        </Button>
      )}
      {regla.content?.downloadable && (
        <Button
          size="sm"
          variant="secondary"
          onPress={() => regla.setDownloadOpen(true)}
        >
          <Ionicons name="download-outline" size={16} color={theme.colors.textStrong} />
        </Button>
      )}
    </View>
  );
  
  /*
    El reglamento sale ahora de la base, asi que puede no haber ninguno para
    ese condominio. Antes venia de un archivo y siempre existia.
  */
  if (!regla.content) {
    return (
      <View className="flex-1 bg-bg-app">
        <PageHeader title="Reglamento" />
        <View className="items-center p-6">
          <Text className="text-sm text-center text-gray-500">
            {regla.cargando
              ? "Buscando el reglamento…"
              : "Este condominio todavía no tiene cargado este reglamento."}
          </Text>
        </View>
      </View>
    );
  }

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
        titulo={regla.content.title}
        elegido={regla.elegido}
        subiendo={regla.subir.isPending}
        onElegir={regla.elegirArchivo}
        onSubir={() => regla.subir.mutate()}
        onClose={regla.cerrarCarga}
      />
      <ReglaDescargaModal
        visible={regla.downloadOpen}
        file={regla.content.file}
        abriendo={regla.descargar.isPending}
        onAbrir={() => regla.descargar.mutate()}
        onClose={() => regla.setDownloadOpen(false)}
      />
    </View>
  );
}
