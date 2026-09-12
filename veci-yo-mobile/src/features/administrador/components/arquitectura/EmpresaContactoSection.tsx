import React from "react";
import { Controller, type Control } from "react-hook-form";
import { View } from "react-native";
import { Input } from "@/shared/components";
import { AdminSectionCard } from "../AdminSectionCard";
import type { CondominioFormValues } from "../../types";

type Props = {
  control: Control<CondominioFormValues>;
  name: "security" | "cleaning";
  title: string;
};

export function EmpresaContactoSection({ control, name, title }: Props) {
  return (
    <AdminSectionCard title={title}>
      <Controller
        control={control}
        name={`${name}.nombre`}
        render={({ field }) => (
          <Input
            label="Nombre de la empresa"
            value={field.value}
            onChangeText={field.onChange}
            placeholder="Ej: Seguridad Total S.A."
          />
        )}
      />
      <ViewRow>
        <View className="flex-1">
          <Controller
            control={control}
            name={`${name}.telefono`}
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
            name={`${name}.correo`}
            render={({ field }) => (
              <Input
                label="Correo"
                value={field.value}
                onChangeText={field.onChange}
                placeholder="correo@empresa.com"
                type="email"
              />
            )}
          />
        </View>
      </ViewRow>
    </AdminSectionCard>
  );
}

function ViewRow({ children }: { children: React.ReactNode }) {
  return <View className="flex-row gap-3">{children}</View>;
}
