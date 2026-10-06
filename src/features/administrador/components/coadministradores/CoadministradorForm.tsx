import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, CampoTelefono, Input, Toggle } from "@/shared/components";
import { Text, View } from "react-native";
import type { Coadministrador } from "@/shared/types";
import { coadministradorSchema } from "../../schemas/coadministradores.schema";
import {
  PERMISOS_COADMIN,
  permisosCoadministradorIniciales,
  type CoadministradorFormValues,
} from "../../types/coadministradores";
import { PAIS_POR_DEFECTO } from "@/shared/constants";
export function CoadministradorForm({
  editing,
  onSave,
}: {
  editing: Coadministrador | null;
  onSave: (value: CoadministradorFormValues) => void;
}) {
  /*
    Memorizado sobre `editing`: se construia en cada render, asi que el efecto
    que rellena el formulario no podia depender de el sin resetear lo que la
    persona estuviera escribiendo. Depender de `editing` a secas funcionaba, y
    dejaba la dependencia diciendo menos de lo que el efecto usa.
  */
  const initial = useMemo<CoadministradorFormValues>(
    () => ({
      nombre: editing?.nombre || "",
      apellido: editing?.apellido || "",
      correo: editing?.correo || "",
      celular: editing?.celular || "",
      codigoPais: editing?.codigoPais || PAIS_POR_DEFECTO,
      permisos: {
        ...permisosCoadministradorIniciales(),
        ...(editing?.permisos || {}),
      },
    }),
    [editing],
  );
  const { control, handleSubmit, reset, setValue, watch } = useForm<CoadministradorFormValues>({
    resolver: zodResolver(coadministradorSchema),
    defaultValues: initial,
  });
  useEffect(() => reset(initial), [initial, reset]);
  return (
    <View className="gap-3">
      <Controller
        control={control}
        name="nombre"
        render={({ field, fieldState }) => (
          <Input
            label="Nombre *"
            placeholder="Nombre"
            value={field.value}
            onChangeText={field.onChange}
          error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="apellido"
        render={({ field, fieldState }) => (
          <Input
            label="Apellido"
            placeholder="Apellido"
            value={field.value}
            onChangeText={field.onChange}
          error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="correo"
        render={({ field, fieldState }) => (
          <Input
            label="Correo electrónico *"
            placeholder="correo@ejemplo.com"
            type="email"
            value={field.value}
            onChangeText={field.onChange}
          error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="celular"
        render={({ fieldState }) => (
          /*
            Con su pais. El marcador de ejemplo decia «+593» --Ecuador-- de
            cuando el prototipo se copio de otro sitio, y el numero se guardaba
            con el prefijo dentro, que es lo que no se puede volver a separar.
          */
          <CampoTelefono
            label="Celular"
            codigoPais={watch("codigoPais")}
            onCodigoPaisChange={(codigo) =>
              setValue("codigoPais", codigo, { shouldValidate: true })
            }
            telefono={watch("celular")}
            onTelefonoChange={(numero) =>
              setValue("celular", numero, { shouldValidate: true })
            }
            /*
              El aviso se retira: desde el 05/10/2026 el numero **viaja con la
              invitacion** y la base lo copia a la membresia al aceptarse. El
              aviso decia la verdad mientras se perdia, y seguir enseñandolo
              seria la otra mitad del mismo defecto.
            */
            ayuda={
              editing
                ? undefined
                : "Se guarda al aceptar la invitación."
            }
          error={fieldState.error?.message}
          />
        )}
      />
      <View className="rounded-xl border border-gray-200 bg-gray-50 p-3 gap-2">
        <Text className="text-sm font-bold text-gray-900">Permisos</Text>
        <Text className="text-xs leading-4 text-gray-500">
          Activa o desactiva cada acceso. Los de visualización son solo lectura;
          los de gestión permiten crear y editar.
        </Text>
        {PERMISOS_COADMIN.map(([key, label, description]) => (
          <View
            key={key}
            className="flex-row items-start justify-between gap-3 border-t border-gray-200 py-2"
          >
            <View className="flex-1">
              <Text className="text-sm font-semibold text-gray-900">
                {label}
              </Text>
              <Text className="mt-0.5 text-xs leading-4 text-gray-500">
                {description}
              </Text>
            </View>
            <Controller
              control={control}
              name={`permisos.${key}`}
              render={({ field }) => (
                <Toggle value={!!field.value} onChange={field.onChange} />
              )}
            />
          </View>
        ))}
      </View>
      <Button fullWidth onPress={() => void handleSubmit(onSave)()}>
        {editing ? "Guardar cambios" : "Agregar coadministrador"}
      </Button>
    </View>
  );
}
