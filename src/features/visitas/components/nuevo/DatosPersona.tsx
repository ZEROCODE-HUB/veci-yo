import React from "react";
import { theme } from "@/config";
import { View, Text } from "react-native";
import { Input, Select } from "@/shared/components";
import { PROFESIONES, TIPOS_ID } from "../../constants";

interface Props {
  esProfesional: boolean;
  esGuardia: boolean;
  tipoSeleccionado: string | null;
  nombre: string;
  setNombre: (v: string) => void;
  tipoId: string;
  setTipoId: (v: string) => void;
  identificacion: string;
  setIdentificacion: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  telefono: string;
  setTelefono: (v: string) => void;
  profesion: string;
  setProfesion: (v: string) => void;
  profesionOtro: string;
  setProfesionOtro: (v: string) => void;
}

/**
 * Datos de quien visita.
 *
 * Venian precargados con los de una persona inventada ("Mariano Lazarto", con
 * cedula, correo y telefono), de modo que quien registraba una visita partia de
 * esos valores.
 */
export function DatosPersona({
  esProfesional,
  esGuardia,
  tipoSeleccionado,
  nombre,
  setNombre,
  tipoId,
  setTipoId,
  identificacion,
  setIdentificacion,
  email,
  setEmail,
  telefono,
  setTelefono,
  profesion,
  setProfesion,
  profesionOtro,
  setProfesionOtro,
}: Props) {
  return (
    <>
      {/* Person info */}
      <View
        className="rounded-2xl p-4 gap-3"
        style={{
          backgroundColor: theme.colors.bgMuted,
          boxShadow: theme.shadows.card,
        }}
      >
        <Text className="text-sm font-semibold text-gray-900">
          Nombre y Apellido
        </Text>
        <Input
          value={nombre}
          onChangeText={setNombre}
          placeholder="Nombre completo"
        />

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Select
              label="Tipo"
              value={tipoId}
              options={[...TIPOS_ID]}
              onChange={(v) => setTipoId(String(v))}
            />
          </View>
          <View className="flex-1">
            <Input
              label={`Identificación${esProfesional ? " *" : ""}`}
              value={identificacion}
              onChangeText={setIdentificacion}
              placeholder={esProfesional ? "Obligatorio" : "Opcional"}
              type="numeric"
            />
          </View>
        </View>

        <View
          className="rounded-xl p-3"
          style={{ backgroundColor: theme.colors.secondaryLight }}
        >
          <Text className="text-xs text-gray-500 leading-5">
            Recuerda indicar a tu invitado que debe presentar su documento
            (cédula, pasaporte o DNI) en portería al ingresar al edificio.
          </Text>
        </View>

        {!esGuardia && (
          <Input
            label="Correo electrónico (opcional)"
            value={email}
            onChangeText={setEmail}
            placeholder="email@ejemplo.com"
            type="email"
          />
        )}

        {(!esGuardia || tipoSeleccionado === "temporal") && (
          <Input
            label={`Teléfono${tipoSeleccionado === "temporal" && esGuardia ? " *" : " (opcional)"}`}
            value={telefono}
            onChangeText={setTelefono}
            placeholder={
              tipoSeleccionado === "temporal" && esGuardia
                ? "Obligatorio"
                : "Opcional"
            }
            type="numeric"
          />
        )}

        {esProfesional && (
          <View className="gap-2">
            <Select
              label="Profesión"
              value={profesion || null}
              options={PROFESIONES[tipoSeleccionado ?? ""] ?? []}
              onChange={(v) => setProfesion(String(v))}
              placeholder="Seleccione profesión"
            />
            {(profesion === "Otros" || profesion === "otros") && (
              <Input
                value={profesionOtro}
                onChangeText={setProfesionOtro}
                placeholder="Especifique la profesión"
              />
            )}
          </View>
        )}
      </View>
    </>
  );
}
