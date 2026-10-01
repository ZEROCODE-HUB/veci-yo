import { View, ScrollView, Text } from "react-native";
import { useAuthStore } from "@/stores";
import { useUbicacionStore } from "@/stores/ubicacion-store";
import { UbicacionCard, UbicacionIntroduccion } from "../components/ubicacion";

/*
  Esta pantalla tenia tres controles --«+ Agregar ubicacion», un lapiz y una
  papelera-- y los tres escribian en un almacen de memoria, nunca en la base.
  El formulario de agregar pedia distrito, urbanizacion, condominio, correo de
  la administracion y una foto del edificio: dar de alta un condominio entero,
  que es justo lo que un vecino no hace nunca. Los condominios los crea la
  administracion y uno entra a uno por invitacion.

  Queda la lista, que si es de verdad: `sesion.ts` la arma con las viviendas de
  las que uno es miembro, y es donde alguien con casa en dos edificios cambia
  de una a otra.
*/
export function AdministracionUbicacionScreen() {
  const rolActivo = useAuthStore((estado) => estado.rolActivo);
  const ubicaciones = useUbicacionStore((estado) => estado.ubicaciones);
  const toggleFavoritoUbicacion = useUbicacionStore(
    (estado) => estado.toggleFavoritoUbicacion,
  );
  const esGuardia = rolActivo === "guardia";

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" contentContainerClassName="p-4 gap-4">
        <UbicacionIntroduccion />

        {ubicaciones.map((ubicacion) => (
          <UbicacionCard
            key={ubicacion.id}
            ubicacion={ubicacion}
            esGuardia={esGuardia}
            onFavorito={toggleFavoritoUbicacion}
          />
        ))}

        {/*
          Sin el boton de agregar, quien no tiene ninguna vivienda llegaba a una
          pantalla en blanco. Se le dice que es lo que falta y quien lo hace, en
          vez de ofrecerle un formulario que no le corresponde.
        */}
        {ubicaciones.length === 0 && (
          <View className="bg-white rounded-xl p-4 gap-2">
            <Text className="text-base font-semibold text-gray-900">
              Todavía no tienes ninguna vivienda
            </Text>
            <Text className="text-sm text-gray-500 leading-5">
              Las viviendas las da de alta la administración de cada edificio.
              Cuando te inviten a una, aparecerá aquí y podrás cambiar entre
              ellas desde el nombre que sale arriba.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
