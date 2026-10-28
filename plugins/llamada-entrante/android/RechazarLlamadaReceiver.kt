package com.veciyo.app.llamadas

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * «Rechazar» en el aviso de la llamada: deja de sonar en este celular y
 * avisa al servidor con la firma del aviso, sin sesión, para que a quien
 * llama le salga «rechazada» al momento (28/10/2026).
 */
class RechazarLlamadaReceiver : BroadcastReceiver() {
  override fun onReceive(contexto: Context, intent: Intent) {
    val llamadaId = intent.getStringExtra(LlamadaEntrante.EXTRA_ID) ?: ""
    LlamadaEntrante.cancelar(contexto, llamadaId)
    // El receptor termina en cuanto vuelve: `goAsync` le da tiempo a la red.
    val pendiente = goAsync()
    LlamadaEntrante.rechazarEnElServidor(llamadaId, intent.extras) { pendiente.finish() }
  }
}
