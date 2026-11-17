import { theme } from "@/config";
import React from "react";
import { ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button, Cargando, ErrorAlCargar } from "@/shared/components";
import { PageHeader } from "@/shared/layouts";
import { useReglaDetalle } from "../hooks/useReglaDetalle";
import {
  ReglaArchivoCard,
  ReglaCargaModal,
  ReglaContenidoCard,
  ReglaDepartamentoInfo,
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
  /*
    La ventana de subir va fuera del «si hay reglamento»: el primero de un
    edificio también se sube desde aquí (17/11/2026). Antes la pantalla vacía
    solo decía que no había ninguno, y la administración no tenía cómo
    cargarlo --`subirReglamento` ya sabía crear la fila--.
  */
  const cargaModal = (
    <ReglaCargaModal
      visible={regla.uploadOpen}
      titulo={regla.content?.title ?? "Reglamento"}
      elegido={regla.elegido}
      subiendo={regla.subir.isPending}
      onElegir={regla.elegirArchivo}
      onSubir={() => regla.subir.mutate()}
      onClose={regla.cerrarCarga}
    />
  );
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
    </View>
  );
  
  /*
    El reglamento sale ahora de la base, asi que puede no haber ninguno para
    ese condominio. Antes venia de un archivo y siempre existia.
  */
  /*
    Una fila sin archivo y sin texto (la de un edificio nuevo, o la que dejó
    un texto borrado) es lo mismo que no tener reglamento: antes enseñaba la
    palabra «Reglamento» subrayada y nada más (17/11/2026).
  */
  const hayArchivo = Boolean(regla.content?.downloadable);
  const hayTexto = (regla.content?.sections.length ?? 0) > 0;
  if (!regla.content || (!hayArchivo && !hayTexto)) {
    return (
      <View className="flex-1 bg-bg-app">
        <PageHeader title="Reglamento" />
        {regla.cargando ? (
          <Cargando texto="el reglamento" forma="ficha" />
        ) : regla.fallo ? (
          // Una red caída no es un reglamento sin cargar (13/11/2026).
          <ErrorAlCargar texto="el reglamento" reintentar={regla.reintentar} />
        ) : (
          <View className="items-center gap-4 p-6">
            <Text className="text-sm text-center text-gray-500">
              {regla.puedeSubir
                ? "Todavía no has cargado este reglamento. Súbelo (PDF o Word) y lo verán quienes corresponda."
                : "Este condominio todavía no tiene cargado este reglamento."}
            </Text>
            {regla.puedeSubir ? (
              <Button fullWidth onPress={() => regla.setUploadOpen(true)}>
                Subir reglamento
              </Button>
            ) : null}
          </View>
        )}
        {cargaModal}
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg-app">
      <PageHeader title={regla.content.title} />
      <ScrollView className="flex-1" contentContainerClassName="p-4 gap-4">
        {/*
          Con un archivo subido, el reglamento es el archivo: el texto por
          secciones que hubiera (el de ejemplo de cuando se creó el edificio)
          no se enseña al lado, porque «Reemplaza al que esté vigente» dice la
          ventana de subirlo, y dos reglamentos distintos a la vez confunden
          (17/11/2026).
        */}
        {hayArchivo ? (
          <ReglaArchivoCard
            titulo={regla.content.title}
            ruta={regla.content.file}
            nombre={regla.content.fileName}
            subidoEn={regla.content.subidoEn}
            abriendo={regla.descargar.isPending}
            onVer={() => regla.descargar.mutate()}
            puedeReemplazar={regla.puedeSubir}
            onReemplazar={() => regla.setUploadOpen(true)}
          />
        ) : (
          <ReglaContenidoCard content={regla.content} acciones={acciones} />
        )}
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
      {cargaModal}
    </View>
  );
}
