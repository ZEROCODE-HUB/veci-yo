import AVFoundation
import CallKit
import Foundation
import PushKit

/**
 * La llamada por la app como una llamada de iPhone (CallKit), 28/10/2026.
 *
 * ESCRITO Y SIN COMPILAR: hace falta la cuenta de desarrollador de Apple (y
 * una Mac o EAS Build). Ver `plugins/llamada-entrante/ios.js`.
 *
 * Cómo funciona:
 *   1. Al abrir la app se registra en PushKit (VoIP). Apple da un token, que
 *      la parte de JavaScript guarda en `dispositivo_voip`.
 *   2. Al llamar a esta persona, la función `avisar-llamada` manda un push VoIP
 *      a ese token. iOS despierta la app aunque esté cerrada, y aquí se
 *      enseña la llamada con CallKit: la pantalla de llamada del iPhone, con
 *      el tono, sobre el bloqueo.
 *   3. Contestar o colgar en esa pantalla llega a JavaScript como evento
 *      (`contestar`, `colgar`), que hace lo mismo que los botones de la app.
 *      Si JavaScript todavía no está escuchando, se guarda en `pendientes`.
 *
 * Apple obliga a enseñar una llamada de CallKit por cada push VoIP que
 * llega; si no, deja de despertar la app. Por eso aquí se informa siempre,
 * incluso si el push viene raro.
 */
final class CentralDeLlamadas: NSObject, PKPushRegistryDelegate, CXProviderDelegate {
  static let shared = CentralDeLlamadas()

  private var registro: PKPushRegistry?
  private let proveedor: CXProvider
  /** llamadaId de la base → UUID de CallKit. */
  private var llamadas: [String: UUID] = [:]
  private var pendientes: [[String: String]] = []
  private(set) var token: String?
  /** Quién escucha en JavaScript. Nulo hasta que la app dice que está lista. */
  var alEvento: ((String, [String: String]) -> Void)?

  override init() {
    let configuracion = CXProviderConfiguration()
    configuracion.supportsVideo = false
    configuracion.maximumCallGroups = 1
    configuracion.maximumCallsPerCallGroup = 1
    configuracion.supportedHandleTypes = [.generic]
    configuracion.includesCallsInRecents = false
    proveedor = CXProvider(configuration: configuracion)
    super.init()
    proveedor.setDelegate(self, queue: nil)
  }

  func iniciar() {
    guard registro == nil else { return }
    let r = PKPushRegistry(queue: .main)
    r.delegate = self
    r.desiredPushTypes = [.voIP]
    registro = r
  }

  // MARK: PushKit

  func pushRegistry(_ registry: PKPushRegistry, didUpdate pushCredentials: PKPushCredentials, for type: PKPushType) {
    let hex = pushCredentials.token.map { String(format: "%02x", $0) }.joined()
    token = hex
    emitir("tokenVoip", ["token": hex])
  }

  func pushRegistry(_ registry: PKPushRegistry, didInvalidatePushTokenFor type: PKPushType) {
    token = nil
  }

  func pushRegistry(
    _ registry: PKPushRegistry,
    didReceiveIncomingPushWith payload: PKPushPayload,
    for type: PKPushType,
    completion: @escaping () -> Void
  ) {
    let datos = payload.dictionaryPayload
    let llamadaId = (datos["llamadaId"] as? String) ?? UUID().uuidString
    let deQuien = (datos["deQuien"] as? String) ?? "Veciyo"
    let segundos = (datos["segundos"] as? Int) ?? 60

    let uuid = llamadas[llamadaId] ?? UUID()
    llamadas[llamadaId] = uuid

    let llamada = CXCallUpdate()
    llamada.remoteHandle = CXHandle(type: .generic, value: deQuien)
    llamada.localizedCallerName = deQuien
    llamada.hasVideo = false
    llamada.supportsHolding = false
    llamada.supportsDTMF = false

    proveedor.reportNewIncomingCall(with: uuid, update: llamada) { _ in
      completion()
    }

    // Pasado el tiempo de espera, deja de sonar aunque no llegue nada más.
    DispatchQueue.main.asyncAfter(deadline: .now() + .seconds(segundos)) { [weak self] in
      self?.terminar(llamadaId, motivo: .unanswered)
    }
  }

  // MARK: CallKit

  private func llamadaId(de uuid: UUID) -> String? {
    llamadas.first(where: { $0.value == uuid })?.key
  }

  func provider(_ provider: CXProvider, perform action: CXAnswerCallAction) {
    if let id = llamadaId(de: action.callUUID) {
      emitir("contestar", ["llamadaId": id])
    }
    action.fulfill()
  }

  func provider(_ provider: CXProvider, perform action: CXEndCallAction) {
    if let id = llamadaId(de: action.callUUID) {
      llamadas.removeValue(forKey: id)
      emitir("colgar", ["llamadaId": id])
    }
    action.fulfill()
  }

  func provider(_ provider: CXProvider, didActivate audioSession: AVAudioSession) {
    // La voz la lleva LiveKit, que configura su propia sesión de audio al
    // conectar. CallKit la activa aquí; no hay nada más que hacer.
  }

  func providerDidReset(_ provider: CXProvider) {
    llamadas.removeAll()
  }

  /** La llamada dejó de sonar o terminó fuera de CallKit. */
  func terminar(_ llamadaId: String, motivo: CXCallEndedReason = .remoteEnded) {
    guard let uuid = llamadas.removeValue(forKey: llamadaId) else { return }
    proveedor.reportCall(with: uuid, endedAt: Date(), reason: motivo)
  }

  // MARK: JavaScript

  private func emitir(_ evento: String, _ datos: [String: String]) {
    if let alEvento {
      alEvento(evento, datos)
    } else {
      var guardado = datos
      guardado["evento"] = evento
      pendientes.append(guardado)
    }
  }

  /** Lo que pasó antes de que JavaScript escuchara, una sola vez. */
  func tomarPendientes() -> [[String: String]] {
    let lista = pendientes
    pendientes = []
    return lista
  }
}
