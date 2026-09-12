import React, { useEffect } from "react";
import { View, Text, ScrollView, TextInput } from "react-native";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Select, Button } from "@/shared/components";
import {
  TORRES_OPCIONES,
  PISOS_OPCIONES,
  DEPTOS_OPCIONES,
  adminList,
} from "@/data/chatMockData";
import { filtrarPersonas } from "../../helpers/chatHelpers";
import { chatNuevoSchema, type ChatNuevoFormData } from "../../schemas";

interface ChatNewFormProps {
  torre: string;
  depto: string;
  piso: string;
  persona: string;
  busquedaPersona: string;
  soloSeguridadAdmin: boolean;
  onTorreChange: (val: any) => void;
  onDeptoChange: (val: any) => void;
  onPisoChange: (val: any) => void;
  onPersonaChange: (val: any) => void;
  onBusquedaChange: (val: string) => void;
  onStartChat: () => void;
}

export function ChatNewForm({
  torre,
  depto,
  piso,
  persona,
  busquedaPersona,
  soloSeguridadAdmin,
  onTorreChange,
  onDeptoChange,
  onPisoChange,
  onPersonaChange,
  onBusquedaChange,
  onStartChat,
}: ChatNewFormProps) {
  const isStaff = torre === "Seguridad" || torre === "Administrador";
  const { setValue, handleSubmit } = useForm<ChatNuevoFormData>({
    resolver: zodResolver(chatNuevoSchema),
    defaultValues: { torre, depto, piso, persona, busquedaPersona },
  });

  useEffect(() => {
    setValue("torre", torre);
    setValue("depto", depto);
    setValue("piso", piso);
    setValue("persona", persona);
    setValue("busquedaPersona", busquedaPersona);
  }, [torre, depto, piso, persona, busquedaPersona, setValue]);

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerClassName="p-4 gap-3"
    >
      <Select
        label="Torre"
        value={torre}
        options={
          soloSeguridadAdmin ? ["Seguridad", "Administrador"] : TORRES_OPCIONES
        }
        onChange={(value) => {
          setValue("torre", String(value));
          onTorreChange(value);
        }}
      />
      {!isStaff && (
        <>
          <Select
            label="Piso"
            value={piso || null}
            options={PISOS_OPCIONES}
            onChange={(value) => {
              setValue("piso", String(value));
              onPisoChange(value);
            }}
            placeholder="Seleccionar piso"
          />
          <Select
            label="Departamento"
            value={depto}
            options={DEPTOS_OPCIONES}
            onChange={(value) => {
              setValue("depto", String(value));
              onDeptoChange(value);
            }}
          />
        </>
      )}
      {!isStaff && (
        <View>
          <Text className="text-sm font-medium text-gray-600 mb-1">
            Buscar persona
          </Text>
          <TextInput
            value={busquedaPersona}
            onChangeText={(value) => {
              setValue("busquedaPersona", value);
              onBusquedaChange(value);
            }}
            placeholder="Escribe el nombre para buscar..."
            className="rounded-xl px-3.5 py-2.5 text-sm text-gray-900"
            style={{
              borderWidth: 1.5,
              borderColor: "#E5E7EB",
              backgroundColor: "#FFFFFF",
            }}
          />
        </View>
      )}
      {torre !== "Seguridad" && torre !== "Administrador" && (
        <Select
          label="Persona"
          value={persona || null}
          options={filtrarPersonas(torre, busquedaPersona)}
          onChange={(value) => {
            setValue("persona", String(value));
            onPersonaChange(value);
          }}
          placeholder={
            busquedaPersona ? "Seleccionar de la lista" : "Seleccionar persona"
          }
        />
      )}
      {torre === "Administrador" && (
        <Select
          label="Persona"
          value={persona}
          options={adminList}
          onChange={(value) => {
            setValue("persona", String(value));
            onPersonaChange(value);
          }}
        />
      )}
      {torre === "Seguridad" && (
        <View className="rounded-xl p-3" style={{ backgroundColor: "#F9FAFB" }}>
          <Text className="text-sm text-center" style={{ color: "#6B7280" }}>
            Chat con <Text className="font-bold">Seguridad</Text> — el mensaje
            será visible para todo el personal de seguridad de turno.
          </Text>
        </View>
      )}
      <Button variant="primary" onPress={handleSubmit(() => onStartChat())}>
        Iniciar chat
      </Button>
    </ScrollView>
  );
}
