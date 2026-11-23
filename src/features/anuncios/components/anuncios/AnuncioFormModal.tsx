import { theme } from "@/config";
import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pressable, Text, View } from "react-native";
import {
  Button,
  Cargando,
  CampoFecha,
  Checkbox,
  EtiquetaDelCampo,
  Input,
  Modal,
  Select,
  Tabs,
} from "@/shared/components";
import { useParametrosDeLaBase } from "@/shared/hooks";
import { useLista } from "@/shared/hooks/useLista";
import { ahora, formatDateInput, parseFechaIso } from "@/shared/utils";
import { crearEsquemaAnuncio } from "../../schemas/anuncios.schema";
import { SeccionesDeEncuesta } from "./SeccionesDeEncuesta";
import { useIndiceDelEdificio } from "../../hooks/useIndiceDelEdificio";
import {
  anuncioFormVacio,
  tiposAnuncio,
  type AnuncioFormValues,
} from "../../types/anuncios";


export function AnuncioFormModal({
  visible,
  onClose,
  onSave,
  publicando = false,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (values: AnuncioFormValues) => void;
  /** Mientras se publica: el botón espera y no publica dos veces. */
  publicando?: boolean;
}) {
  /*
    Los largos del título y la descripción y el mínimo de opciones de una
    encuesta son los de la base. Mientras no llegan, el formulario no se pinta.
  */
  const parametros = useParametrosDeLaBase();
  // Lo que se guarda es el código; el nombre y el orden, los del administrador.
  const categorias = useLista("categorias_de_anuncio").opciones.map((o) => ({
    label: o.etiqueta,
    value: o.codigo,
  }));
  const limites = useMemo(
    () =>
      parametros.listo
        ? {
            tituloMax: parametros.numero("anuncio_titulo_largo_maximo"),
            descripcionMax: parametros.numero(
              "anuncio_descripcion_largo_maximo",
            ),
            opcionesMin: parametros.numero("encuesta_opciones_minimas"),
          }
        : null,
    [parametros],
  );
  const esquema = useMemo(
    () => (limites ? crearEsquemaAnuncio(limites) : null),
    [limites],
  );
  const opcionesMin = limites?.opcionesMin ?? null;
  /*
    Cómo vota y cuándo se aprueba una encuesta nueva: lo que propone la base
    (`encuesta_*_por_defecto`, 17/11/2026), que el administrador cambia en el
    panel. Nada escrito aquí.
  */
  const reglasIniciales = useMemo(
    () =>
      parametros.listo
        ? {
            quienVota:
              parametros.texto("encuesta_quien_vota_por_defecto") === "residente"
                ? ("residente" as const)
                : ("vivienda" as const),
            comoSeCuenta:
              parametros.texto("encuesta_como_se_cuenta_por_defecto") === "indice"
                ? ("indice" as const)
                : ("igual" as const),
            reglaAprobacion:
              parametros.texto("encuesta_regla_por_defecto") === "umbral"
                ? ("umbral" as const)
                : ("mayoria" as const),
            umbralAprobacion: String(parametros.numero("encuesta_umbral_por_defecto")),
          }
        : null,
    [parametros],
  );
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AnuncioFormValues>({
      resolver: esquema ? zodResolver(esquema) : undefined,
      defaultValues: anuncioFormVacio(),
    });
  const tipo = watch("tipo");
  const indiceDelEdificio = useIndiceDelEdificio(visible);
  const fechaPublicada = watch("fechaPublicada");
  useEffect(() => {
    if (!visible || opcionesMin === null) return;
    // Una encuesta nueva abre con tantas cajas de opción como pide la base.
    reset({
      ...anuncioFormVacio(),
      ...reglasIniciales,
      opcionesVotacion: Array.from({ length: opcionesMin }, () => ({
        valor: "",
      })),
    });
  }, [reset, visible, opcionesMin, reglasIniciales]);
  if (opcionesMin === null) {
    return (
      <Modal visible={visible} onClose={onClose} title="Crear anuncio">
        <Cargando variante="enLinea" />
      </Modal>
    );
  }
  return (
    <Modal visible={visible} onClose={onClose} title="Crear anuncio">
      <View className="gap-4" key={tipo}>
        <Controller
          control={control}
          name="tipo"
          render={({ field }) => (
            <Tabs
              tabs={[...tiposAnuncio]}
              active={field.value}
              onChange={(value) => field.onChange(value || "Anuncio")}
              variant="chip"
            />
          )}
        />
        <Controller
          control={control}
          name="categoria"
          render={({ field, fieldState }) => (
            <Select
              label="Categoría *"
              value={field.value}
              options={categorias}
              onChange={(value) => field.onChange(String(value))}
              placeholder="Categoría"
              error={fieldState.error?.message}
            />
          )}
        />
        <View>
          <EtiquetaDelCampo
            label="Dirigido a *"
            explicacion="Quién verá esta publicación en la aplicación. Marca al menos un grupo."
          />
          <View className="gap-2">
            {(
              [
                { key: "paraPropietarios", label: "Propietarios" },
                { key: "paraResidentes", label: "Residentes" },
                { key: "paraHuespedes", label: "Huéspedes Temporales" },
                /*
                  La portería, en anuncios y en encuestas: lo pidió el
                  cliente el 15/10/2026, «debe ser parametrizable». En una
                  encuesta, marcarla es lo que le da voto: quién tiene voz en
                  una asamblea lo decide quien publica, no la app.
                */
                { key: "paraPorteria", label: "Portería" },
                // Los profesionales permanentes con cuenta (18/11/2026). No votan.
                { key: "paraTrabajadores", label: "Profesionales permanentes" },
              ] as const
            ).map((option) => (
              <Controller
                key={option.key}
                control={control}
                name={option.key}
                render={({ field }) => (
                  <Pressable
                    onPress={() => field.onChange(!field.value)}
                    className="flex-row items-center gap-2.5"
                  >
                    <View
                      className="items-center justify-center rounded"
                      style={{
                        width: 18,
                        height: 18,
                        borderWidth: 2,
                        borderColor: field.value
                          ? theme.colors.warning
                          : theme.colors.borderStrong,
                        backgroundColor: field.value
                          ? theme.colors.warning
                          : theme.colors.bgCard,
                      }}
                    >
                      {field.value && (
                        <Text
                          style={{
                            fontSize: 12,
                            color: theme.colors.textInverse,
                            fontWeight: "700",
                          }}
                        >
                          ✓
                        </Text>
                      )}
                    </View>
                    <Text className="text-base text-gray-900">
                      {option.label}
                    </Text>
                  </Pressable>
                )}
              />
            ))}
          </View>
          {errors.paraPropietarios?.message ? (
            <Text className="mt-1 text-xs text-red-600">
              {errors.paraPropietarios.message}
            </Text>
          ) : null}
        </View>
        <Controller
          control={control}
          name="titulo"
          render={({ field, fieldState }) => (
            <Input
              label="Título *"
              value={field.value}
              onChangeText={field.onChange}
              placeholder="Título del anuncio"
              multiline
            error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="descripcion"
          render={({ field, fieldState }) => (
            <Input
              label="Descripción *"
              value={field.value}
              onChangeText={field.onChange}
              placeholder="Descríbelo con el mayor detalle posible"
              multiline
            error={fieldState.error?.message}
            />
          )}
        />
        {tipo === "Anuncio" ? (
          <View className="gap-2">
            <DateField
              label="Fecha de publicación (opcional)"
              value={fechaPublicada}
              onChange={(fecha) =>
                setValue("fechaPublicada", fecha, { shouldValidate: true })
              }
            />
            {/*
              Aqui habia «Fecha de finalizacion» tambien para un anuncio, y
              **no filtraba nada**: pasado ese dia el anuncio se seguia viendo
              igual. Era otro campo que prometia algo que no pasaba.

              Retirado a peticion del cliente el 05/10/2026. En una encuesta si
              se queda, porque ahi es cuando cierra la votacion y eso funciona.

              La columna `publicada_hasta` no se toca: lo que algun anuncio
              tenga guardado sigue ahi.
            */}
          </View>
        ) : (
          <SeccionesDeEncuesta
            control={control}
            setValue={setValue}
            opcionesMin={opcionesMin}
            indiceDelEdificio={indiceDelEdificio}
          />
        )}
        {/*
          Aqui habia dos botones --«Adjuntar Documento» y «Adjuntar Imagen»--
          sin `onPress` y sin nada detras: `publicacion` no tiene ninguna
          columna de adjuntos, ni el KT los menciona. Eran funciones sin
          construir pintadas como botones (R-10), y se retiran por decision del
          cliente el 25/09/2026. Si algun dia se adjuntan documentos a un
          anuncio, hara falta la columna primero.
        */}
        {/*
          Avisar o no. Lo pidio el cliente el 05/10/2026 --«parametrizable el
          tema de anuncio y votacion»-- y vale igual para los dos, asi que va
          fuera de la rama del tipo.

          Hasta hoy **nadie avisaba**: el motivo `anuncio_publicado` existia en
          la base desde septiembre y ninguna funcion lo insertaba. Se publicaba
          un anuncio y habia que entrar a mirar.
        */}
        <Controller
          control={control}
          name="avisar"
          render={({ field }) => (
            <View className="gap-1">
              <Checkbox
                checked={field.value}
                onChange={field.onChange}
                label="Avisar a quien le toque"
              />
              <Text className="text-xs leading-4 text-gray-400">
                {fechaPublicada && fechaPublicada > ahora()
                  ? "El aviso sale el día de la fecha de publicación, no ahora."
                  : "Les llega a la campana de la aplicación, según la audiencia de arriba."}
              </Text>
            </View>
          )}
        />

        {/*
          Lo que falta, dicho. «Publicar» se quedaba mudo: si faltaba la
          categoría, la audiencia o una opción, no pasaba nada y no se decía
          por qué --ninguno de esos tres campos pintaba su error--.
        */}
        {(() => {
          const faltas = [
            errors.categoria?.message,
            errors.paraPropietarios?.message,
            errors.urlVideo?.message,
            errors.umbral?.message,
            errors.umbralAprobacion?.message,
            errors.fechaFinalizacion?.message,
            errors.opcionesVotacion?.message,
            errors.opcionesVotacion?.root?.message,
          ].filter(Boolean) as string[];
          return faltas.length ? (
            <View className="rounded-xl bg-red-50 p-3 gap-1">
              {[...new Set(faltas)].map((falta) => (
                <Text key={falta} className="text-sm text-red-700">
                  · {falta}
                </Text>
              ))}
            </View>
          ) : null;
        })()}

        <Button
          variant="primary"
          fullWidth
          loading={publicando}
          onPress={() => void handleSubmit(onSave)()}
        >
          Publicar
        </Button>
      </View>
    </Modal>
  );
}

/**
 * Un campo de fecha del formulario de anuncios.
 *
 * Era un `Pressable` que encendia un `DateTimePicker`, **que en web devuelve
 * `null`**: las dos fechas de un anuncio --cuando se publica y cuando termina--
 * no se podian elegir.
 *
 * Va **en linea** y no en un modal porque este formulario ya es un modal. Los
 * modales de esta aplicacion traen animacion y velo propios, y apilarlos ya dio
 * dos sustos documentados en AGENTS.md.
 */
function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Date | null;
  onChange: (fecha: Date | null) => void;
}) {
  return (
    <CampoFecha
      enLinea
      label={label}
      value={value ? formatDateInput(value) : ""}
      onChange={(iso) => onChange(parseFechaIso(iso))}
      placeholder="Hoy, si no eliges otra"
    />
  );
}
