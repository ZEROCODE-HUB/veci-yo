import { Text, View } from "react-native";
import { theme } from "@/config";
import { Toggle, Cargando } from "@/shared/components";
import { useAvisos } from "../../hooks/useAvisos";

/**
 * Por dónde quiere cada quien que le avisen de cada cosa.
 *
 * Lo pidió el cliente el 02/10/2026: «WhatsApp configurable por residente y
 * por tipo de aviso». Y estaba en el alcance del proyecto desde el principio:
 * el KT nombra «integración WhatsApp» entre las de notificaciones, marcada como
 * no verificada en código. No lo estaba: no había nada.
 *
 * **El correo y el WhatsApp todavía no salen**, y lo dice la pantalla. Falta
 * una cuenta de WhatsApp Business API y un SMTP propio, y ninguno existe. Lo
 * que sí funciona es la campana: `notificar_unidad` pregunta antes de insertar,
 * así que apagar un motivo lo apaga de verdad.
 *
 * Decirlo en la pantalla es deliberado. Un interruptor que anuncia lo que no
 * hace es el defecto más repetido de este proyecto; uno que avisa de lo que
 * falta es una promesa honesta.
 */
export function AvisosPorDonde() {
  const { avisos, cargando, guardar } = useAvisos();

  if (cargando) {
    return (
      <Cargando variante="enLinea" />
    );
  }

  return (
    <View className="gap-3">
      <Text className="text-xs leading-5 text-gray-500">
        Elige por dónde quieres que te avisemos de cada cosa.
      </Text>

      <View
        className="flex-row gap-2.5 p-3 rounded-xl"
        style={{ backgroundColor: theme.colors.warningLight }}
      >
        <Text style={{ fontSize: 16 }}>🚧</Text>
        <Text className="flex-1 text-xs text-gray-900" style={{ lineHeight: 18 }}>
          El correo y el WhatsApp aún no se envían: falta conectar el servidor
          de correo y la cuenta de WhatsApp. Lo que elijas queda guardado y se
          respetará en cuanto estén.
        </Text>
      </View>

      {avisos.map((aviso) => (
        <View
          key={aviso.motivo}
          className="gap-2 pt-3"
          style={{
            borderTopWidth: 1,
            borderTopColor: theme.colors.borderLight,
          }}
        >
          <Text className="text-sm font-medium text-gray-900">
            {aviso.emoji} {aviso.etiqueta}
          </Text>

          {aviso.configurable ? (
            <View className="gap-1.5">
              <Fila
                etiqueta="En la aplicación"
                nombre={`${aviso.etiqueta}: en la aplicación`}
                valor={aviso.porApp}
                onChange={(v) => guardar({ ...aviso, porApp: v })}
              />
              <Fila
                etiqueta="Por correo"
                nombre={`${aviso.etiqueta}: por correo`}
                valor={aviso.porCorreo}
                onChange={(v) => guardar({ ...aviso, porCorreo: v })}
              />
              <Fila
                etiqueta="Por WhatsApp"
                nombre={`${aviso.etiqueta}: por WhatsApp`}
                valor={aviso.porWhatsapp}
                onChange={(v) => guardar({ ...aviso, porWhatsapp: v })}
              />
            </View>
          ) : (
            /*
              La alarma de pánico. No se apaga, y se dice por qué en vez de
              enseñar un interruptor desactivado que nadie entiende.
            */
            <Text className="text-xs text-gray-500">
              Siempre activa, por todos los medios. Una alarma que se puede
              silenciar no es una alarma.
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

function Fila({
  etiqueta,
  nombre,
  valor,
  onChange,
}: {
  etiqueta: string;
  /** Lo que lee quien no ve la pantalla: «Llega un paquete: por WhatsApp». */
  nombre: string;
  valor: boolean;
  onChange: (valor: boolean) => void;
}) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="flex-1 text-xs text-gray-600">{etiqueta}</Text>
      <Toggle value={valor} onChange={onChange} accessibilityLabel={nombre} />
    </View>
  );
}
