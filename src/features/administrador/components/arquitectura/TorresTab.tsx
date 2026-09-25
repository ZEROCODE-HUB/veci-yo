import { theme } from "@/config";
import { useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Button, Modal } from "@/shared/components";
import { Pressable, Text, View } from "react-native";
import type { Torre } from "@/stores/admin-store";
import { emptyTower, towerToForm, type TowerFormValues } from "../../types";
import { TorreFormModal } from "./TorreFormModal";

type Props = {
  towers: Torre[];
  /** Para contar cuantas viviendas tiene cada torre. */
  unidades: Array<{ torreNumero?: number | null }>;
  onSelect: (tower: Torre) => void;
  onCreate: (form: TowerFormValues) => void;
  onUpdate: (tower: Torre) => void;
  onDelete: (tower: Torre) => void;
};

export function TorresTab({
  towers,
  unidades,
  onSelect,
  onCreate,
  onUpdate,
  onDelete,
}: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Torre | null>(null);
  const [menu, setMenu] = useState<Torre | null>(null);
  const [deleting, setDeleting] = useState<Torre | null>(null);

  /** Las de la torre que se va a borrar, con la misma cuenta que la tarjeta. */
  const viviendasDeLaTorre = deleting
    ? unidades.filter((u) => u.torreNumero === deleting.numero).length
    : 0;
  const initial = useMemo(() => towerToForm(editing), [editing]);

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const save = (form: TowerFormValues) => {
    if (editing) onUpdate({ ...editing, ...form });
    else onCreate(form);
    closeForm();
  };

  const nextNumber = towers.length
    ? Math.max(...towers.map((tower) => tower.numero)) + 1
    : 1;

  return (
    <View className="gap-3">
      <View className="items-end">
        <Button
          size="sm"
          onPress={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          + Nueva torre
        </Button>
      </View>
      {towers.map((tower) => (
        <Pressable
          key={tower.id}
          onPress={() => onSelect(tower)}
          className="rounded-2xl bg-white border border-green-500 p-4"
          style={{ elevation: 2 }}
        >
          <View className="flex-row gap-3">
            <View className="flex-1 gap-1">
              <TowerValue
                label="Nombre"
                value={tower.nombre || `Torre N${tower.numero}`}
                strong
              />
              {/*
                Aqui habia "Depto" y "Penthouse" leyendo `tower.depto` y
                `tower.penthouse`, que **no existen**: ni son columnas de
                `torre` ni las produce el mapeo, asi que las dos mostraban
                "-" en todas las torres desde siempre. La cantidad de
                viviendas si es un dato, y se cuenta con las unidades que ya
                estan cargadas. "Penthouse" no lo dice nada del modelo, asi
                que se retira en vez de inventarlo.
              */}
              <TowerValue
                label="Viviendas"
                value={String(
                  unidades.filter((u) => u.torreNumero === tower.numero)
                    .length,
                )}
              />
              <TowerValue label="Pisos" value={tower.pisos} />
              <TowerValue label="Sótanos" value={tower.sotanos} />
            </View>
            <View className="flex-1 gap-1">
              <TowerValue label="Cocheras V." value={tower.cocherasVisitas} />
              <TowerValue label="Coch. priv." value={tower.cocherasPrivadas} />
              <TowerValue label="Almacén" value={tower.almacenPrivados} />
              <TowerValue label="Ent. veh." value={tower.entradasVehiculares} />
              <TowerValue label="Ent. peat." value={tower.entradasPeatonales} />
            </View>
            {/*
              Solo lleva un icono: sin nombre, un lector de pantalla anuncia
              "boton" una vez por torre y no dice de cual. Lleva el nombre
              dentro porque es lo unico que las distingue.
            */}
            <Pressable
              onPress={(event) => {
                event.stopPropagation();
                setMenu(tower);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Opciones de ${tower.nombre}`}
              className="p-2"
            >
              <Ionicons name="ellipsis-vertical" size={20} color={theme.colors.textSecondary} />
            </Pressable>
          </View>
        </Pressable>
      ))}
      <Modal
        visible={!!menu}
        onClose={() => setMenu(null)}
        title="Opciones de torre"
      >
        <View className="gap-3">
          <Button
            fullWidth
            onPress={() => {
              setEditing(menu);
              setMenu(null);
              setFormOpen(true);
            }}
          >
            Editar
          </Button>
          <Button
            variant="danger"
            fullWidth
            onPress={() => {
              setDeleting(menu);
              setMenu(null);
            }}
          >
            Eliminar
          </Button>
        </View>
      </Modal>
      <TorreFormModal
        visible={formOpen}
        editing={editing}
        nextNumber={nextNumber}
        initial={initial}
        onClose={closeForm}
        onSave={save}
      />
      {/*
        La misma cuenta que pinta la tarjeta, no otra: dos formas de contar lo
        mismo es el defecto que mas veces ha salido en este proyecto.
      */}
      <Modal
        visible={!!deleting}
        onClose={() => setDeleting(null)}
        title="Eliminar torre"
      >
        <View className="gap-4">
          {/*
            Dice QUE torre y CUANTAS viviendas se lleva por delante. Antes
            decia "esta torre" --sin nombre-- y no mencionaba las viviendas:
            el borrado es logico y no arrastra nada, asi que las de dentro se
            quedan vivas colgando de una torre que ya no aparece en ninguna
            pantalla. No estan borradas: estan escondidas.
            Comprobado en `administracion-borrar-torre.test.ts`.
          */}
          <Text className="text-base text-gray-900 text-center">
            ¿Seguro que deseas eliminar {deleting?.nombre ?? "esta torre"}?
          </Text>
          {viviendasDeLaTorre > 0 && (
            <Text className="text-sm text-center text-red-700">
              Tiene {viviendasDeLaTorre}{" "}
              {viviendasDeLaTorre === 1 ? "vivienda" : "viviendas"}. Al
              eliminarla dejan de aparecer en Arquitectura, pero no se borran.
            </Text>
          )}
          <Button
            variant="danger"
            fullWidth
            onPress={() => {
              if (deleting) onDelete(deleting);
              setDeleting(null);
            }}
          >
            Eliminar
          </Button>
        </View>
      </Modal>
    </View>
  );
}

function TowerValue({
  label,
  value,
  strong = false,
}: {
  label: string;
  value?: string;
  strong?: boolean;
}) {
  return (
    <Text className="text-sm text-gray-500">
      {label}:{" "}
      <Text
        className={strong ? "font-semibold text-gray-900" : "text-gray-900"}
      >
        {value || "-"}
      </Text>
    </Text>
  );
}
