import { theme } from "@/config";
import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useForm, Controller, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as ImagePicker from "expo-image-picker";
import { useAuthStore, useUbicacionStore } from "@/stores";
import {
  Button,
  Input,
  Select,
  Toggle,
  Modal,
  BottomSheet,
  BottomSheetOption,
  Badge,
} from "@/shared/components";
import { correspondenciaSchema } from "@/features/correspondencia/schemas";
import type { CorrespondenciaFormData } from "@/features/correspondencia/schemas";
import {
  useCorrespondencia,
  usePermisosDeEntrega,
} from "../hooks/useCorrespondencia";
import { formatDate } from "@/shared/utils";
import { mensajeDeError } from "@/shared/utils/error.util";
import { useUIStore } from "@/stores/ui-store";
import {
  useUnidadesDisponibles,
  useNavegacion,
  useParametros,
} from "@/shared/hooks";
import type { ArchivoElegido } from "@/shared/services/archivos";
import { CATEGORIAS, ESTADOS_ENCOMIENDA } from "../constants";
import { DestinosDeCorrespondencia } from "../components/DestinosDeCorrespondencia";
import { sinEntregaEnPuerta } from "../helpers/destinos";

/** Cómo se llama en pantalla cada campo que el formulario exige. */
const NOMBRE_DEL_CAMPO: Partial<Record<keyof CorrespondenciaFormData, string>> =
  {
    categoria: "la categoría",
    estadoEncomienda: "el estado de encomienda",
    unidades: "el departamento",
  };

