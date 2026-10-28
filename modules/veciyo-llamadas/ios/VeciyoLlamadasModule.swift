import ExpoModulesCore

/**
 * El puente entre CallKit/PushKit (`CentralDeLlamadas`) y JavaScript.
 * ESCRITO Y SIN COMPILAR (28/10/2026): ver `CentralDeLlamadas.swift`.
 *
 * JavaScript (`src/features/intercom/services/llamadasNativas.native.ts`):
 *   · `listo()` empieza a escuchar y devuelve lo que pasó antes;
 *   · `tokenVoip()` el token de PushKit, para guardarlo en la base;
 *   · `terminar(id)` quita la llamada de CallKit cuando termina fuera de él;
 *   · eventos `tokenVoip`, `contestar` y `colgar`.
 */
public class VeciyoLlamadasModule: Module {
  public func definition() -> ModuleDefinition {
    Name("VeciyoLlamadas")

    Events("tokenVoip", "contestar", "colgar")

    Function("listo") { () -> [[String: String]] in
      CentralDeLlamadas.shared.alEvento = { [weak self] evento, datos in
        self?.sendEvent(evento, datos)
      }
      return CentralDeLlamadas.shared.tomarPendientes()
    }

    Function("tokenVoip") { () -> String? in
      CentralDeLlamadas.shared.token
    }

    Function("terminar") { (llamadaId: String) in
      CentralDeLlamadas.shared.terminar(llamadaId)
    }

    OnDestroy {
      CentralDeLlamadas.shared.alEvento = nil
    }
  }
}
