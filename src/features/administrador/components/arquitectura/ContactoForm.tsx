import React, { useState } from "react";
import { View } from "react-native";
import { z } from "zod";
import { Button, CampoTelefono, Input, Select } from "@/shared/components";
import { PAIS_POR_DEFECTO } from "@/shared/constants/paises";
import {
  CARGOS_DEL_EQUIPO,
  type ContactoDelCondominio,
  type TipoContacto,
} from "../../services/contactos.repo";

interface Props {
  tipo: TipoContacto;
  /** Vacío: es un alta. */
  inicial?: ContactoDelCondominio;
  guardando: boolean;
  onGuardar: (
    contacto: Omit<ContactoDelCondominio, "id"> & { id?: string },
  ) => void;
  onCancelar: () => void;
}

/** Los datos de una persona del equipo o de una empresa del edificio. */
export function ContactoForm({
  tipo,
  inicial,
  guardando,
  onGuardar,
  onCancelar,
}: Props) {
  const esEquipo = tipo === "equipo";
  const [nombre, setNombre] = useState(inicial?.nombre ?? "");
  const [cargo, setCargo] = useState(inicial?.cargo ?? "");
  const [telefono, setTelefono] = useState(inicial?.telefono ?? "");
  // El país lo pone quien monta el campo, no el campo (regla de `CampoTelefono`).
  const [codigoPais, setCodigoPais] = useState(
    inicial?.codigoPais || PAIS_POR_DEFECTO,
  );
  const [correo, setCorreo] = useState(inicial?.correo ?? "");
  // El correo es opcional, pero si se escribe tiene que ser uno de verdad: se
  // guardaba cualquier texto (Para Claude, 20/10/2026). La base lo exige igual.
  const correoMalo =
    correo.trim() !== "" && !z.string().email().safeParse(correo.trim()).success;

  return (
    <View className="gap-3">
      <Input
        label={esEquipo ? "Nombre completo *" : "Nombre de la empresa *"}
        value={nombre}
        onChangeText={setNombre}
        placeholder={esEquipo ? "Nombre completo" : "Ej: Seguridad Total S.A."}
      />
      {esEquipo ? (
        <Select
          label="Cargo"
          value={cargo || null}
          options={[...CARGOS_DEL_EQUIPO]}
          onChange={(v) => setCargo(String(v))}
          placeholder="Seleccionar cargo"
        />
      ) : null}
      <CampoTelefono
        label="Teléfono"
        codigoPais={codigoPais}
        onCodigoPaisChange={setCodigoPais}
        telefono={telefono}
        onTelefonoChange={setTelefono}
      />
      <Input
        label="Correo"
        value={correo}
        onChangeText={setCorreo}
        placeholder={esEquipo ? "correo@ejemplo.com" : "correo@empresa.com"}
        type="email"
        error={correoMalo ? "Escribe un correo válido, como nombre@dominio.com" : ""}
      />
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Button
            fullWidth
            disabled={guardando || !nombre.trim() || correoMalo}
            onPress={() =>
              onGuardar({
                id: inicial?.id,
                tipo,
                nombre,
                cargo,
                telefono,
                codigoPais,
                correo: correo.trim(),
              })
            }
          >
            {guardando ? "Guardando…" : "Guardar"}
          </Button>
        </View>
        <Button variant="secondary" onPress={onCancelar}>
          Cancelar
        </Button>
      </View>
    </View>
  );
}
