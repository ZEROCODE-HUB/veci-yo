import type React from "react";
import { useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Cargando,
  CampoPais,
  CampoTelefono,
  Input,
  Select,
} from "@/shared/components";
import {
  MONEDAS,
  ZONAS_HORARIAS,
  monedaDelPais,
  policiaDelPais,
  zonaHorariaDelPais,
} from "@/shared/constants";
import { AdminSectionCard } from "../AdminSectionCard";
import { Text, View } from "react-native";
import { useParametrosDeLaBase } from "@/shared/hooks";
import { crearEsquemaUbicacion } from "../../schemas/ubicacion.schema";
import type { UbicacionFormValues } from "../../types/ubicacion";

export function UbicacionForm({
  initialValues,
  onSubmit,
  guardando = false,
  ayuda,
}: {
  initialValues: UbicacionFormValues;
  onSubmit: (values: UbicacionFormValues) => void;
  /** Deshabilita el boton mientras el guardado esta en curso. */
  guardando?: boolean;
  /**
   * Nota de ayuda bajo el formulario. Se pasa desde fuera porque depende de
   * donde este montado: la pantalla suelta manda a Arquitectura, y dentro de
   * Arquitectura eso seria mandar a donde ya se esta.
   */
  ayuda?: React.ReactNode;
}) {
  // Los largos que se validan son los de la base; sin ellos no se pinta.
  const parametros = useParametrosDeLaBase();
  const esquema = useMemo(
    () =>
      parametros.listo
        ? crearEsquemaUbicacion({
            telefonoMin: parametros.numero("telefono_largo_minimo"),
            telefonoMax: parametros.numero("telefono_largo_maximo"),
            horarioMax: parametros.numero("horario_atencion_largo_maximo"),
          })
        : null,
    [parametros],
  );
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UbicacionFormValues>({
    resolver: esquema ? zodResolver(esquema) : undefined,
    defaultValues: initialValues,
  });
  const codigoPais = watch("codigoPais");
  const telefono = watch("telefono");
  const pais = watch("pais");
  const field = (name: keyof UbicacionFormValues, label: string, type?: "email") => (
    <Controller
      key={name}
      control={control}
      name={name}
      render={({ field: controllerField, fieldState }) => (
        <Input
          label={label}
          value={controllerField.value}
          onChangeText={controllerField.onChange}
          type={type}
        error={fieldState.error?.message}
        />
      )}
    />
  );

  if (!esquema) return <Cargando variante="enLinea" />;

  return (
    <View className="gap-4">
      <AdminSectionCard title="Información del condominio">
        {field("nombre", "Nombre del condominio *")}
        {field("direccion", "Dirección *")}
        <View className="flex-row gap-3">
          <View className="flex-1">{field("ciudad", "Ciudad")}</View>
          {/*
            El pais, de una lista. Era texto libre y lo que se guardaba eran
            **las dos primeras letras de lo que se escribiera**, asi que
            «Estados Unidos» acababa en la base como `ES`, que es España. De
            esta columna dependen el documento que se pide en la puerta, la
            etiqueta del identificador fiscal y los reportes legales.
          */}
          <View className="flex-1">
            <CampoPais
              label="País"
              value={pais}
              error={errors.pais?.message}
              onChange={(codigo) => {
                /*
                  Al cambiar de pais se sugiere su numero de policia, salvo que
                  la administracion haya puesto uno propio (15/10/2026).
                */
                const actual = watch("telefonoPolicia").trim();
                if (actual === "" || actual === policiaDelPais(pais)) {
                  setValue("telefonoPolicia", policiaDelPais(codigo), {
                    shouldValidate: true,
                  });
                }
                // Lo mismo con la moneda y la zona horaria (16/10/2026).
                const moneda = monedaDelPais(codigo);
                if (moneda && watch("moneda") === monedaDelPais(pais)) {
                  setValue("moneda", moneda, { shouldValidate: true });
                }
                const zona = zonaHorariaDelPais(codigo);
                if (zona && watch("zonaHoraria") === zonaHorariaDelPais(pais)) {
                  setValue("zonaHoraria", zona, { shouldValidate: true });
                }
                setValue("pais", codigo, { shouldValidate: true });
              }}
            />
          </View>
        </View>
        {field("ruc", "RUC / Identificación fiscal")}
        {/*
          La moneda y la zona horaria existían en la base y no se podían
          cambiar: la moneda se fijaba al crear el edificio y la zona horaria
          se deducía del país (16/10/2026).
        */}
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Controller
              control={control}
              name="moneda"
              render={({ field: campo, fieldState }) => (
                <Select
                  label="Moneda"
                  value={campo.value}
                  options={MONEDAS.map((m) => ({ value: m.value, label: m.label }))}
                  onChange={(valor) => campo.onChange(String(valor))}
                  error={fieldState.error?.message}
                />
              )}
            />
          </View>
          <View className="flex-1">
            <Controller
              control={control}
              name="zonaHoraria"
              render={({ field: campo, fieldState }) => (
                <Select
                  label="Zona horaria"
                  value={campo.value}
                  options={ZONAS_HORARIAS.map((z) => ({ value: z.value, label: z.label }))}
                  onChange={(valor) => campo.onChange(String(valor))}
                  error={fieldState.error?.message}
                />
              )}
            />
          </View>
        </View>
        {/*
          El telefono con su pais. `condominio.codigo_pais` existe desde el
          primer dia y **nadie la escribia**: el numero se guardaba como texto
          suelto --«+57 601 7561234», con el prefijo dentro-- y asi no se puede
          marcar ni mandar por WhatsApp sin adivinar donde acaba el prefijo.

          Va en su propia fila y no al lado del correo: el campo compuesto
          necesita el ancho, y a media columna el selector de pais se come el
          numero.
        */}
        <CampoTelefono
          label="Teléfono"
          codigoPais={codigoPais}
          onCodigoPaisChange={(codigo) =>
            setValue("codigoPais", codigo, { shouldValidate: true })
          }
          telefono={telefono}
          onTelefonoChange={(numero) =>
            setValue("telefono", numero, { shouldValidate: true })
          }
          error={errors.telefono?.message}
          ayuda="El que ven los vecinos para llamar a la administración."
        />
        {field("email", "Correo electrónico", "email")}
        <Controller
          control={control}
          name="horarioAtencion"
          render={({ field: campo, fieldState }) => (
            <View className="gap-1">
              <Input
                label="Horario de atención"
                value={campo.value}
                onChangeText={campo.onChange}
                placeholder="Ej: Lunes a viernes, 8:00 a 17:00"
                error={fieldState.error?.message}
              />
              <Text className="text-xs text-gray-500">
                El que ven los vecinos en Soporte › Contacto.
              </Text>
            </View>
          )}
        />
        <Controller
          control={control}
          name="telefonoPolicia"
          render={({ field: campo, fieldState }) => (
            <View className="gap-1">
              <Input
                label="Número de la policía"
                value={campo.value}
                onChangeText={campo.onChange}
                soloCifras
                error={fieldState.error?.message}
              />
              <Text className="text-xs text-gray-500">
                {policiaDelPais(pais)
                  ? `El que marca la portería en una emergencia. Sugerido para este país: ${policiaDelPais(pais)}.`
                  : "El que marca la portería en una emergencia."}
              </Text>
            </View>
          )}
        />
        {/*
          `guardando` llegaba de las dos pantallas que usan este
          formulario y no se usaba: el boton no se bloqueaba mientras la
          escritura estaba en curso, asi que pulsarlo dos veces --que es
          lo que se hace cuando nada responde-- mandaba dos peticiones.
        */}
        <Button
          fullWidth
          loading={guardando}
          onPress={() => void handleSubmit(onSubmit)()}
        >
          Guardar configuración
        </Button>
      </AdminSectionCard>
      {Boolean(ayuda) && (
        <AdminSectionCard>
          <Text className="text-sm text-gray-700 text-center leading-6">
            {ayuda}
          </Text>
        </AdminSectionCard>
      )}
    </View>
  );
}
