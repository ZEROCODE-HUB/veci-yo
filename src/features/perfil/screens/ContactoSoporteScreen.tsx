import React from "react";
import { ScrollView, Text } from "react-native";
import {
  ContactoSoporteCard,
  ContactosDelEdificio,
} from "../components/soporte";
import { useContactoSoporte } from "../hooks/useSoporte";

export function ContactoSoporteScreen() {
  const { contacto, contactos, cargando } = useContactoSoporte();
  const hayContacto = Boolean(
    contacto &&
    (contacto.telefono ||
      contacto.email ||
      contacto.ubicacion ||
      contacto.horarios),
  );

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ padding: 16, gap: 16 }}
    >
      {contacto && hayContacto ? (
        <ContactoSoporteCard contacto={contacto} />
      ) : null}
      <ContactosDelEdificio contactos={contactos} />
      {!cargando && !hayContacto && contactos.length === 0 ? (
        <Text className="text-center text-gray-400 py-8">
          La administración todavía no cargó sus datos de contacto.
        </Text>
      ) : null}
    </ScrollView>
  );
}
