import { View, Text, ScrollView, Pressable } from "react-native";
import { theme } from "@/config";
import { ModuloBloqueado, SearchBar } from "@/shared/components";
import { ESTANCIA_TERMINADA, HELP } from "@/shared/content/helpContent";
import { useAuthStore } from "@/stores";
import { CarruselCuotas, ReconocimientoPopup } from "../components";
import { DepartamentoHonorCard } from "../components/cuadroHonor";
import { useCuadroHonor } from "../hooks/useCuadroHonor";
import { useNavegacion } from "@/shared/hooks";

export function CuadroHonorScreen() {
  const navigation = useNavegacion();
  /*
    Quien tuvo estancia y se le acabo llega aqui igual que quien no tiene
    ninguna propiedad --los dos se quedan sin roles-- pero no es lo mismo: a
    alguien que se alojo tres noches en un edificio ajeno no se le pide que
    registre una propiedad ahi.
  */
  const estanciaTerminada = useAuthStore((s) => s.estanciaTerminada);
  const bloqueo = estanciaTerminada ? ESTANCIA_TERMINADA : HELP.ranking.bloqueo;
  const {
    search,
    setSearch,
    filtered,
    cuotas,
    candidatos,
    puedeVerPagina,
    sinPropiedades,
    puedeParticipar,
    showReconocimientoPopup,
    destinatario,
    handleOpenReconocimiento,
    cerrarReconocimiento,
  } = useCuadroHonor();

  return (
    <View className="flex-1 bg-gray-50">
      {sinPropiedades ? (
        <View className="flex-1 bg-gray-50 p-4">
          <ModuloBloqueado
            titulo={bloqueo.titulo}
            descripcion={bloqueo.descripcion}
            motivo={bloqueo.motivo}
            accion={bloqueo.accion}
            onAgregar={
              estanciaTerminada
                ? undefined
                : () => navigation.navigate("AdministradorUbicacion")
            }
          />
        </View>
      ) : puedeVerPagina ? (
        <ScrollView className="flex-1" contentContainerClassName="p-4 gap-3.5">
          <CarruselCuotas historial={cuotas} />

          {puedeParticipar && (
            <Pressable
              onPress={() => handleOpenReconocimiento()}
              className="w-full py-3.5 rounded-full bg-secondary items-center justify-center flex-row gap-2"
            >
              <Text style={{ fontSize: 18 }}>🎁</Text>
              <Text className="text-base font-semibold text-white">
                Dar reconocimiento
              </Text>
            </Pressable>
          )}

          <View
            className="bg-white rounded-xl p-3"
            style={{
              shadowColor: theme.colors.shadow,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            <SearchBar value={search} onChange={setSearch} />
          </View>

          {filtered.map((departamento) => (
            <DepartamentoHonorCard
              key={departamento.id}
              departamento={departamento}
              puedeParticipar={puedeParticipar}
              onReconocer={handleOpenReconocimiento}
            />
          ))}

          <View className="h-6" />
        </ScrollView>
      ) : (
        <View className="flex-1 items-center justify-center p-4">
          <Text className="text-base text-gray-500 text-center">
            El Guardia de Seguridad no tiene acceso al Cuadro de Honor.
          </Text>
        </View>
      )}

      <ReconocimientoPopup
        visible={showReconocimientoPopup && puedeParticipar}
        onClose={cerrarReconocimiento}
        destinatarioPreseleccionado={destinatario}
        candidatos={candidatos}
      />
    </View>
  );
}
