import React, { useState } from "react";
import { mensajeDeError } from "@/shared/utils";
import { Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Button, Modal } from "@/shared/components";
import { useUIStore } from "@/stores";
import {
  abrirPrecheckin,
  reemitirAccesoHuesped,
} from "../services/precheckin.repo";

/**
 * El enlace de preregistro que el anfitrión le pasa a su huésped.
 *
 * Es la pieza que faltaba para que el primer paso del timeline --«🔗 Link de
 * preregistro enviado»-- dejara de mentir: estaba cableado a `true` y se
 * pintaba en verde para todo el mundo, siempre, porque no había ningún enlace
 * que enviar.
 *
 * Mientras el envío de correo esté apagado, el enlace se enseña aquí para
 * poder pasarlo a mano. Es la misma decisión que en las invitaciones y por el
 * mismo motivo: sin acceso a la bandeja de entrada, el flujo sería imposible
 * de recorrer. Cuando se encienda, esta pantalla dirá que se envió y no
 * mostrará nada.
 */
interface Props {
  visitaUuid: string;
  /** Si ya se generó uno antes. El anterior deja de valer al pedir otro. */
  yaEnviado: boolean;
  /** El huésped ya lo completó: no hay nada que volver a mandar. */
  cerrado: boolean;
}

export function EnlacePrecheckin({ visitaUuid, yaEnviado, cerrado }: Props) {
  const { addToast } = useUIStore();
  const [enlace, setEnlace] = useState<string | null>(null);
  const [porCorreo, setPorCorreo] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  /*
    Aqui vivian el estado y los dos manejadores del TRA y del SIRE, y se
    retiran con sus botones el 09/10/2026: el reporte se enganchara donde
    corresponde --al marcar la entrada y la salida desde la porteria-- y
    dejarlos aqui sin quien los llame seria un cabo sin atar de los que este
    proyecto lleva meses persiguiendo.

    Lo que **no** se retira es el trabajo: `reportarALaTra` y `reportarAlSire`
    siguen en el repositorio, las funciones desplegadas y probadas, y la regla
    del ingreso dentro de `reportar-tra`. Lo unico que falta es desde donde se
    pulsan. Queda en `REVISAR-A-OJO.md`.
  */

  const generar = async () => {
    setGenerando(true);
    try {
      const resultado = await abrirPrecheckin(visitaUuid);
      if (resultado.correoEnviado) {
        setPorCorreo(true);
      } else {
        setEnlace(resultado.enlace);
      }
    } catch (e) {
      addToast(mensajeDeError(e, "No se pudo generar el enlace"), "error");
    } finally {
      setGenerando(false);
    }
  };

  const copiar = async () => {
    if (!enlace) return;
    await Clipboard.setStringAsync(enlace);
    setCopiado(true);
    // Copiar no se ve. Sin confirmación, la única forma de saber si funcionó
    // es pegar en otro sitio.
    setTimeout(() => setCopiado(false), 2000);
  };

  /*
    Cerrado el preregistro lo que hace falta ya no es el enlace de registro,
    sino el **acceso a la aplicación**. Este boton existe porque la demo del
    25/09/2026 se quedo atascada justo aqui: el acceso se ensena una sola vez
    al terminar, quien lo vio cerro la pantalla sin copiarlo, y no habia forma
    de recuperarlo ni de reenviarlo.
  */
  const reemitir = async () => {
    setGenerando(true);
    try {
      const resultado = await reemitirAccesoHuesped(visitaUuid);
      if (resultado.correoEnviado) setPorCorreo(true);
      else setEnlace(resultado.enlace);
    } catch (e) {
      addToast(mensajeDeError(e, "No se pudo reenviar el acceso"), "error");
    } finally {
      setGenerando(false);
    }
  };

  if (cerrado) {
    return (
      <View className="gap-2">
        <View className="rounded-xl bg-green-50 px-4 py-3">
          <Text className="text-sm font-semibold text-green-900">
            Tu huésped ya completó su preregistro
          </Text>
          <Text className="text-xs text-green-800 mt-1">
            Si perdió el enlace con el que entra a la aplicación, puedes
            volver a mandárselo.
          </Text>
        </View>

        <Button onPress={reemitir} loading={generando} fullWidth>
          Reenviar su acceso a la app
        </Button>

        {/*
          Aqui iban «Reportar al ministerio (TRA)» y «Reporte de extranjeros
          (SIRE)», y se retiran el 09/10/2026.

          No porque no funcionen --los dos llaman a su funcion y simulan-- sino
          porque **todavia no es el momento**: la TRA declara que alguien se
          alojo, asi que no se reporta hasta que la porteria registra el
          ingreso. La funcion lo sujeta desde hoy y responde 409; ofrecer un
          boton que solo puede fallar es pedirle a alguien que se estrelle.

          El cliente lo vio al pulsarlo: «POST ... 409 (Conflict) xD?».

          Vuelven cuando el reporte se enganche donde corresponde: al marcar
          la entrada y la salida desde la porteria. Lo decidio asi el cliente
          el mismo dia. Las dos funciones y sus pantallas se quedan escritas y
          probadas; lo unico que falta es desde donde se llaman.

          Y de paso: los dos botones compartian `reportando`, asi que pulsar
          uno ponia a girar el otro.
        */}

        {/*
          Aqui estaban las dos ventanas que enseñaban el borrador del SIRE y
          el cuerpo que se declararia a la TRA. Se van con sus botones: una
          ventana que nadie puede abrir es el defecto que este proyecto ya
          tuvo dos veces --`AdministradorZonasScreen` y «Agregar Residente»--
          y la segunda vez costo media tarde descubrir que describia codigo y
          no producto.

          Vuelven con los botones, enganchadas a la entrada y la salida de
          porteria.
        */}

        <Modal
          visible={Boolean(enlace) || porCorreo}
          onClose={() => {
            setEnlace(null);
            setPorCorreo(false);
          }}
          title="Acceso del huésped"
        >
          {porCorreo ? (
            <Text className="text-sm text-gray-700">
              Se lo reenviamos por correo.
            </Text>
          ) : (
            <View className="gap-4">
              <Text className="text-sm text-gray-700">
                Con este enlace tu huésped crea su cuenta. Caduca cuando
                termina su estadía.
              </Text>
              <View className="rounded-xl bg-gray-100 px-3.5 py-3">
                <Text
                  className="text-xs text-gray-900"
                  style={{ fontFamily: "monospace" }}
                  selectable
                >
                  {enlace}
                </Text>
              </View>
              <Button onPress={copiar} fullWidth>
                {copiado ? "✓ Copiado" : "Copiar enlace"}
              </Button>
              <Text className="text-xs text-gray-500">
                El anterior deja de valer. Guárdalo: tampoco este se puede
                volver a mostrar.
              </Text>
            </View>
          )}
        </Modal>
      </View>
    );
  }

  return (
    <View className="gap-2">
      {/* `children` y no `title`: es la API de este `Button`, y el texto de
          dentro es además lo que lee un lector de pantalla. */}
      <Button onPress={generar} loading={generando} fullWidth>
        {yaEnviado ? "Generar un enlace nuevo" : "Enviar preregistro"}
      </Button>
      {yaEnviado && (
        <Text className="text-xs text-gray-500 px-1">
          Ya se generó uno. Si pides otro, el anterior deja de funcionar.
        </Text>
      )}

      <Modal
        visible={Boolean(enlace) || porCorreo}
        onClose={() => {
          setEnlace(null);
          setPorCorreo(false);
        }}
        title="Preregistro del huésped"
      >
        {porCorreo ? (
          <Text className="text-sm text-gray-700">
            Le llegó por correo. Avísale que lo complete antes de llegar.
          </Text>
        ) : (
          <View className="gap-4">
            <Text className="text-sm text-gray-700">
              Pásale este enlace a tu huésped. Con él carga su documento y el
              de quienes vengan con él, sin necesidad de crear una cuenta.
            </Text>

            <View className="rounded-xl bg-gray-100 px-3.5 py-3">
              <Text
                className="text-xs text-gray-900"
                style={{ fontFamily: "monospace" }}
                selectable
              >
                {enlace}
              </Text>
            </View>

            <Button onPress={copiar} fullWidth>
              {copiado ? "✓ Copiado" : "Copiar enlace"}
            </Button>

            {/*
              Se dice aquí y no en una nota al pie: el enlace no se vuelve a
              poder ver. En la base solo vive su sha256, así que si se cierra
              esta ventana sin copiarlo hay que generar otro.
            */}
            <Text className="text-xs text-gray-500">
              Guárdalo ahora: por seguridad no se puede volver a mostrar. Si lo
              pierdes, genera uno nuevo y el anterior dejará de valer.
            </Text>
          </View>
        )}
      </Modal>
    </View>
  );
}
