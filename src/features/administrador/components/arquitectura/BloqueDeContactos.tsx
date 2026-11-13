import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { theme } from "@/config";
import { Cargando } from "@/shared/components";
import { AdminSectionCard } from "../AdminSectionCard";
import { ContactoForm } from "./ContactoForm";
import {
  telefonoParaMostrar,
  type ContactoDelCondominio,
  type TipoContacto,
} from "../../services/contactos.repo";

interface Props {
  titulo: string;
  tipo: TipoContacto;
  contactos: ContactoDelCondominio[];
  textoAgregar: string;
  onGuardar: (
    contacto: Omit<ContactoDelCondominio, "id"> & { id?: string },
  ) => Promise<void>;
  onRetirar: (id: string) => void;
  /** El id del contacto que se está quitando. */
  retirando?: string;
}

/**
 * Un grupo de contactos del edificio --el equipo administrativo, la empresa de
 * seguridad, la de limpieza--, con su lista y su alta.
 */
export function BloqueDeContactos({
  titulo,
  tipo,
  contactos,
  textoAgregar,
  onGuardar,
  onRetirar,
  retirando,
}: Props) {
  // `null`: nada abierto. `"nuevo"`: el alta. Un id: corrigiendo ese.
  const [abierto, setAbierto] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const guardar = async (
    c: Omit<ContactoDelCondominio, "id"> & { id?: string },
  ) => {
    setGuardando(true);
    try {
      await onGuardar(c);
      setAbierto(null);
    } catch {
      // El motivo ya salió en pantalla; el formulario se queda con lo escrito.
    } finally {
      setGuardando(false);
    }
  };

  return (
    <AdminSectionCard title={titulo}>
      {contactos.length === 0 && abierto !== "nuevo" ? (
        <Text className="text-xs text-gray-500 text-center">
          Todavía no hay ninguno.
        </Text>
      ) : null}
      {contactos.map((c) =>
        abierto === c.id ? (
          <ContactoForm
            key={c.id}
            tipo={tipo}
            inicial={c}
            guardando={guardando}
            onGuardar={(datos) => void guardar(datos)}
            onCancelar={() => setAbierto(null)}
          />
        ) : (
          <View
            key={c.id}
            className="rounded-xl p-3 gap-0.5"
            style={{ backgroundColor: theme.colors.bgMuted }}
          >
            <Text className="text-sm font-semibold text-gray-900">
              {c.nombre}
              {c.cargo ? (
                <Text className="font-normal text-gray-500">{` · ${c.cargo}`}</Text>
              ) : null}
            </Text>
            {c.telefono ? (
              <Text className="text-xs text-gray-600">
                {telefonoParaMostrar(c)}
              </Text>
            ) : null}
            {c.correo ? (
              <Text className="text-xs text-gray-600">{c.correo}</Text>
            ) : null}
            <View className="flex-row gap-4 mt-1">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Editar ${c.nombre}`}
                onPress={() => setAbierto(c.id)}
              >
                <Text
                  className="text-xs font-semibold"
                  style={{ color: theme.colors.secondary }}
                >
                  Editar
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Quitar ${c.nombre}`}
                // Un segundo toque mientras se quita mandaba otro borrado.
                disabled={retirando === c.id}
                aria-busy={retirando === c.id}
                accessibilityState={{ disabled: retirando === c.id, busy: retirando === c.id }}
                onPress={() => onRetirar(c.id)}
                className="flex-row items-center gap-1"
              >
                {retirando === c.id ? <Cargando variante="control" texto="quitar" /> : null}
                <Text
                  className="text-xs font-semibold"
                  style={{ color: theme.colors.danger }}
                >
                  Quitar
                </Text>
              </Pressable>
            </View>
          </View>
        ),
      )}
      {abierto === "nuevo" ? (
        <ContactoForm
          tipo={tipo}
          guardando={guardando}
          onGuardar={(datos) => void guardar(datos)}
          onCancelar={() => setAbierto(null)}
        />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={textoAgregar}
          onPress={() => setAbierto("nuevo")}
          className="py-2 items-center"
        >
          <Text
            className="text-sm font-semibold"
            style={{ color: theme.colors.secondary }}
          >
            {`+ ${textoAgregar}`}
          </Text>
        </Pressable>
      )}
    </AdminSectionCard>
  );
}
