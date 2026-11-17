import { Text, View } from "react-native";
import { Button } from "@/shared/components";
import type { SeleccionDeViviendas } from "../hooks/useSeleccionDeViviendas";
import { DirectorioDepartamentoCard } from "./DirectorioDepartamentoCard";
import type { VehiculoDelDirectorio } from "../services/vehiculos.repo";
import type { DirectorioContactos, Unidad } from "../types/directorio";

/**
 * La pestaña «Departamentos», con la selección de la administración
 * (16/11/2026, cliente: «poder seleccionar masivamente, y poder enviar un
 * mensaje»).
 *
 * «Seleccionar» pone una casilla en cada tarjeta y «Seleccionar todos (N)»
 * marca las que se ven con los filtros de ahora. El botón de enviar va fijo
 * abajo de la pantalla (`BarraDeMensaje`), para que se vea con la lista
 * desplazada.
 */
export function DirectorioDepartamentos({
  unidades,
  seleccion,
  contactosFor,
  depositosDe,
  vehiculosDe,
  onAbrir,
}: {
  /** Las que se ven, ya filtradas. */
  unidades: Unidad[];
  /** Solo para la administración; sin ella, no hay «Seleccionar». */
  seleccion: SeleccionDeViviendas | null;
  contactosFor: (unidad: Unidad) => DirectorioContactos;
  depositosDe: (unidad: Unidad) => string[];
  vehiculosDe: (unidad: Unidad) => VehiculoDelDirectorio[];
  onAbrir: (unidad: Unidad) => void;
}) {
  const seleccionando = Boolean(seleccion?.activa);

  return (
    <View style={{ gap: 12 }}>
      {seleccion && unidades.length > 0 ? (
        <View className="flex-row items-center justify-between" style={{ gap: 8 }}>
          {seleccion.activa ? (
            <>
              <Button key={seleccion.todas ? "quitar" : "todos"} size="sm" variant="ghost" onPress={seleccion.alternarTodas}>
                <Text>
                  {seleccion.todas ? "Quitar todos" : `Seleccionar todos (${unidades.length})`}
                </Text>
              </Button>
              <Button key="cancelar" size="sm" variant="ghost" onPress={seleccion.terminar}>
                <Text>Cancelar</Text>
              </Button>
            </>
          ) : (
            <Button key="seleccionar" size="sm" variant="ghost" onPress={seleccion.empezar}>
              <Text>Seleccionar</Text>
            </Button>
          )}
        </View>
      ) : null}
      {unidades.map((item) => (
        <DirectorioDepartamentoCard
          key={String(item.id)}
          item={item}
          contactos={contactosFor(item)}
          depositos={depositosDe(item)}
          vehiculos={vehiculosDe(item)}
          marcada={seleccionando ? seleccion?.estaMarcada(item) : undefined}
          onPress={() => (seleccion && seleccionando ? seleccion.alternar(item) : onAbrir(item))}
        />
      ))}
    </View>
  );
}
