import ExpoModulesCore

/**
 * Al arrancar la app --también cuando la despierta un push VoIP con la app
 * cerrada-- se registra en PushKit. Tiene que ser aquí y no desde JavaScript:
 * cuando llega el push, iOS exige enseñar la llamada antes de que JavaScript
 * haya cargado. ESCRITO Y SIN COMPILAR (28/10/2026).
 */
public class VeciyoLlamadasAppDelegate: ExpoAppDelegateSubscriber {
  public func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    CentralDeLlamadas.shared.iniciar()
    return true
  }
}
