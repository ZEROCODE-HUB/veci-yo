import type React from "react";
import { useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input } from "@/shared/components";
import { AdminSectionCard } from "../AdminSectionCard";
import { Text, View } from "react-native";
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
  const esquema = useMemo(() => crearEsquemaUbicacion(), []);
  const { control, handleSubmit } = useForm<UbicacionFormValues>({
    resolver: zodResolver(esquema),
    defaultValues: initialValues,
  });
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
          Teléfono, correo y horario de atención salieron de aquí (13/11/2026,
          decidido con el cliente): el contacto que ven los vecinos es el de la
          cuenta del administrador (`contacto_de_la_administracion`), que se
          cambia en su perfil. El horario se retiró de la app.
        */}
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
