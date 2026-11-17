import { theme } from "@/config";
import { Text, View } from "react-native";
import { medirParticipacion, type ResultadoDeEncuesta } from "../../helpers/resultadoDeEncuesta";
import type { ParticipacionDeTorre } from "../../services/anuncios.repo";

/**
 * Para la administración (17/11/2026): cuántos votaron, qué porcentaje,
 * cuántos faltan y cómo va cada torre. Son solo cuántos: no dice qué votó
 * nadie, así que vale también en una encuesta secreta.
 */
export function MetricasDeParticipacion({
  resultado,
  porTorre,
}: {
  resultado: ResultadoDeEncuesta;
  porTorre: ParticipacionDeTorre[];
}) {
  const p = medirParticipacion(resultado);
  const quienes = resultado.quienVota === "residente" ? "residentes" : "departamentos";
  const torres = porTorre.filter((t) => t.electores > 0);

  return (
    <View
      className="gap-3 rounded-2xl p-4"
      style={{
        backgroundColor: theme.colors.bgCard,
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      <Text className="text-lg font-bold text-gray-900">Participación</Text>
      <View className="flex-row gap-2">
        <Dato valor={`${p.porcentaje} %`} texto="participación" />
        <Dato valor={`${p.votaron} de ${p.de}`} texto={`${quienes} votaron`} />
        <Dato valor={String(p.faltan)} texto="faltan por votar" />
      </View>

      {torres.length > 1 ? (
        <View className="gap-2">
          <Text className="text-sm font-semibold text-gray-700">Por torre</Text>
          {torres.map((t) => {
            const pct = t.electores > 0 ? Math.round((t.votaron / t.electores) * 100) : 0;
            return (
              <View key={t.torreId} className="gap-1">
                <View className="flex-row justify-between">
                  <Text className="text-sm text-gray-700">{t.torre}</Text>
                  <Text className="text-sm text-gray-500">{`${t.votaron} de ${t.electores} · ${pct} %`}</Text>
                </View>
                <View className="h-2 w-full rounded-full" style={{ backgroundColor: theme.colors.borderLight }}>
                  <View
                    className="h-2 rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: theme.colors.secondary }}
                  />
                </View>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function Dato({ valor, texto }: { valor: string; texto: string }) {
  return (
    <View className="flex-1 items-center rounded-xl p-2" style={{ backgroundColor: theme.colors.bgMuted }}>
      <Text className="text-base font-bold text-gray-900">{valor}</Text>
      <Text className="text-2xs text-center text-gray-500">{texto}</Text>
    </View>
  );
}
