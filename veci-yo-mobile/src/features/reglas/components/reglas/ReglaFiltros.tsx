import { Ionicons } from "@expo/vector-icons";
import { Pressable, View } from "react-native";
import {
  SearchBar as BarraBusqueda,
  Select as Selector,
} from "@/shared/components";

export function ReglaFiltros({
  open,
  search,
  onSearch,
  onToggle,
  tower,
  department,
  floor,
  onTower,
  onDepartment,
  onFloor,
  torres,
  departamentos,
  pisos,
}: {
  open: boolean;
  search: string;
  onSearch: (value: string) => void;
  onToggle: () => void;
  tower: string;
  department: string;
  floor: string;
  onTower: (value: string) => void;
  onDepartment: (value: string) => void;
  onFloor: (value: string) => void;
  torres: string[];
  departamentos: string[];
  pisos: string[];
}) {
  return (
    <View className="rounded-2xl bg-white p-3 gap-3">
      <BarraBusqueda
        value={search}
        onChange={onSearch}
        placeholder="Búsqueda de propiedad renta corta"
      />
      <View className="items-center">
        <Pressable
          onPress={onToggle}
          className="h-11 w-11 items-center justify-center rounded-full bg-gray-100"
        >
          <Ionicons
            name={open ? "chevron-up" : "chevron-down"}
            size={24}
            color="#6B7280"
          />
        </Pressable>
      </View>
      {open && (
        <View className="gap-2.5">
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Selector
                label="Torre"
                value={tower}
                options={torres}
                onChange={(value) => onTower(String(value))}
                placeholder="Torre"
              />
            </View>
            <View className="flex-1">
              <Selector
                label="Departamento"
                value={department}
                options={departamentos}
                onChange={(value) => onDepartment(String(value))}
                placeholder="Departamento"
              />
            </View>
          </View>
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Selector
                label="Piso"
                value={floor}
                options={pisos}
                onChange={(value) => onFloor(String(value))}
                placeholder="Piso"
              />
            </View>
            <View className="flex-1" />
          </View>
        </View>
      )}
    </View>
  );
}
