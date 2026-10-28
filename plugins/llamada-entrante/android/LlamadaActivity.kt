package com.veciyo.app.llamadas

import android.app.Activity
import android.app.KeyguardManager
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import java.lang.ref.WeakReference

/**
 * La pantalla de la llamada entrante, encima de la pantalla de bloqueo.
 *
 * Es nativa y no de la app (React Native) a propósito: se enseña con el
 * celular bloqueado, y dejar la app entera visible sobre el bloqueo dejaría a
 * cualquiera usarla sin desbloquear. Aquí solo hay quién llama y dos botones.
 * «Contestar» pide desbloquear y abre la app en la llamada.
 */
class LlamadaActivity : Activity() {
  var llamadaId: String = ""
    private set

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
    } else {
      @Suppress("DEPRECATION")
      window.addFlags(
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
          WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON,
      )
    }
    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

    llamadaId = intent.getStringExtra(LlamadaEntrante.EXTRA_ID) ?: ""
    if (llamadaId.isEmpty()) {
      finish()
      return
    }
    val deQuien = intent.getStringExtra(LlamadaEntrante.EXTRA_DE) ?: "Veciyo"
    LlamadaEntrante.pantallaAbierta = WeakReference(this)
    setContentView(armarPantalla(deQuien))
  }

  private fun dp(valor: Int): Int = (valor * resources.displayMetrics.density).toInt()

  private fun boton(texto: String, color: Int, alPulsar: () -> Unit): Button =
    Button(this).apply {
      text = texto
      setTextColor(Color.WHITE)
      textSize = 18f
      isAllCaps = false
      background = GradientDrawable().apply {
        cornerRadius = dp(32).toFloat()
        setColor(color)
      }
      setOnClickListener { alPulsar() }
    }

  private fun armarPantalla(deQuien: String): LinearLayout {
    val raiz = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER_HORIZONTAL
      setBackgroundColor(Color.parseColor("#1F2937"))
      setPadding(dp(24), dp(96), dp(24), dp(64))
    }
    raiz.addView(TextView(this).apply {
      text = "Llamada por Veciyo"
      setTextColor(Color.parseColor("#D1D5DB"))
      textSize = 16f
      gravity = Gravity.CENTER
    })
    raiz.addView(TextView(this).apply {
      text = deQuien
      setTextColor(Color.WHITE)
      textSize = 30f
      typeface = Typeface.DEFAULT_BOLD
      gravity = Gravity.CENTER
      setPadding(0, dp(16), 0, 0)
    })
    // Lo que queda de alto empuja los botones abajo.
    raiz.addView(
      LinearLayout(this),
      LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f),
    )
    val botones = LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER
    }
    val medida = LinearLayout.LayoutParams(0, dp(64), 1f).apply {
      setMargins(dp(8), 0, dp(8), 0)
    }
    botones.addView(boton("Rechazar", Color.parseColor("#DC2626")) { rechazar() }, medida)
    botones.addView(boton("Contestar", Color.parseColor("#16A34A")) { contestar() }, medida)
    raiz.addView(botones)
    return raiz
  }

  private fun rechazar() {
    LlamadaEntrante.cancelar(this, llamadaId)
    LlamadaEntrante.rechazarEnElServidor(llamadaId, intent.extras)
    finish()
  }

  private fun contestar() {
    val id = llamadaId
    val abrir = {
      LlamadaEntrante.cancelar(this, id)
      startActivity(LlamadaEntrante.abrirLaApp(this, id, "contestar"))
      finish()
    }
    val bloqueo = getSystemService(KeyguardManager::class.java)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && bloqueo.isKeyguardLocked) {
      bloqueo.requestDismissKeyguard(
        this,
        object : KeyguardManager.KeyguardDismissCallback() {
          override fun onDismissSucceeded() {
            abrir()
          }
        },
      )
    } else {
      abrir()
    }
  }

  override fun onDestroy() {
    if (LlamadaEntrante.pantallaAbierta?.get() === this) LlamadaEntrante.pantallaAbierta = null
    super.onDestroy()
  }
}
