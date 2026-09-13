import { View, Text, Image, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { InfoButton } from "@/shared/components/ui/InfoButton";
import {
  IncognitoBanner,
  ModuloBloqueado,
} from "@/shared/components/ui/ModuloEstado";
import { HELP, INCOGNITO_BANNER } from "@/shared/content/helpContent";
import { useViviendaResumen } from "../hooks/useViviendaResumen";
import { navigateToRoute } from "@/navigation/helpers/navigation.helpers";

const iconVivienda = require("@/assets/icons/home/vivienda.png");

export function ViviendaResumen() {
  const navigation = useNavigation<any>();
  const {
    configOpen,
    popupKey,
    rolActivo,
    esIncognito,
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

  return (
    <View className="px-4 gap-4 pt-5">
      <View
        className="bg-white rounded-xl p-5 items-center gap-2.5"
        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
      >
        <View
          className="items-center justify-center overflow-hidden"
          style={{
            width: 112,
            height: 112,
            borderRadius: 56,
            borderWidth: 3,
            borderColor: "#F5B800",
            backgroundColor: "#E8E4DC",
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
          style={{ backgroundColor: "#F8FAFC" }}
        >
          <Text style={{ fontSize: 12 }}>🏠</Text>
          <Text className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
            Vivienda
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

      {esIncognito && (
        <IncognitoBanner
          titulo={INCOGNITO_BANNER.titulo}
          descripcion={INCOGNITO_BANNER.descripcion}
          help={HELP.propiedades.info}
        />
      )}

      {sinPropiedades && (
        <ModuloBloqueado
          titulo={HELP.propiedades.bloqueo.titulo}
          descripcion={HELP.propiedades.bloqueo.descripcion}
          motivo={HELP.propiedades.bloqueo.motivo}
          accion={HELP.propiedades.bloqueo.accion}
          onAgregar={() =>
            navigateToRoute(navigation, "InquilinoLiderUbicacion")
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
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                opacity: sinPropiedades ? 0.5 : 1,
              }}
            >
              {help && esIncognito && !sinPropiedades && (
                <View
                  style={{ position: "absolute", top: 8, right: 8, zIndex: 10 }}
                >
                  <InfoButton
                    variant="info"
                    titulo={help.info.titulo}
                    descripcion={help.info.descripcion}
                    bullets={help.info.bullets}
                    ejemplo={help.info.ejemplo}
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
