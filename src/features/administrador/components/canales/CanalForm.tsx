import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { theme } from "@/config";
import { Button, Input } from "@/shared/components";
import {
  ROLES_DE_EDIFICIO,
  ROLES_DE_VIVIENDA,
  type Canal,
} from "../../services/canales.repo";
import type { Database } from "@/shared/types/database.types";

type RolUnidad = Database["public"]["Enums"]["rol_unidad"];
type RolCondominio = Database["public"]["Enums"]["rol_condominio"];

/**
 * El nombre de un canal y los roles que entran en él.
 *
 * Lo pidió el cliente el 02/10/2026: «canales con nombre y roles, editables».
 * Hasta hoy los roles de un grupo vivían dentro de una función de la base, así
 * que cambiarlos era escribir una migración.
 *
 * Los roles se marcan, no se escriben: son los dos enums que ya existen en el
 * esquema --`rol_unidad` para quien vive en una vivienda y `rol_condominio`
 * para la administración y la portería-- y una lista escrita a mano se
 * desincronizaría de ellos.
 */
export function CanalForm({
  editando,
  guardando,
  onGuardar,
  onCancelar,
}: {
  /** Null para uno nuevo. */
  editando: Canal | null;
  guardando: boolean;
  onGuardar: (params: {
    nombre: string;
    rolesVivienda: RolUnidad[];
    rolesEdificio: RolCondominio[];
    canalId?: string;
  }) => void;
  onCancelar: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [vivienda, setVivienda] = useState<RolUnidad[]>([]);
  const [edificio, setEdificio] = useState<RolCondominio[]>([]);

  useEffect(() => {
    setNombre(editando?.nombre ?? "");
    setVivienda(editando?.rolesVivienda ?? []);
    setEdificio(editando?.rolesEdificio ?? []);
  }, [editando]);

  const sinRoles = vivienda.length === 0 && edificio.length === 0;

  return (
    <View className="gap-4">
      <Input
        label="Nombre del canal"
        value={nombre}
        onChangeText={setNombre}
        placeholder="Residentes, Obras, Asamblea…"
      />

      <View>
        <Text className="text-sm font-medium text-gray-500">Quién entra</Text>
        <Text className="mt-1 text-xs leading-5 text-gray-400">
          Se entra por el rol, no uno a uno: quien llega al edificio con ese rol
          aparece en el canal, y quien se va deja de aparecer.
        </Text>

        <Text className="mt-3 text-xs font-semibold text-gray-500">
          En una vivienda
        </Text>
        <Casillas
          opciones={ROLES_DE_VIVIENDA}
          puestos={vivienda}
          onAlternar={(clave) =>
            setVivienda((previo) =>
              previo.includes(clave)
                ? previo.filter((r) => r !== clave)
                : [...previo, clave],
            )
          }
        />

        <Text className="mt-3 text-xs font-semibold text-gray-500">
          En el edificio
        </Text>
        <Casillas
          opciones={ROLES_DE_EDIFICIO}
          puestos={edificio}
          onAlternar={(clave) =>
            setEdificio((previo) =>
              previo.includes(clave)
                ? previo.filter((r) => r !== clave)
                : [...previo, clave],
            )
          }
        />
      </View>

      {sinRoles && (
        /*
          Dicho por delante y no como error después de guardar. La base lo
          rechaza igual --«El canal necesita al menos un rol»-- pero un canal
          sin nadie dentro no se ve ni para arreglarlo, así que conviene no
          llegar ahí.
        */
        <Text className="text-xs" style={{ color: theme.colors.danger }}>
          Un canal sin ningún rol no lo vería nadie. Marca al menos uno.
        </Text>
      )}

      <View className="flex-row gap-2">
        <View className="flex-1">
          <Button variant="secondary" fullWidth onPress={onCancelar}>
            Cancelar
          </Button>
        </View>
        <View className="flex-1">
          <Button
            variant="primary"
            fullWidth
            disabled={guardando || sinRoles || nombre.trim() === ""}
            onPress={() =>
              onGuardar({
                nombre: nombre.trim(),
                rolesVivienda: vivienda,
                rolesEdificio: edificio,
                canalId: editando?.id,
              })
            }
          >
            {guardando ? "Guardando…" : editando ? "Guardar" : "Crear canal"}
          </Button>
        </View>
      </View>
    </View>
  );
}

function Casillas<T extends string>({
  opciones,
  puestos,
  onAlternar,
}: {
  opciones: { clave: T; etiqueta: string }[];
  puestos: T[];
  onAlternar: (clave: T) => void;
}) {
  return (
    <View className="mt-2 flex-row flex-wrap gap-2">
      {opciones.map((opcion) => {
        const puesto = puestos.includes(opcion.clave);
        return (
          <Pressable
            key={opcion.clave}
            accessibilityRole="checkbox"
            accessibilityLabel={opcion.etiqueta}
            /*
              Los dos: react-native-web no traduce `accessibilityState` a
              ningún atributo del DOM. Está documentado en `Checkbox.tsx` y ya
              mordió cuatro veces en este proyecto.
            */
            aria-checked={puesto}
            accessibilityState={{ checked: puesto }}
            onPress={() => onAlternar(opcion.clave)}
            className="rounded-full px-3 py-1.5"
            style={{
              borderWidth: puesto ? 2 : 1,
              borderColor: puesto
                ? theme.colors.primary
                : theme.colors.borderLight,
              backgroundColor: puesto
                ? theme.colors.primaryLight
                : theme.colors.bgCard,
            }}
          >
            <Text
              className="text-xs font-medium"
              style={{
                color: puesto ? theme.colors.primary : theme.colors.textSecondary,
              }}
            >
              {puesto ? "✓ " : ""}
              {opcion.etiqueta}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
