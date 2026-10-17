import { theme } from "@/config";
import { View, Text } from "react-native";
import {
  telefonoParaMostrar,
  type ContactoDelCondominio,
} from "@/features/administrador/services/contactos.repo";

const GRUPOS = [
  { tipo: "equipo", titulo: "Equipo administrativo" },
  { tipo: "empresa_seguridad", titulo: "Empresa de seguridad" },
  { tipo: "empresa_limpieza", titulo: "Empresa de limpieza" },
] as const;

/**
 * El equipo administrativo y las empresas del edificio, debajo del contacto de
 * la administración (16/10/2026). Los carga la administración en Arquitectura
 * → Condominio. Un grupo sin nadie no se pinta.
 */
export function ContactosDelEdificio({
  contactos,
}: {
  contactos: ContactoDelCondominio[];
}) {
  return (
    <>
      {GRUPOS.map(({ tipo, titulo }) => {
        const delGrupo = contactos.filter((c) => c.tipo === tipo);
        if (delGrupo.length === 0) return null;
        return (
          <View key={tipo} className="gap-2">
            <Text className="text-sm font-bold text-gray-900">{titulo}</Text>
            {delGrupo.map((c) => (
              <View
                key={c.id}
                className="rounded-2xl px-4 py-3 gap-0.5"
                style={{
                  backgroundColor: theme.colors.bgCard,
                  borderWidth: 1,
                  borderColor: theme.colors.borderLight,
                }}
              >
                <Text className="text-base font-semibold text-gray-900">
                  {c.nombre}
                  {c.cargo ? (
                    <Text className="text-sm font-normal text-gray-500">
                      {` · ${c.cargo}`}
                    </Text>
                  ) : null}
                </Text>
                {c.telefono ? (
                  <Text className="text-sm text-gray-700">
                    {telefonoParaMostrar(c)}
                  </Text>
                ) : null}
                {c.correo ? (
                  <Text className="text-sm text-gray-700">{c.correo}</Text>
                ) : null}
              </View>
            ))}
          </View>
        );
      })}
    </>
  );
}
