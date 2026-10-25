import React, { useEffect, useState } from "react";
import { useUIStore } from "@/stores/ui-store";
import { ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  SosAlarma,
  SosConfirmacion,
  type EstadoAlarma,
} from "../components/sos";
import { useSos } from "../hooks/useSos";

/**
 * Pedir auxilio.
 *
 * La alarma se disparaba **al entrar**, con el comentario de que llegar aquí
 * ya era pedirla. Y se llega desde un renglón de «Perfil» pegado a
 * «Configuración», así que un toque mal dado sonaba de verdad en el teléfono
 * de todos los guardias de turno. Ahora hay un paso de confirmación
 * (`SosConfirmacion`), decidido con el cliente el 29/09/2026.
 *
 * Antes de todo eso, los dos botones hacían `navigation.goBack()` y no pasaba
 * nada en ningún sitio.
 */
export function SOSScreen() {
  const navigation = useNavigation();
  const { activar, activando, fallo, alarma, cerrar } = useSos();
  const [pedida, setPedida] = useState(false);
  const addToast = useUIStore((s) => s.addToast);
  /** Se pidió cerrar la alarma, con este motivo, y todavía no está cerrada. */
  const [saliendo, setSaliendo] = useState<"cancelada" | "atendida" | null>(
    null,
  );

  const confirmar = () => {
    // Una sola vez: una segunda llamada abriría otra alarma por el mismo
    // suceso, y el botón desaparece en cuanto `pedida` pasa a true.
    setPedida(true);
    activar();
  };

  const estado: EstadoAlarma = alarma
    ? { tipo: "activa", avisados: alarma.avisados }
    : fallo
      ? { tipo: "fallo" }
      : { tipo: "avisando" };

  /*
    Cerrar la alarma **espera a que exista**.

    Mientras dice «Avisando…» la alarma todavía se está creando. Pulsar
    «Cancelar» ahí salía de la pantalla sin cerrar nada --no había aún qué
    cerrar-- y la alarma se creaba igual un instante después: la portería la
    recibía abierta y quien la pidió creía haberla cancelado (13/10/2026).

    Ahora se anota la intención y se cumple cuando la alarma llega. Y si el
    cierre falla, **no se sale**: se dice, y la persona puede reintentar o
    llamar. Antes se tragaba el error y la pantalla se iba igual.
  */
  useEffect(() => {
    if (!saliendo) return;
    if (activando) return; // todavía se está creando: se espera
    if (!alarma) {
      // No llegó a crearse: no hay nada que cerrar.
      navigation.goBack();
      return;
    }
    let vigente = true;
    cerrar(saliendo)
      .then(() => {
        if (vigente) navigation.goBack();
      })
      .catch(() => {
        if (!vigente) return;
        setSaliendo(null);
        addToast(
          "No se pudo cerrar la alarma. Inténtalo otra vez o avisa a la portería.",
          "error",
        );
      });
    return () => {
      vigente = false;
    };
    // `cerrar` y `navigation` cambian de identidad en cada render; lo que
    // decide cuándo actuar es la intención, la alarma y si aún se crea.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saliendo, alarma, activando]);

  const salir = (motivo: "cancelada" | "atendida") => setSaliendo(motivo);

  return (
    // Con scroll: con la letra grande el contenido no cabe y los botones
    // quedaban fuera de la pantalla, sin forma de llegar a ellos.
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ flexGrow: 1 }}
    >
      {pedida ? (
        <SosAlarma
          estado={
            saliendo
              ? { tipo: "cerrando" }
              : activando
                ? { tipo: "avisando" }
                : estado
          }
          onCancelar={() => salir("cancelada")}
          onGuardia={() => salir("atendida")}
        />
      ) : (
        <SosConfirmacion
          onConfirmar={confirmar}
          onCancelar={() => navigation.goBack()}
        />
      )}
    </ScrollView>
  );
}
