import React from "react";
import { Text, View } from "react-native";
import { Select } from "@/shared/components";
import { ESTILO_DE_TARJETA } from "./gruposDeResidentes";

interface Persona {
  /** La membresía. */
  id: string;
  nombre: string;
}

interface Props {
  personas: Persona[];
  /** Quién es hoy el contacto principal (administrador primario). */
  principalId: string | null;
  /** Quién atiende a los huéspedes (anfitrión primario). */
  huespedesId: string | null;
  /** Solo si el edificio permite renta corta: sin huéspedes no hace falta. */
  conHuespedes: boolean;
  onPrincipal: (id: string) => void;
  onHuespedes: (id: string) => void;
}

/**
 * Los dos contactos de la vivienda, en un solo sitio (25/11/2026, el cliente:
 * «hazlo sencillo»). Eran dos casillas, «Anfitrión primario» y «Administrador
 * primario», repetidas en cada tarjeta y con una frase debajo que nadie
 * entendía. Ahora son dos preguntas con su respuesta: a quién llama la
 * administración y quién atiende a los huéspedes.
 */
export function ContactosPrincipales({
  personas,
  principalId,
  huespedesId,
  conHuespedes,
  onPrincipal,
  onHuespedes,
}: Props) {
  if (personas.length === 0) return null;
  const opciones = personas.map((p) => ({ value: p.id, label: p.nombre }));
  return (
    <View className="rounded-2xl p-4 gap-3" style={ESTILO_DE_TARJETA}>
      <Text className="text-base font-bold text-gray-900">Contactos de la vivienda</Text>
      <Select
        label="Contacto principal"
        explicacion="A quién busca la administración del edificio cuando necesita hablar con la vivienda. Sale como contacto de la vivienda en el directorio."
        value={principalId}
        options={opciones}
        placeholder="Nadie elegido: por ahora, el propietario"
        onChange={(v) => {
          if (String(v) !== principalId) onPrincipal(String(v));
        }}
      />
      {conHuespedes ? (
        <Select
          label="Atiende a los huéspedes"
          explicacion="Quien recibe a los huéspedes de la renta corta y a quien llaman si necesitan algo. Puede ser un familiar o una empresa de Airbnb que hayas invitado como anfitrión."
          value={huespedesId}
          options={opciones}
          placeholder="Nadie elegido: por ahora, el propietario"
          onChange={(v) => {
            if (String(v) !== huespedesId) onHuespedes(String(v));
          }}
        />
      ) : null}
    </View>
  );
}
