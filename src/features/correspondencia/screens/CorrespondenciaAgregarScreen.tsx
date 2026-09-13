import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, Image } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as ImagePicker from "expo-image-picker";
import { useAuthStore, useUbicacionStore } from "@/stores";
import {
  Button,
  Input,
  Select,
  Toggle,
  Calendar,
  Modal,
  BottomSheet,
  BottomSheetOption,
  Badge,
} from "@/shared/components";
import { correspondenciaSchema } from "@/features/correspondencia/schemas";
import type { CorrespondenciaFormData } from "@/features/correspondencia/schemas";
import { useCorrespondencia } from "../hooks/useCorrespondencia";
import {
  CATEGORIAS,
  ESTADOS_ENCOMIENDA,
  TORRES,
  PISOS,
  UNIDADES,
} from "@/data";

export function CorrespondenciaAgregarScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const informarItem = route.params?.informar || null;
  const { agregar } = useCorrespondencia();
  const rolActivo = useAuthStore((s) => s.rolActivo);
  const usuario = useAuthStore((s) => s.usuario);
  const ubicaciones = useUbicacionStore((s) => s.ubicaciones);

  const puedeCrear = rolActivo === "guardia" || rolActivo === "administrador";
  const tieneUbicaciones = ubicaciones.length > 0;
  const accesoBloqueado = rolActivo === "propietario" && !tieneUbicaciones;

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CorrespondenciaFormData>({
    resolver: zodResolver(correspondenciaSchema),
    defaultValues: {
      categoria: "",
      logistica: "",
      nombre: "",
      ci: "",
      instrucciones: "",
      entregaEnPuerta: false,
      estadoEncomienda: "",
      descripcion: "",
      torre: "",
      piso: "",
      unidades: [],
      fecha: new Date(),
    },
  });

  const watchedUnidades = watch("unidades");
  const watchedEntregaEnPuerta = watch("entregaEnPuerta");
  const watchedFecha = watch("fecha");

  const [selectAll, setSelectAll] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [fotos, setFotos] = useState<string[]>([]);
  const [fotoError, setFotoError] = useState("");
  const [showFotoSheet, setShowFotoSheet] = useState(false);

  const categoriasOptions =
    rolActivo === "guardia"
      ? ["Delivery/Comida", ...CATEGORIAS.slice(1)]
      : [...CATEGORIAS];

  const toggleUnidad = (u: string) => {
    const puedeMulti = rolActivo === "guardia" || rolActivo === "administrador";
    const current = watchedUnidades || [];
    if (!puedeMulti) {
      setValue("unidades", current.includes(u) ? [] : [u], {
        shouldValidate: true,
      });
      return;
    }
    const next = current.includes(u)
      ? current.filter((x) => x !== u)
      : [...current, u];
    setValue("unidades", next, { shouldValidate: true });
  };

  const toggleSelectAll = () => {
    const next = !selectAll;
    setSelectAll(next);
    setValue("unidades", next ? [...UNIDADES] : [], { shouldValidate: true });
  };

  const handleFotosChange = async (useCamera: boolean) => {
    setShowFotoSheet(false);
    setFotoError("");
    const result = useCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
          allowsMultipleSelection: true,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
          allowsMultipleSelection: true,
        });

    if (!result.canceled && result.assets.length > 0) {
      const uris = result.assets.map((a) => a.uri);
      setFotos((prev) => [...prev, ...uris]);
    }
  };

  const quitarFoto = (idx: number) =>
    setFotos((prev) => prev.filter((_, i) => i !== idx));

  const handleAgregar = (data: CorrespondenciaFormData) => {
    const base: any = {
      empresa: data.logistica || "Desconocido",
      unidad: data.unidades?.[0] || "504 C",
      nombre: data.nombre || "",
      ci: data.ci || "",
      estado: informarItem
        ? ("En Portería" as const)
        : ("No Recibido" as const),
      categoria: data.categoria,
      logistica: data.logistica || "",
      descripcion: data.descripcion || "",
      entregaEnPuerta: data.entregaEnPuerta,
      torre: data.torre || "",
      piso: data.piso || "",
      estadoEncomienda: data.estadoEncomienda,
    };
    if (informarItem) {
      base.informarInfo = {
        descripcion: data.descripcion || "Sin descripción",
        fotos: fotos,
        fechaReporte: new Date().toLocaleString("es-AR"),
        usuarioReporte: usuario
          ? `${usuario.nombre} ${usuario.apellido}`
          : "Personal de Seguridad",
      };
    }
    agregar(base, { onSuccess: () => setShowSuccess(true) });
  };

  if (accesoBloqueado) {
    return (
      <View className="flex-1 bg-bg-app items-center justify-center px-4">
        <Text style={{ fontSize: 48, marginBottom: 16 }}>🚫</Text>
        <Text className="text-base text-gray-500 text-center">
          No tienes acceso a Correspondencia. Solo los Residentes pueden usar
          esta función.
        </Text>
      </View>
    );
  }

  if (!puedeCrear) {
    return (
      <View className="flex-1 bg-bg-app items-center justify-center px-4">
        <Text style={{ fontSize: 48, marginBottom: 16 }}>🚫</Text>
        <Text className="text-base text-gray-500 text-center">
          Esta función solo está disponible para el Guardia de Seguridad y el
          Administrador.
        </Text>
      </View>
    );
  }

  const successItem = {
    empresa: watch("logistica") || "",
    unidad: watchedUnidades?.[0] || "",
    nombre: watch("nombre") || "",
    ci: watch("ci") || "",
    estado: "En Portería" as const,
    fecha: new Date().toLocaleDateString("es-AR"),
  };

  return (
    <View className="flex-1 bg-bg-app">
      {/* Header with back button */}
      <View className="flex-row items-center gap-3 px-4 py-3 bg-white border-b border-gray-100">
        <Pressable onPress={() => navigation.goBack()} className="p-1">
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </Pressable>
        <Text className="text-lg font-bold text-gray-900">
          {informarItem
            ? "Informar Correspondencia"
            : "Agregar Correspondencia"}
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 12 }}
      >
        {!informarItem && (
          <>
            <Controller
              control={control}
              name="categoria"
              render={({ field: { onChange, value } }) => (
                <Select
                  label="Seleccione categoría:"
                  value={value || null}
                  options={categoriasOptions}
                  onChange={(v) => onChange(String(v))}
                />
              )}
            />
            {errors.categoria && (
              <Text className="text-xs text-danger -mt-2 font-medium">
                {errors.categoria.message}
              </Text>
            )}

            <Controller
              control={control}
              name="logistica"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  value={value || ""}
                  onChangeText={onChange}
                  placeholder="Logística (empresa)"
                  showEditIcon={false}
                />
              )}
            />

            <Controller
              control={control}
              name="nombre"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  value={value || ""}
                  onChangeText={onChange}
                  placeholder="Destinatario (opcional)"
                  showEditIcon={false}
                />
              )}
            />

            {rolActivo !== "guardia" && (
              <>
                <Controller
                  control={control}
                  name="ci"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      value={value || ""}
                      onChangeText={onChange}
                      placeholder="Identificación (opcional)"
                      showEditIcon={false}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="instrucciones"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      value={value || ""}
                      onChangeText={onChange}
                      placeholder="Instrucciones adicionales"
                      multiline
                      showEditIcon
                    />
                  )}
                />
              </>
            )}

            <Controller
              control={control}
              name="entregaEnPuerta"
              render={({ field: { onChange, value } }) => (
                <Toggle
                  value={value}
                  onChange={onChange}
                  labelRight="Entrega en puerta"
                />
              )}
            />
          </>
        )}

        {/* Estado de encomienda */}
        <Controller
          control={control}
          name="estadoEncomienda"
          render={({ field: { onChange, value } }) => (
            <Select
              label="Estado de encomienda:"
              value={value || null}
              options={[...ESTADOS_ENCOMIENDA]}
              onChange={(v) => onChange(String(v))}
            />
          )}
        />
        {errors.estadoEncomienda && (
          <Text className="text-xs text-danger -mt-2 font-medium">
            {errors.estadoEncomienda.message}
          </Text>
        )}

        {/* Descripción */}
        <Controller
          control={control}
          name="descripcion"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              value={value || ""}
              onChangeText={onChange}
              placeholder="Descripción de la encomienda"
              multiline
              showEditIcon
            />
          )}
        />

        {/* Fotos */}
        <View>
          <Pressable
            onPress={() => setShowFotoSheet(true)}
            className="items-center justify-center rounded-2xl py-3.5"
            style={{
              borderWidth: 1.5,
              borderStyle: "dashed",
              borderColor: "#E5E7EB",
              backgroundColor: "#fff",
            }}
          >
            <Text className="text-base font-medium text-gray-900">
              Sube una o varias fotos
            </Text>
          </Pressable>

          {fotoError ? (
            <Text className="text-xs mt-1.5" style={{ color: "#DC2626" }}>
              {fotoError}
            </Text>
          ) : null}

          {fotos.length > 0 ? (
            <View className="flex-row flex-wrap gap-2 mt-2.5">
              {fotos.map((uri, i) => (
                <View
                  key={i}
                  style={{ width: 64, height: 64, position: "relative" }}
                >
                  <Image
                    source={{ uri }}
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                    }}
                    resizeMode="cover"
                  />
                  <Pressable
                    onPress={() => quitarFoto(i)}
                    style={{
                      position: "absolute",
                      top: -6,
                      right: -6,
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: "#111827",
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 2,
                      borderColor: "#fff",
                    }}
                  >
                    <Text
                      style={{
                        color: "#fff",
                        fontSize: 11,
                        fontWeight: "bold",
                      }}
                    >
                      ✕
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <Text className="text-xs text-gray-500 text-right mt-1.5">
              Ningún archivo seleccionado
            </Text>
          )}
        </View>

        {!informarItem && (
          <>
            {/* Calendar */}
            <Controller
              control={control}
              name="fecha"
              render={({ field: { onChange, value } }) => (
                <Calendar selected={value || new Date()} onSelect={onChange} />
              )}
            />

            {/* Torre / Piso */}
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Controller
                  control={control}
                  name="torre"
                  render={({ field: { onChange, value } }) => (
                    <Select
                      label="Torre:"
                      value={value || null}
                      options={[...TORRES]}
                      onChange={(v) => onChange(String(v))}
                    />
                  )}
                />
              </View>
              <View className="flex-1">
                <Controller
                  control={control}
                  name="piso"
                  render={({ field: { onChange, value } }) => (
                    <Select
                      label="Piso:"
                      value={value || null}
                      options={[...PISOS]}
                      onChange={(v) => onChange(String(v))}
                    />
                  )}
                />
              </View>
            </View>

            {/* Unit selector */}
            <View>
              <Text className="text-sm text-gray-900 text-center mb-3.5 leading-5">
                Seleccione el departamento al cual va destinado la
                correspondencia recibida
              </Text>

              {(rolActivo === "guardia" || rolActivo === "administrador") && (
                <View className="flex-row items-center gap-2.5 mb-2.5">
                  <Toggle value={selectAll} onChange={toggleSelectAll} />
                  <Text className="text-sm text-gray-500">
                    Seleccionar todo
                  </Text>
                </View>
              )}

              <View
                className="rounded-xl p-3 flex-row flex-wrap gap-2"
                style={{
                  backgroundColor: "#fff",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                }}
              >
                {UNIDADES.map((u) => {
                  const sel = (watchedUnidades || []).includes(u);
                  return (
                    <Pressable
                      key={u}
                      onPress={() => toggleUnidad(u)}
                      className="h-9 rounded-full items-center justify-center px-2"
                      style={{
                        borderWidth: 1.5,
                        borderColor: sel ? "#F5B800" : "#E5E7EB",
                        backgroundColor: sel ? "#FFF8E1" : "transparent",
                      }}
                    >
                      <Text
                        className="text-xs"
                        style={{
                          fontWeight: sel ? "600" : "400",
                          color: "#111827",
                        }}
                      >
                        {u}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {errors.unidades && (
                <Text className="text-xs text-danger mt-1.5 font-medium">
                  {errors.unidades.message}
                </Text>
              )}
            </View>
          </>
        )}

        <Button
          variant="primary"
          fullWidth
          onPress={handleSubmit(handleAgregar)}
        >
          Agregar
        </Button>

        <View style={{ height: 16 }} />

        {/* Success modal */}
        <Modal
          visible={showSuccess}
          onClose={() => {
            setShowSuccess(false);
            navigation.navigate("Correspondencia");
          }}
          title="Correspondencia"
        >
          <View className="gap-4 text-center">
            <Text className="text-lg font-semibold text-center">
              ¡Correspondencia cargada con exito!
            </Text>
            <View
              className="rounded-xl p-3.5 gap-1"
              style={{ borderWidth: 1.5, borderColor: "#F5B800" }}
            >
              <Text className="text-base font-semibold">
                {successItem.empresa}: {successItem.unidad}
              </Text>
              <Text className="text-base font-bold">{successItem.nombre}</Text>
              <Text className="text-sm text-gray-500">
                CI: {successItem.ci}
              </Text>
              <View className="flex-row justify-between mt-1.5">
                <Badge status="En Portería" />
                <Text className="text-sm text-gray-500">
                  {successItem.fecha}
                </Text>
              </View>
            </View>
          </View>
        </Modal>

        {/* Foto picker bottom sheet */}
        <BottomSheet
          visible={showFotoSheet}
          onClose={() => setShowFotoSheet(false)}
        >
          <BottomSheetOption
            label="Galería"
            onPress={() => handleFotosChange(false)}
          />
          <BottomSheetOption
            label="Cámara"
            onPress={() => handleFotosChange(true)}
          />
        </BottomSheet>
      </ScrollView>
    </View>
  );
}
