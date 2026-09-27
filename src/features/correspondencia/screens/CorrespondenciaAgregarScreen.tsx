import { theme } from "@/config";
import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, Image } from "react-native";
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
import { formatDate } from "@/shared/utils";
import { useUIStore } from "@/stores/ui-store";
import { useUnidadesDisponibles, useNavegacion, useParametros } from "@/shared/hooks";
import { CATEGORIAS, ESTADOS_ENCOMIENDA } from "../constants";

export function CorrespondenciaAgregarScreen() {
  const navigation = useNavegacion();
  const parametros = useParametros("CorrespondenciaAgregar");
  const informarItem = parametros?.informar || null;
  const { agregar, reportarIncidencia } = useCorrespondencia();
  const {
    resolver: resolverUnidad,
    torres: torresReales,
    codigosDe,
    unidades,
  } = useUnidadesDisponibles();
  const addToast = useUIStore((s) => s.addToast);
  const rolActivo = useAuthStore((s) => s.rolActivo);
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

  const torreElegida = watch("torre");
  // Los departamentos se acotan a la torre elegida: no tiene sentido ofrecer
  // unidades de otra torre, ni unidades que no existen.
  const unidadesDeTorre = codigosDe(torreElegida);
  const watchedUnidades = watch("unidades");

  // `PISOS` era '1'..'10' fijo. Los pisos reales salen de las unidades.
  const pisos = [
    ...new Set(unidades.map((u) => String(u.piso)).filter(Boolean)),
  ].sort((a, b) => Number(a) - Number(b));

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
    setValue("unidades", next ? unidadesDeTorre : [], { shouldValidate: true });
  };

  const handleFotosChange = async (useCamera: boolean) => {
    setShowFotoSheet(false);
    setFotoError("");
    const result = useCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          quality: 0.8,
          allowsMultipleSelection: true,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
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

  /**
   * Informar una incidencia es colgarla del paquete que **ya existe**, no
   * registrar uno nuevo.
   *
   * Estaba escrito al reves: en modo informe la pantalla creaba una
   * correspondencia nueva y despues le pegaba la incidencia. Y no podia
   * funcionar, porque el formulario oculta la categoria y el selector de unidad
   * en ese modo mientras el esquema los sigue exigiendo: al pulsar «Agregar» la
   * validacion fallaba contra campos que **no se pintan**, asi que el boton no
   * hacia nada y no decia nada. Un guardia con un paquete roto en la mano no
   * tenia forma de reportarlo.
   *
   * Por eso este camino no pasa por `handleSubmit`: esa validacion es la del
   * alta, y aqui no hay alta. Lo unico que hace falta es la descripcion, y de
   * eso se encarga el propio repositorio si viene vacia.
   */
  const handleInformar = () => {
    if (!informarItem?.uuid) return;
    reportarIncidencia(
      informarItem.uuid,
      watch("descripcion") || "Sin descripción",
      fotos,
    );
    setShowSuccess(true);
  };

  const handleAgregar = (data: CorrespondenciaFormData) => {
    // La correspondencia se ata a una unidad real por FK. El guardia puede
    // registrar para cualquier unidad del condominio; el residente, para la suya.
    // El guardia no tiene membresias de unidad: es miembro del condominio. La
    // unidad se resuelve contra las unidades reales del edificio, no contra las
    // del usuario ni contra una lista fija.
    const unidadDestino = resolverUnidad(data.torre, data.unidades?.[0]);

    if (!unidadDestino) {
      addToast(
        "No pudimos identificar la unidad de destino. Elegí torre y departamento.",
        "error",
      );
      return;
    }

    agregar(
      {
        condominioId: unidadDestino.condominioId,
        unidadId: unidadDestino.unidadId,
        empresa: data.logistica || "Desconocido",
        logistica: data.logistica || undefined,
        categoria: data.categoria,
        descripcion: data.descripcion || undefined,
        condicion: data.estadoEncomienda,
        entregaEnPuerta: data.entregaEnPuerta,
        destinatarioNombre: data.nombre || undefined,
        destinatarioDocumento: data.ci || undefined,
        /*
          Si la portería lo está registrando es porque lo tiene: está en la
          portería. Decía `informarItem ? "En Portería" : "No Recibido"`, o sea
          que un paquete normal —el caso corriente, el guardia con la caja en
          la mano— quedaba como **no recibido**, y solo al reportar una
          incidencia pasaba a portería. Estaba al revés.

          "No recibido" describe otra cosa: algo anunciado que todavía no está.
        */
        estado: "En Portería",
      },
      {
        onSuccess: () => setShowSuccess(true),
      },
    );
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
    fecha: formatDate(new Date()),
  };

  return (
    <View className="flex-1 bg-bg-app">
      {/* Header with back button */}
      <View className="flex-row items-center gap-3 px-4 py-3 bg-white border-b border-gray-100">
        <Pressable
          accessibilityLabel="Volver"
          onPress={() => navigation.goBack()}
          className="p-1"
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
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
                  onBlur={onBlur}
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
                  onBlur={onBlur}
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
                      onBlur={onBlur}
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
                      onBlur={onBlur}
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
              onBlur={onBlur}
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
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.bgCard,
            }}
          >
            <Text className="text-base font-medium text-gray-900">
              Sube una o varias fotos
            </Text>
          </Pressable>

          {fotoError ? (
            <Text
              className="text-xs mt-1.5"
              style={{ color: theme.colors.dangerDark }}
            >
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
                      borderColor: theme.colors.border,
                    }}
                    resizeMode="cover"
                  />
                  <Pressable
                    accessibilityLabel="Quitar esta foto"
                    onPress={() => quitarFoto(i)}
                    style={{
                      position: "absolute",
                      top: -6,
                      right: -6,
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: theme.colors.text,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 2,
                      borderColor: theme.colors.bgCard,
                    }}
                  >
                    <Text
                      style={{
                        color: theme.colors.textInverse,
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
                      options={torresReales}
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
                      options={pisos}
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
                  backgroundColor: theme.colors.bgCard,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}
              >
                {unidadesDeTorre.map((u) => {
                  const sel = (watchedUnidades || []).includes(u);
                  return (
                    <Pressable
                      key={u}
                      onPress={() => toggleUnidad(u)}
                      className="h-9 rounded-full items-center justify-center px-2"
                      style={{
                        borderWidth: 1.5,
                        borderColor: sel
                          ? theme.colors.primary
                          : theme.colors.border,
                        backgroundColor: sel
                          ? theme.colors.primaryLight
                          : "transparent",
                      }}
                    >
                      <Text
                        className="text-xs"
                        style={{
                          fontWeight: sel ? "600" : "400",
                          color: theme.colors.text,
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
          onPress={informarItem ? handleInformar : handleSubmit(handleAgregar)}
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
              {informarItem
                ? "Incidencia reportada"
                : "¡Correspondencia cargada con exito!"}
            </Text>
            {/*
              En modo informe la tarjeta del alta sale vacia --no hay empresa ni
              unidad que resumir, porque no se registro nada nuevo-- asi que se
              enseña el paquete sobre el que se informo.
            */}
            <View
              className="rounded-xl p-3.5 gap-1"
              style={{ borderWidth: 1.5, borderColor: theme.colors.primary }}
            >
              <Text className="text-base font-semibold">
                {informarItem
                  ? `${informarItem.empresa ?? ""}: ${informarItem.unidad ?? ""}`
                  : `${successItem.empresa}: ${successItem.unidad}`}
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
