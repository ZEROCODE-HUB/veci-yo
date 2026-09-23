import { ActivityIndicator, Text, View } from "react-native";
import { theme } from "@/config";
import { UbicacionForm } from "../ubicacion";
import { useAdministradorUbicacion } from "../../hooks";

/**
 * Los datos del condominio, dentro de Arquitectura.
 *
 * Antes esto era un formulario de maqueta: nacía vacío —con "Las Barranqueras"
 * y "3 torres" escritos a mano como valores por defecto, no leídos de ningún
 * sitio— y su botón "Guardar informacion" llamaba a
 * `handleSubmit(() => undefined)`. Validaba y no hacía nada. Quien rellenara
 * los datos del edificio y pulsara guardar los perdía sin un solo aviso.
 *
 * Lo llamativo es que el formulario bueno ya existía —`UbicacionForm` con
 * `useAdministradorUbicacion`, que carga y guarda de verdad— pero solo se
 * llegaba a él desde el Cuadro de Honor, que no es donde nadie lo buscaría.
 * Dos pantallas para el mismo dato, y la alcanzable era la muerta.
 *
 * Aquí se usa la que funciona. Las secciones que tenía la maqueta y no tienen
 * dónde guardarse —foto del condominio, sótanos y porterías compartidas,
 * ingresos vehiculares y peatonales, equipo administrativo, empresas de
 * seguridad y limpieza— se retiran en vez de seguir prometiendo: ninguna tiene
 * columna, y dejarlas dentro de un formulario que ahora sí guarda haría creer
 * que se guardaron. Quedan anotadas como pendientes de modelo.
 */
export function CondominioTab() {
  const { valores, cargando, guardar, guardando } = useAdministradorUbicacion();

  if (cargando) {
    return (
      <View className="items-center justify-center py-10">
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!valores) {
    return (
      <View className="items-center justify-center py-10 px-6">
        <Text className="text-base text-gray-500 text-center">
          No encontramos los datos de tu condominio.
        </Text>
      </View>
    );
  }

  return (
    <UbicacionForm
      initialValues={valores}
      onSubmit={guardar}
      guardando={guardando}
      ayuda="Con el condominio configurado, pasá a la pestaña Torres para registrar torres, pisos y unidades."
    />
  );
}
