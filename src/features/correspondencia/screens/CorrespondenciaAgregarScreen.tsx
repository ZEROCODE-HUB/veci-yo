import { theme } from "@/config";
import React, { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { DesplazableConTeclado } from "@/shared/layouts";
import { Ionicons } from "@expo/vector-icons";
import { useForm, Controller, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuthStore, useUbicacionStore } from "@/stores";
import { Button, Toggle } from "@/shared/components";
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
import { CATEGORIAS } from "../constants";
import { DestinosDeCorrespondencia } from "../components/DestinosDeCorrespondencia";
import { sinEntregaEnPuerta } from "../helpers/destinos";
import { FotosDelEnvio } from "../components/agregar/FotosDelEnvio";
import { EnvioRegistrado } from "../components/agregar/EnvioRegistrado";
import { DatosDelEnvio } from "../components/agregar/DatosDelEnvio";
import { EstadoYDescripcion } from "../components/agregar/EstadoYDescripcion";
import { SinAccesoAlAlta } from "../components/agregar/SinAccesoAlAlta";

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

  const categoriasOptions =
    rolActivo === "guardia"
      ? ["Delivery/Comida", ...CATEGORIAS.slice(1)]
      : [...CATEGORIAS];

  const codigoDe = (unidadId: string) =>
    unidades.find((u) => u.unidadId === unidadId)?.codigo ?? "";

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
      <SinAccesoAlAlta mensaje="No tienes acceso a Correspondencia. Solo los Residentes pueden usar esta función." />
    );
  }

  if (!puedeCrear) {
    return (
      <SinAccesoAlAlta mensaje="Esta función solo está disponible para el Guardia de Seguridad y el Administrador." />
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

      <DesplazableConTeclado
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 12 }}
      >
        {!informarItem && (
          <DatosDelEnvio
            control={control}
            errors={errors}
            categorias={categoriasOptions}
            esGuardia={rolActivo === "guardia"}
          />
        )}

        <EstadoYDescripcion control={control} errors={errors} />

        <FotosDelEnvio fotos={fotos} onCambiar={setFotos} />

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

        <EnvioRegistrado
          visible={showSuccess}
          onClose={() => {
            setShowSuccess(false);
            navigation.navigate("Correspondencia");
          }}
          informado={informarItem}
          registradas={registradas}
          resumen={successItem}
        />
      </DesplazableConTeclado>
    </View>
  );
}
