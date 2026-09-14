import { View, Text, ScrollView, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ModuloBloqueado, SearchBar } from "@/shared/components";
import { HELP } from "@/shared/content/helpContent";
import { CarruselCuotas, ReconocimientoPopup } from "../components";
import { DepartamentoHonorCard } from "../components/cuadroHonor";
import { useCuadroHonor } from "../hooks/useCuadroHonor";

export function CuadroHonorScreen() {
  const navigation = useNavigation<any>();
  const {
    search,
    setSearch,
    filtered,
    insignias,
    cuotas,
    puedeVerPagina,
    sinPropiedades,
    puedeParticipar,
    showReconocimientoPopup,
    reconocimientoDestinatario,
    handleOpenReconocimiento,
    cerrarReconocimiento,
  } = useCuadroHonor();

  return (
    <View className="flex-1 bg-gray-50">
      {sinPropiedades ? (
        <View className="flex-1 bg-gray-50 p-4">
          <ModuloBloqueado
            titulo={HELP.ranking.bloqueo.titulo}
            descripcion={HELP.ranking.bloqueo.descripcion}
            motivo={HELP.ranking.bloqueo.motivo}
            accion={HELP.ranking.bloqueo.accion}
            onAgregar={() => navigation.navigate("AdministradorUbicacion")}
          />
        </View>
      ) : puedeVerPagina ? (
        <ScrollView className="flex-1" contentContainerClassName="p-4 gap-3.5">
          <CarruselCuotas historial={cuotas} />

          {puedeParticipar && (
            <Pressable
              onPress={() => handleOpenReconocimiento("")}
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
              shadowColor: "#000",
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
              insignias={insignias}
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
        destinatarioPreseleccionado={reconocimientoDestinatario}
      />
    </View>
  );
}
