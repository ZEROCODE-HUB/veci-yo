import { theme } from "@/config";
import { useEffect } from "react";
import { Controller, useFieldArray, useWatch, type Control, type UseFormSetValue } from "react-hook-form";
import { Pressable, Text, View } from "react-native";
import { CampoFecha, Input, Toggle } from "@/shared/components";
import { formatDateInput, parseFechaIso } from "@/shared/utils";
import type { AnuncioFormValues } from "../../types/anuncios";
import { explicarUmbral } from "../../helpers/resultadoDeEncuesta";
import { opcionPorIndice } from "../../helpers/indiceDelEdificio";
import type { IndiceDelEdificio } from "../../services/anuncios.repo";
import { EleccionEnTarjetas } from "./EleccionEnTarjetas";
import { SeccionDelFormulario } from "./SeccionDelFormulario";

/**
 * Lo propio de una encuesta en el formulario de crear, por secciones
 * (17/11/2026): las opciones, quién vota, cómo se cuenta, cuándo se aprueba,
 * y los resultados y las fechas.
 *
 * «Cuándo se aprueba» reemplaza a «Participación esperada», que medía cuántos
 * votaban pero no decía si algo se aprobaba. La columna vieja (`umbral`) se
 * queda en la base para las versiones de la app ya instaladas.
 */
