import React from "react";
import { ScrollView, Text } from "react-native";
import {
  ContactoSoporteCard,
  ContactosDelEdificio,
} from "../components/soporte";
import { SegunLaCarga } from "@/shared/components";
import { useContactoSoporte } from "../hooks/useSoporte";

export function ContactoSoporteScreen() {
  const { contacto, contactos, carga } = useContactoSoporte();
  const hayContacto = Boolean(
    contacto &&
    (contacto.nombre ||
      contacto.telefono ||
      contacto.email ||
      contacto.ubicacion),
  );

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ padding: 16, gap: 16 }}
    >
      {/* Si falla, no es «la administración todavía no cargó» (13/11/2026). */}
      <SegunLaCarga estado={carga} texto="los contactos" forma="tarjetas" cuantos={2} enLinea>
        {contacto && hayContacto ? (
          <ContactoSoporteCard contacto={contacto} />
        ) : null}
        <ContactosDelEdificio contactos={contactos} />
        {!hayContacto && contactos.length === 0 ? (
          <Text className="text-center text-gray-400 py-8">
            La administración todavía no cargó sus datos de contacto.
          </Text>
        ) : null}
      </SegunLaCarga>
    </ScrollView>
  );
}
