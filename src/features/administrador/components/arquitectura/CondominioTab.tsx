import { useFieldArray, useForm, Controller } from "react-hook-form";
import { ImageUploadCard, Button, Input, Select } from "@/shared/components";
import { AdminSectionCard } from "../AdminSectionCard";
import { EmpresaContactoSection } from "./EmpresaContactoSection";
import { condominioSchema } from "../../schemas";
import { defaultCondominio, type CondominioFormValues } from "../../types";
import { zodResolver } from "@hookform/resolvers/zod";
import { Text, View } from "react-native";

export function CondominioTab() {
  const { control, handleSubmit } = useForm<CondominioFormValues>({
    resolver: zodResolver(condominioSchema),
    defaultValues: defaultCondominio,
  });
  const { fields, append, remove } = useFieldArray({ control, name: "team" });

  return (
    <View className="gap-4">
      <AdminSectionCard title="Informacion del Condominio">
        <Controller
          control={control}
          name="nombre"
          render={({ field }) => (
            <Input
              label="Nombre del condominio"
              value={field.value}
              onChangeText={field.onChange}
              placeholder="Ej: Las Barranqueras"
            />
          )}
        />
        <Controller
          control={control}
          name="direccion"
          render={({ field }) => (
            <Input
              label="Direccion"
              value={field.value}
              onChangeText={field.onChange}
              placeholder="Ej: Av. Principal 123"
            />
          )}
        />
        <Controller
          control={control}
          name="ruc"
          render={({ field }) => (
            <Input
              label="RUC"
              value={field.value}
              onChangeText={field.onChange}
              placeholder="Ej: 1234567890001"
            />
          )}
        />
        <Controller
          control={control}
          name="foto"
          render={({ field }) => (
            <ImageUploadCard
              label="Foto del condominio"
              value={field.value}
              onChange={field.onChange}
              placeholder="Tocar para agregar foto"
              height={120}
            />
          )}
        />
      </AdminSectionCard>

      <AdminSectionCard title="Estructura General">
        <Controller
          control={control}
          name="numTorres"
          render={({ field }) => (
            <Input
              label="Numero de torres"
              value={field.value}
              onChangeText={field.onChange}
              placeholder="Ej: 3"
              type="numeric"
            />
          )}
        />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Controller
              control={control}
              name="sotanosCompartidos"
              render={({ field }) => (
                <Select
                  label="Sotanos compartidos"
                  value={field.value}
                  options={["Si", "No"]}
                  placeholder="Seleccionar"
                  onChange={field.onChange}
                />
              )}
            />
          </View>
          <View className="flex-1">
            <Controller
              control={control}
              name="porteriaCompartida"
              render={({ field }) => (
                <Select
                  label="Porteria compartida"
                  value={field.value}
                  options={["Si", "No", "Ambas"]}
                  placeholder="Seleccionar"
                  onChange={field.onChange}
                />
              )}
            />
          </View>
        </View>
        <Controller
          control={control}
          name="ingresosVehiculares"
          render={({ field }) => (
            <Input
              label="Ingresos vehiculares (ubicacion)"
              value={field.value}
              onChangeText={field.onChange}
              placeholder="Ej: Norte, Sur"
            />
          )}
        />
        <Controller
          control={control}
          name="ingresosPeatonales"
          render={({ field }) => (
            <Input
              label="Ingresos peatonales (ubicacion)"
              value={field.value}
              onChangeText={field.onChange}
              placeholder="Ej: Principal, Lateral"
            />
          )}
        />
      </AdminSectionCard>

      <AdminSectionCard>
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-bold text-gray-900">
            Equipo Administrativo
          </Text>
          <Button
            variant="ghost"
            size="sm"
            onPress={() =>
              append({
                nombre: "",
                cargo: "",
                telefono: "",
                correo: "",
              })
            }
          >
            + Agregar
          </Button>
        </View>
        {fields.map((member, index) => (
          <View
            key={member.id}
            className="rounded-xl border border-gray-200 bg-gray-50 p-3 gap-3"
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-gray-900">
                Miembro {index + 1}
              </Text>
              {fields.length > 1 && (
                <Button variant="ghost" size="sm" onPress={() => remove(index)}>
                  Eliminar
                </Button>
              )}
            </View>
            <Controller
              control={control}
              name={`team.${index}.nombre`}
              render={({ field }) => (
                <Input
                  label="Nombre completo"
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder="Nombre completo"
                />
              )}
            />
            <Controller
              control={control}
              name={`team.${index}.cargo`}
              render={({ field }) => (
                <Select
                  label="Cargo"
                  value={field.value}
                  options={[
                    "Administrador",
                    "Co-Administrador",
                    "Secretaria",
                    "Presidente Junta",
                    "Miembro Consejo",
                    "Otro",
                  ]}
                  placeholder="Seleccionar cargo"
                  onChange={field.onChange}
                />
              )}
            />
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Controller
                  control={control}
                  name={`team.${index}.telefono`}
                  render={({ field }) => (
                    <Input
                      label="Telefono"
                      value={field.value}
                      onChangeText={field.onChange}
                      placeholder="+593 999999999"
                    />
                  )}
                />
              </View>
              <View className="flex-1">
                <Controller
                  control={control}
                  name={`team.${index}.correo`}
                  render={({ field }) => (
                    <Input
                      label="Correo"
                      value={field.value}
                      onChangeText={field.onChange}
                      placeholder="correo@ejemplo.com"
                      type="email"
                    />
                  )}
                />
              </View>
            </View>
          </View>
        ))}
      </AdminSectionCard>

      <EmpresaContactoSection
        control={control}
        name="security"
        title="Empresa de Seguridad"
      />
      <EmpresaContactoSection
        control={control}
        name="cleaning"
        title="Empresa de Limpieza"
      />
      <Button fullWidth onPress={() => void handleSubmit(() => undefined)()}>
        Guardar informacion
      </Button>
    </View>
  );
}
