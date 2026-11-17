import { theme } from "@/config";
import { Text, View } from "react-native";
import {
  formatearCantidad,
  fraseDeAvance,
  type ResultadoDeEncuesta,
} from "../../helpers/resultadoDeEncuesta";
import { BarraDeResultado } from "./BarraDeResultado";
import { BarrasPorOpcion } from "./BarrasPorOpcion";

/** «Una vez por vivienda · según el índice · umbral del 70 %». */
function reglasEnUnaLinea(r: ResultadoDeEncuesta): string {
  const quien = r.quienVota === "residente" ? "Cada residente vota" : "Una vez por vivienda";
  const como = r.quienVota === "vivienda" ? (r.comoSeCuenta === "indice" ? "según el índice" : "voto igual") : null;
  const cuando =
    r.regla === "umbral"
      ? `se aprueba con el ${formatearCantidad(r.umbralPorcentaje ?? 0)} % del total`
      : "mayoría simple";
  return [quien, como, cuando].filter(Boolean).join(" · ");
}

/**
 * El resultado de una encuesta, como lo calcula la base (17/11/2026): una
 * frase que lo dice todo --«De 240 departamentos: 40 sí, 30 no. Aún no se
 * aprueba: faltan 128 para llegar al 70 %.»-- y la barra con la marca del
 * umbral (o una barra por opción si no es de Sí/No).
 */
export function ResultadoDeEncuestaCard({
  resultado,
  enCurso,
}: {
  resultado: ResultadoDeEncuesta;
  /** Sigue abierta: «hasta ahora» y no «final». */
  enCurso: boolean;
}) {
  const aprobada = resultado.visibles && resultado.aprobada === true;
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
      <View className="gap-0.5">
        <Text className="text-lg font-bold text-gray-900">
          {enCurso ? "Cómo va la votación" : "Resultado"}
        </Text>
        <Text className="text-xs text-gray-500">{reglasEnUnaLinea(resultado)}</Text>
      </View>

      <Text
        className="text-sm leading-5"
        style={{ color: aprobada ? theme.colors.badgeGreenText : theme.colors.text }}
      >
        {fraseDeAvance(resultado)}
      </Text>

      {resultado.visibles ? (
        resultado.esSiNo ? (
          <BarraDeResultado resultado={resultado} />
        ) : (
          <BarrasPorOpcion resultado={resultado} />
        )
      ) : null}

      {resultado.sinContar > 0 ? (
        <Text className="text-xs text-gray-400">
          {`${resultado.sinContar} ${resultado.sinContar === 1 ? "voto" : "votos"} sin vivienda (portería o administración) no cuentan para aprobar.`}
        </Text>
      ) : null}
    </View>
  );
}