export function SeccionesDeEncuesta({
  control,
  setValue,
  opcionesMin,
  indiceDelEdificio,
}: {
  control: Control<AnuncioFormValues>;
  setValue: UseFormSetValue<AnuncioFormValues>;
  opcionesMin: number;
  /** Cuánto suma el índice de votación: sin el 100 %, no se cuenta por índice. */
  indiceDelEdificio: IndiceDelEdificio | null;
}) {
  const { fields, append, remove } = useFieldArray({ control, name: "opcionesVotacion" });
  const [quienVota, comoSeCuenta, reglaAprobacion, umbralAprobacion, votacionMultiple, fechaPublicada, fechaFinalizacion] =
    useWatch({
      control,
      name: [
        "quienVota",
        "comoSeCuenta",
        "reglaAprobacion",
        "umbralAprobacion",
        "votacionMultiple",
        "fechaPublicada",
        "fechaFinalizacion",
      ],
    });

  const porIndice = opcionPorIndice(indiceDelEdificio);
  // Si el valor propuesto era «según el índice» y el edificio no suma 100 %,
  // se vuelve a «voto igual»: no se puede publicar así (18/11/2026).
  const noSePuedePorIndice = indiceDelEdificio !== null && !porIndice.sePuede;
  useEffect(() => {
    if (noSePuedePorIndice && comoSeCuenta === "indice") setValue("comoSeCuenta", "igual");
  }, [noSePuedePorIndice, comoSeCuenta, setValue]);

  return (
    <View className="gap-3">
      <SeccionDelFormulario titulo="Opciones" ayuda="Lo que se puede votar. Para aprobar o rechazar algo, «Sí» y «No».">
        {fields.map((field, index) => (
          <View key={field.id} className="flex-row gap-2 items-center">
            <View className="flex-1">
              <Controller
                control={control}
                name={`opcionesVotacion.${index}.valor`}
                render={({ field: campo, fieldState }) => (
                  <Input
                    value={campo.value}
                    onChangeText={campo.onChange}
                    placeholder={index === 0 ? "Ej. Sí" : index === 1 ? "Ej. No" : `Opción ${index + 1}`}
                    error={fieldState.error?.message}
                  />
                )}
              />
            </View>
            {fields.length > opcionesMin ? (
              <Pressable accessibilityLabel="Quitar esta opción" onPress={() => remove(index)}>
                <Text style={{ fontSize: 18, color: theme.colors.danger }}>×</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
        <Pressable
          onPress={() => append({ valor: "" })}
          className="items-center py-2 rounded-lg"
          style={{ borderWidth: 1, borderColor: theme.colors.borderStrong, borderStyle: "dashed" }}
        >
          <Text className="text-sm text-gray-500">+ Agregar opción</Text>
        </Pressable>
        <EleccionEnTarjetas
          valor={votacionMultiple ? "multiple" : "unica"}
          onCambiar={(v) => setValue("votacionMultiple", v === "multiple")}
          opciones={[
            { valor: "unica", titulo: "Se elige una", detalle: "Cada voto marca una sola opción." },
            { valor: "multiple", titulo: "Se eligen varias", detalle: "Cada voto puede marcar más de una opción." },
          ]}
        />
      </SeccionDelFormulario>

      <SeccionDelFormulario titulo="Quién vota">
        <EleccionEnTarjetas
          valor={quienVota}
          onCambiar={(v) => setValue("quienVota", v)}
          opciones={[
            {
              valor: "vivienda",
              titulo: "Una vez por vivienda",
              detalle: "Vota el departamento. Quien tiene dos, vota por cada uno.",
            },
            {
              valor: "residente",
              titulo: "Cada residente",
              detalle: "Cada persona con derecho a voto vale 1, viva donde viva.",
            },
          ]}
        />
      </SeccionDelFormulario>

      {quienVota === "vivienda" ? (
        <SeccionDelFormulario titulo="Cómo se cuenta">
          <EleccionEnTarjetas
            valor={comoSeCuenta}
            onCambiar={(v) => setValue("comoSeCuenta", v)}
            opciones={[
              { valor: "igual", titulo: "Un voto igual por vivienda", detalle: "Todos los departamentos valen lo mismo." },
              {
                valor: "indice",
                titulo: "Según el índice de votación",
                detalle: porIndice.detalle,
                deshabilitada: !porIndice.sePuede,
              },
            ]}
          />
        </SeccionDelFormulario>
      ) : null}

      <SeccionDelFormulario titulo="Cuándo se aprueba">
        <EleccionEnTarjetas
          valor={reglaAprobacion}
          onCambiar={(v) => setValue("reglaAprobacion", v, { shouldValidate: false })}
          opciones={[
            { valor: "mayoria", titulo: "Mayoría simple", detalle: "Gana la opción con más votos entre los que votaron." },
            {
              valor: "umbral",
              titulo: "Umbral mínimo",
              detalle: "Hace falta un porcentaje del total, no solo de los que votaron.",
            },
          ]}
        />
        {reglaAprobacion === "umbral" ? (
          <Controller
            control={control}
            name="umbralAprobacion"
            render={({ field, fieldState }) => (
              <View className="gap-1">
                <Input
                  label="Umbral para aprobar, en %"
                  soloCifras
                  value={field.value}
                  onChangeText={(texto) => field.onChange(texto.replace(/[^0-9]/g, ""))}
                  placeholder="Ej. 70"
                  error={fieldState.error?.message}
                />
                <Text className="text-xs leading-4 text-gray-500">
                  {explicarUmbral(quienVota, comoSeCuenta, umbralAprobacion)}
                </Text>
              </View>
            )}
          />
        ) : null}
      </SeccionDelFormulario>

      <SeccionDelFormulario titulo="Resultados y fechas">
        <Controller
          control={control}
          name="ocultarResultados"
          render={({ field }) => (
            <Toggle value={field.value} onChange={field.onChange} labelRight="Ocultar resultados hasta el cierre" />
          )}
        />
        <CampoFecha
          enLinea
          label="Fecha de publicación*"
          value={fechaPublicada ? formatDateInput(fechaPublicada) : ""}
          onChange={(iso) => setValue("fechaPublicada", parseFechaIso(iso), { shouldValidate: true })}
          placeholder="Elegir fecha"
        />
        <CampoFecha
          enLinea
          label="Fecha de finalización"
          value={fechaFinalizacion ? formatDateInput(fechaFinalizacion) : ""}
          onChange={(iso) => setValue("fechaFinalizacion", parseFechaIso(iso), { shouldValidate: true })}
          placeholder="Elegir fecha"
        />
      </SeccionDelFormulario>
    </View>
  );
}