export function CorrespondenciaAgregarScreen() {
  const navigation = useNavegacion();
  const parametros = useParametros("CorrespondenciaAgregar");
  const informarItem = parametros?.informar || null;
  const { agregar, creando, reportarIncidencia, informando } =
    useCorrespondencia();
  const { torres, unidades } = useUnidadesDisponibles();
  const permisosDeEntrega = usePermisosDeEntrega();
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
    },
  });

  const elegidas = unidades.filter((u) =>
    (watch("unidades") || []).includes(u.unidadId),
  );
  const entregaEnPuerta = watch("entregaEnPuerta");

  /*
    La entrega en puerta la autoriza la administración por vivienda (KT 4.5), y
    la base rechaza el alta si no lo está. El interruptor se ofrecía siempre:
    se llenaba el formulario entero y al final salía un aviso rojo. Ahora se
    sabe antes, y se dice para cuáles no.
  */
  const sinPermiso = sinEntregaEnPuerta(permisosDeEntrega, elegidas);
  const entregaDisponible = elegidas.length > 0 && sinPermiso.length === 0;

  useEffect(() => {
    if (!entregaDisponible && entregaEnPuerta) {
      setValue("entregaEnPuerta", false);
    }
  }, [entregaDisponible, entregaEnPuerta, setValue]);

  const [showSuccess, setShowSuccess] = useState(false);
  /** Los códigos de las viviendas para las que el envío quedó registrado. */
  const [registradas, setRegistradas] = useState<string[]>([]);
  const [fotos, setFotos] = useState<ArchivoElegido[]>([]);
  const [showFotoSheet, setShowFotoSheet] = useState(false);

  const categoriasOptions =
    rolActivo === "guardia"
      ? ["Delivery/Comida", ...CATEGORIAS.slice(1)]
      : [...CATEGORIAS];

  const codigoDe = (unidadId: string) =>
    unidades.find((u) => u.unidadId === unidadId)?.codigo ?? "";

  const handleFotosChange = async (useCamera: boolean) => {
    setShowFotoSheet(false);
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
      const nuevas = result.assets.map((a) => ({
        uri: a.uri,
        nombre: a.fileName ?? "foto.jpg",
        tipoMime: a.mimeType ?? "image/jpeg",
      }));
      setFotos((prev) => [...prev, ...nuevas]);
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
    /*
      Un informe de incidencia sin descripción no informa de nada. Se guardaba
      con «Sin descripción» escrito por la aplicación, a nombre de la portería.
    */
    const descripcion = (watch("descripcion") || "").trim();
    if (!descripcion) {
      addToast("Describe qué pasó con el envío.", "error");
      return;
    }
    reportarIncidencia(
      {
        uuid: informarItem.uuid,
        descripcion,
        fotos,
        condicion: watch("estadoEncomienda") || undefined,
      },
      { onSuccess: () => setShowSuccess(true) },
    );
  };

  /*
    Los campos que faltan están arriba del todo --la categoría es el primero-- y
    el botón abajo: se pulsaba «Agregar», el error salía fuera de la vista y la
    pantalla parecía no hacer nada.
  */
  const alFaltarAlgo = (faltan: FieldErrors<CorrespondenciaFormData>) => {
    const nombres = (
      Object.keys(faltan) as (keyof CorrespondenciaFormData)[]
    )
      .map((campo) => NOMBRE_DEL_CAMPO[campo])
      .filter(Boolean);
    addToast(
      nombres.length > 0
        ? `Falta elegir ${nombres.join(", ")}.`
        : "Revisa los campos marcados.",
      "error",
    );
  };

  const handleAgregar = (data: CorrespondenciaFormData) => {
    // La correspondencia se ata a una unidad real por FK, y es una fila por
    // vivienda: marcar veinte departamentos registra veinte envíos.
    const destinos = unidades.filter((u) => data.unidades.includes(u.unidadId));

    if (destinos.length === 0) {
      addToast(
        "No pudimos identificar la unidad de destino. Elige el departamento.",
        "error",
      );
      return;
    }

    agregar(
      destinos.map((destino) => ({
        condominioId: destino.condominioId,
        unidadId: destino.unidadId,
        // Sin empresa va vacío: «Desconocido» escrito por la aplicación salía
        // en la lista y en el buscador como si fuera una empresa.
        empresa: data.logistica || "",
        logistica: data.logistica || undefined,
        categoria: data.categoria,
        descripcion: data.descripcion || undefined,
        condicion: data.estadoEncomienda,
        entregaEnPuerta: data.entregaEnPuerta,
        destinatarioNombre: data.nombre || undefined,
        destinatarioDocumento: data.ci || undefined,
        instrucciones: data.instrucciones || undefined,
        fotos,
        /*
          Si la portería lo está registrando es porque lo tiene: está en la
          portería. Decía `informarItem ? "En Portería" : "No Recibido"`, o sea
          que un paquete normal —el caso corriente, el guardia con la caja en
          la mano— quedaba como **no recibido**, y solo al reportar una
          incidencia pasaba a portería. Estaba al revés.

          "No recibido" describe otra cosa: algo anunciado que todavía no está.
        */
        estado: "En Portería" as const,
      })),
      {
        onSuccess: (resultado) => {
          if (resultado.fallidas.length > 0) {
            const cuales = resultado.fallidas
              .map((f) => codigoDe(f.unidadId))
              .join(", ");
            addToast(
              `No se registró para ${cuales}: ${mensajeDeError(
                resultado.fallidas[0].error,
                "no se pudo guardar",
              )}`,
              "error",
            );
            // Quedan marcadas solo las que faltan, para reintentar sin
            // duplicar las que sí entraron.
            setValue(
              "unidades",
              resultado.fallidas.map((f) => f.unidadId),
            );
          }
          if (resultado.registradas.length > 0) {
            setRegistradas(resultado.registradas.map(codigoDe));
            setShowSuccess(true);
          }
        },
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
    nombre: watch("nombre") || "",
    ci: watch("ci") || "",
    fecha: formatDate(new Date()),
  };

  const notaDeEntrega =
    elegidas.length === 0
      ? "Elige primero el departamento."
      : sinPermiso.length > 0
        ? `La administración no ha autorizado la entrega en puerta para ${sinPermiso
            .map((u) => u.codigo)
            .join(", ")}.`
        : "";

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
              render={({ field: { onChange, onBlur, value }, fieldState }) => (
                <Input
                  value={value || ""}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Logística (empresa)"
                  showEditIcon={false}
                  error={fieldState.error?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="nombre"
              render={({ field: { onChange, onBlur, value }, fieldState }) => (
                <Input
                  value={value || ""}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Destinatario (opcional)"
                  showEditIcon={false}
                  error={fieldState.error?.message}
                />
              )}
            />

            {rolActivo !== "guardia" && (
              <>
                <Controller
                  control={control}
                  name="ci"
                  render={({
                    field: { onChange, onBlur, value },
                    fieldState,
                  }) => (
                    <Input
                      value={value || ""}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="Identificación (opcional)"
                      showEditIcon={false}
                      error={fieldState.error?.message}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="instrucciones"
                  render={({
                    field: { onChange, onBlur, value },
                    fieldState,
                  }) => (
                    <Input
                      value={value || ""}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="Instrucciones adicionales"
                      multiline
                      showEditIcon
                      error={fieldState.error?.message}
                    />
                  )}
                />
              </>
            )}
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
          render={({ field: { onChange, onBlur, value }, fieldState }) => (
            <Input
              value={value || ""}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="Descripción de la encomienda"
              multiline
              showEditIcon
              error={fieldState.error?.message}
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

          {fotos.length > 0 ? (
            <View className="flex-row flex-wrap gap-2 mt-2.5">
              {fotos.map((foto, i) => (
                <View
                  key={foto.uri}
                  style={{ width: 64, height: 64, position: "relative" }}
                >
                  <Image
                    source={{ uri: foto.uri }}
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
            <DestinosDeCorrespondencia
              unidades={unidades}
              torres={torres}
              torre={watch("torre") || ""}
              piso={watch("piso") || ""}
              seleccion={watch("unidades") || []}
              onTorre={(torre) => setValue("torre", torre)}
              onPiso={(piso) => setValue("piso", piso)}
              onSeleccion={(seleccion) =>
                setValue("unidades", seleccion, { shouldValidate: true })
              }
              error={errors.unidades?.message}
            />

            {/*
              Va debajo de los departamentos porque depende de ellos: si se
              puede o no lo decide la vivienda elegida.
            */}
            <View className="gap-1">
              <Controller
                control={control}
                name="entregaEnPuerta"
                render={({ field: { onChange, value } }) => (
                  <Toggle
                    value={value}
                    onChange={onChange}
                    labelRight="Entrega en puerta"
                    disabled={!entregaDisponible}
                  />
                )}
              />
              {notaDeEntrega ? (
                <Text className="text-xs text-gray-500">{notaDeEntrega}</Text>
              ) : null}
            </View>
          </>
        )}

        <Button
          variant="primary"
          fullWidth
          loading={creando || informando}
          onPress={
            informarItem
              ? handleInformar
              : handleSubmit(handleAgregar, alFaltarAlgo)
          }
        >
          {informarItem ? "Enviar informe" : "Agregar"}
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
              {/*
                Solo lo que de verdad se registro, y **para quienes**: decia
                «Departamento 205» aunque se hubieran marcado veinte.
              */}
              <Text className="text-base font-semibold">
                {informarItem
                  ? [informarItem.empresa, informarItem.unidad]
                      .filter(Boolean)
                      .join(": ")
                  : registradas.length === 1
                    ? `Departamento ${registradas[0]}`
                    : `${registradas.length} departamentos: ${registradas.join(", ")}`}
              </Text>
              {Boolean(successItem.empresa) && (
                <Text className="text-sm text-gray-500">
                  {successItem.empresa}
                </Text>
              )}
              {Boolean(successItem.nombre) && (
                <Text className="text-base font-bold">
                  {successItem.nombre}
                </Text>
              )}
              {Boolean(successItem.ci) && (
                <Text className="text-sm text-gray-500">
                  CI: {successItem.ci}
                </Text>
              )}
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
