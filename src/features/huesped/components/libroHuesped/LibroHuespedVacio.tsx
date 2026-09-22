import { theme } from "@/config";
import { View, Text } from "react-native";
import { formatDateIso } from "@/shared/utils";

interface Props {
  /**
   * Primer dia de la estancia, si todavia no ha llegado. Cambia por completo
   * el mensaje: el libro no esta vacio, es que aun no toca verlo.
   */
  disponibleDesde?: string | null;
}

/**
 * El libro sin contenido.
 *
 * Hay dos motivos distintos para que llegue vacio y decir el equivocado tiene
 * consecuencias: si a alguien que todavia no ha llegado se le dice que "el
 * propietario aun no ha cargado la informacion" —y se le sugiere que lo
 * contacte con urgencia—, se le hace perseguir a su anfitrion por algo que
 * esta perfectamente cargado y que vera el dia de entrada.
 */
export function LibroHuespedVacio({ disponibleDesde }: Props = {}) {
  if (disponibleDesde) return <LibroTodaviaNo desde={disponibleDesde} />;

  return (
    <View
      className="items-center py-8 px-5"
      style={{
        backgroundColor: "#fff",
        borderRadius: 20,
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      <Text style={{ fontSize: 48, marginBottom: 12 }}>📖</Text>
      <Text className="text-lg font-bold text-gray-900">
        Tu Guestbook aún está vacío
      </Text>
      <Text
        className="text-sm text-gray-500 mt-2 text-center leading-6"
        style={{ maxWidth: 320 }}
      >
        El propietario aún no ha cargado la información del alojamiento.
        Cuando lo haga, aquí encontrarás el Wi-Fi, códigos de acceso,
        instrucciones y recomendaciones para que tu estadía sea perfecta.
      </Text>
      <View
        className="mt-3.5 rounded-full px-3 py-1.5"
        style={{ backgroundColor: theme.colors.bgMuted }}
      >
        <Text className="text-xs text-gray-500 text-center">
          💡 Consejo: contacta al anfitrión si necesitas la información con
          urgencia
        </Text>
      </View>
    </View>
  );
}

function LibroTodaviaNo({ desde }: { desde: string }) {
  return (
    <View
      className="items-center py-8 px-5"
      style={{
        backgroundColor: "#fff",
        borderRadius: 20,
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      <Text style={{ fontSize: 48, marginBottom: 12 }}>🗝️</Text>
      <Text className="text-lg font-bold text-gray-900 text-center">
        Las instrucciones de entrada llegan el {formatDateIso(desde)}
      </Text>
      <Text
        className="text-sm text-gray-500 mt-2 text-center leading-6"
        style={{ maxWidth: 320 }}
      >
        El anfitrión ya dejó preparado el Wi-Fi y cómo entrar a la vivienda.
        Por seguridad se muestran el día que comienza tu estadía.
      </Text>
      <View
        className="mt-3.5 rounded-full px-3 py-1.5"
        style={{ backgroundColor: theme.colors.bgMuted }}
      >
        <Text className="text-xs text-gray-500 text-center">
          💬 Si llegas antes o necesitas algo, escríbele por el chat de la
          vivienda
        </Text>
      </View>
    </View>
  );
}
