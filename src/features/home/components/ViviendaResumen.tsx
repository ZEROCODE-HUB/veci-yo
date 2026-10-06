import { theme } from "@/config";
import { View, Text, Image, Pressable } from "react-native";
import { InfoButton } from "@/shared/components/ui/InfoButton";
import { ModuloBloqueado } from "@/shared/components/ui/ModuloEstado";
import { Cargando } from "@/shared/components/ui/Cargando";
import { ESTANCIA_TERMINADA, HELP } from "@/shared/content/helpContent";
import { useAuthStore } from "@/stores";
import { useViviendaResumen } from "../hooks/useViviendaResumen";
import { navigateToRoute } from "@/navigation/helpers/navigation.helpers";
import { useNavegacion } from "@/shared/hooks";

const iconVivienda = require("@/assets/icons/home/vivienda.png");

export function ViviendaResumen() {
  const navigation = useNavegacion();
  const {
    cargando,
    configOpen,
    popupKey,
    rolActivo,
    esAdministrador,
    esGuardia,
    sinPropiedades,
    ubicacionActiva,
    visibleModules,
    opcionesConfiguracion,
    handleConfiguracion,
    abrirModulo,
    alternarPopup,
    cerrarConfiguracion,
    navegarConfiguracion,
  } = useViviendaResumen();
  const estanciaTerminada = useAuthStore((s) => s.estanciaTerminada);
  const bloqueo = estanciaTerminada
    ? ESTANCIA_TERMINADA
    : HELP.propiedades.bloqueo;

  /*
    Mientras las viviendas no han llegado **no se enseña nada de viviendas**.
    Antes se enseñaba lo que hubiera en el almacén, y lo que había eran dos
    casas inventadas --«Casa Amorcito», «Casa Mamá»--: un parpadeo con la casa
    de otro, y si la carga fallaba, ahí se quedaba.

    No es lo mismo que `sinPropiedades`, que es «ya llegó y no tienes ninguna»
    y se explica con su cartel. Una lista vacía porque no hay y una vacía
    porque no ha llegado se ven igual y significan lo contrario.
  */
  if (cargando) return <Cargando texto="tus viviendas" />;

  return (
    <View className="px-4 gap-4 pt-5">
      <View
        className="bg-white rounded-xl p-5 items-center gap-2.5"
        style={{ boxShadow: theme.shadows.card }}
      >
        <View
          className="items-center justify-center overflow-hidden"
          style={{
            width: 112,
            height: 112,
            borderRadius: 56,
            borderWidth: 3,
            borderColor: theme.colors.primary,
            backgroundColor: theme.colors.bgVivienda,
          }}
        >
          <Image
            source={iconVivienda}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        </View>
        <Text className="text-xl font-bold text-gray-900">
          {ubicacionActiva?.alias || "Vivienda"}
        </Text>
        <View
          className="flex-row items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-gray-200"
          style={{ backgroundColor: theme.colors.bgCampo }}
        >
          <Text style={{ fontSize: 12 }}>
            {rolActivo === "huesped-temporal" ? "🏨" : "🏠"}
          </Text>
          <Text className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
            {rolActivo === "huesped-temporal" ? "Alojamiento" : "Vivienda"}
          </Text>
        </View>
        {rolActivo !== "huesped-temporal" && !esGuardia && (
          <Pressable
            onPress={sinPropiedades ? undefined : handleConfiguracion}
            className={`w-full items-center py-3 ${sinPropiedades ? "bg-gray-200" : "bg-primary"} ${!esAdministrador || !configOpen ? "rounded-full" : ""}`}
            style={
              !sinPropiedades && esAdministrador && configOpen
                ? { borderTopLeftRadius: 9999, borderTopRightRadius: 9999 }
                : undefined
            }
          >
            <Text
              className={`text-sm font-semibold ${sinPropiedades ? "text-gray-400" : "text-gray-900"}`}
            >
              Configuración
            </Text>
            {!sinPropiedades && esAdministrador && (
              <Text
                className="absolute font-bold right-4 top-4 text-xs text-gray-900"
                style={{
                  transform: [
                    { translateY: -6 },
                    { rotate: configOpen ? "180deg" : "0deg" },
                  ],
                }}
              >
                ↓
              </Text>
            )}
          </Pressable>
        )}

        {esAdministrador && configOpen && (
          <View
            className="w-full -mt-3 overflow-hidden"
            style={{
              borderBottomLeftRadius: 30,
              borderBottomRightRadius: 30,
            }}
          >
            {opcionesConfiguracion.map((opcion) => (
              <Pressable
                key={opcion.key}
                onPress={() => {
                  cerrarConfiguracion();
                  navegarConfiguracion(opcion.screen);
                }}
                className="w-full py-3.5 px-4 bg-primary border-t border-black/5"
              >
                <Text
                  className="text-sm font-bold text-gray-900"
                  style={{ letterSpacing: 0.56 }}
                >
                  {opcion.label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/*
        Quien tuvo estancia y se le acabo cae aqui igual que quien no tiene
        ninguna propiedad --los dos se quedan sin roles-- pero no es lo mismo:
        a alguien que se alojo tres noches en un edificio ajeno no se le pide
        que registre una propiedad ahi.
      */}
      {sinPropiedades && (
        <ModuloBloqueado
          titulo={bloqueo.titulo}
          descripcion={bloqueo.descripcion}
          motivo={bloqueo.motivo}
          accion={bloqueo.accion}
          onAgregar={
            estanciaTerminada
              ? undefined
              : () => navigateToRoute(navigation, "InquilinoLiderUbicacion")
          }
        />
      )}
      <View className="flex-row flex-wrap gap-3">
        {visibleModules.map((modulo) => {
          const help = HELP[modulo.helpKey];
          return (
            <Pressable
              key={modulo.id}
              onPress={
                sinPropiedades
                  ? undefined
                  : () => abrirModulo(modulo.screen, modulo.helpKey)
              }
              className="bg-white rounded-xl p-3.5 items-center justify-center relative"
              style={{
                width: "48%",
                aspectRatio: 1,
                boxShadow: theme.shadows.card,
                opacity: sinPropiedades ? 0.5 : 1,
              }}
            >
              {help && !sinPropiedades && (
                <View
                  style={{ position: "absolute", top: 8, right: 8, zIndex: 10 }}
                >
                  <InfoButton
                    variant="info"
                    titulo={help.info.titulo}
                    descripcion={help.info.descripcion}
                    bullets={help.info.bullets}
                    ejemplo={""}
                    isOpen={popupKey === modulo.helpKey}
                    onOpenChange={(open: boolean) =>
                      alternarPopup(modulo.helpKey, open)
                    }
                  />
                </View>
              )}
              <Image
                source={modulo.icon}
                style={{ width: 88, height: 88 }}
                resizeMode="contain"
              />
              <Text
                className="text-sm font-medium text-gray-500 text-center mt-1.5"
                numberOfLines={2}
              >
                {modulo.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
