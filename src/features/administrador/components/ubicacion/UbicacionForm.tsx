import type React from "react";
import { useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Cargando, CampoTelefono, Input } from "@/shared/components";
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
        {/*
          Ciudad, país, moneda y zona horaria salieron de aquí (13/11/2026,
          pedido del cliente): los pone quien opera la plataforma al dar de
          alta el edificio, y la base completa la moneda y la zona horaria a
          partir del país (`condominio_completar_segun_su_pais`).
        */}
        {field("ruc", "RUC / Identificación fiscal")}
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
        {/*
          El número de la policía salió de aquí (13/11/2026, pedido del
          cliente): la portería marca el del país del edificio.
        */}
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
