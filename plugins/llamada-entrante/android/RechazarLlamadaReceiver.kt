package com.veciyo.app.llamadas

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * «Rechazar» en el aviso de la llamada: deja de sonar en este celular.
 *
 * No avisa a quien llama: para eso hace falta la sesión, que vive en la parte
 * de JavaScript. A quien llama le sigue sonando hasta que alguien conteste o
 * pase el tiempo de espera (`llamada_segundos_sin_contestar`).
 */
class RechazarLlamadaReceiver : BroadcastReceiver() {
  override fun onReceive(contexto: Context, intent: Intent) {
    LlamadaEntrante.cancelar(contexto, intent.getStringExtra(LlamadaEntrante.EXTRA_ID) ?: "")
  }
}
