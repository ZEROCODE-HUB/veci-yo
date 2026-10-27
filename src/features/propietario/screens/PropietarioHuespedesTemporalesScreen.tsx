import React from "react";
import { View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { DesplazableConTeclado } from "@/shared/layouts";
import { Button, SuscripcionPagoModal } from "@/shared/components";
import { useParametrosDeLaBase } from "@/shared/hooks";
import { useAuthStore } from "@/stores";
import { useHuespedesTemporales } from "../hooks/useHuespedesTemporales";
import { SinSuscripcion } from "../components/huespedes/configuracion/SinSuscripcion";
import { EstanciaYAforo } from "../components/huespedes/configuracion/EstanciaYAforo";
import { ReglasDeConvivencia } from "../components/huespedes/configuracion/ReglasDeConvivencia";
import { EstacionamientosDelAlojamiento } from "../components/huespedes/configuracion/EstacionamientosDelAlojamiento";
import { CalendariosDePlataformas } from "../components/huespedes/configuracion/CalendariosDePlataformas";
import { HorarioDeEntrada } from "../components/huespedes/configuracion/HorarioDeEntrada";
import { RecordatoriosDelRegistro } from "../components/huespedes/configuracion/RecordatoriosDelRegistro";
import { VisitasDeHuespedes } from "../components/huespedes/configuracion/VisitasDeHuespedes";
import { CumplimientoLegal } from "../components/huespedes/configuracion/CumplimientoLegal";
import { ConfianzaDelDepartamento } from "../components/huespedes/configuracion/ConfianzaDelDepartamento";
import { LibroDelAlojamiento } from "../components/huespedes/configuracion/LibroDelAlojamiento";
import { BajaDeRentaCorta } from "../components/huespedes/configuracion/BajaDeRentaCorta";

/**
 * La configuración de la renta corta de una vivienda.
 *
 * Cada tarjeta es un componente de `components/huespedes/configuracion/`
 * (26/10/2026: la pantalla tenía 924 líneas). Todas leen y escriben el mismo
 * estado, el de `useHuespedesTemporales`, y se guardan juntas con el botón de
 * abajo.
 */
export function PropietarioHuespedesTemporalesScreen() {
  const navigation = useNavigation();
  const rolActivo = useAuthStore((s) => s.rolActivo);
  // El RNT está a nombre del dueño: solo él lo edita.
  const esDueno =
    rolActivo === "propietario" || rolActivo === "propietario-no-residente";
  const renta = useHuespedesTemporales();

  /*
    Los días que se pueden elegir para avisar y los topes de lo que el
    anfitrión escribe salen de los parámetros de la plataforma.
  */
  const parametros = useParametrosDeLaBase();

  /*
    Hacia esto y nada mas:
      addToast("Configuracion guardada exitosamente", "success");
      navigation.goBack();
    Se anunciaba el exito y se tiraba todo: aforo, minimo de noches, mascotas,
    descripcion, plataformas, RNT y el libro del alojamiento con el wifi y la
    clave de la puerta. El toast lo pone ahora el propio guardado, y solo si
    escribe.
  */
  const handleGuardar = async () => {
    try {
      await renta.guardarConfiguracion();
      navigation.goBack();
    } catch {
      // El aviso lo da el hook; aqui solo hay que no salir de la pantalla.
    }
  };

  return (
    <DesplazableConTeclado
      className="flex-1 bg-gray-50"
      contentContainerClassName="p-4 gap-4"
    >
      {!renta.tieneSuscripcion && (
        <SinSuscripcion
          autorizada={renta.autorizada}
          onSuscribirse={() => renta.setShowPayment(true)}
        />
      )}

      {/* Sin los parámetros no hay topes ni días que ofrecer: se espera. */}
      {renta.tieneSuscripcion && parametros.listo && (
        <>
          <EstanciaYAforo renta={renta} parametros={parametros} />
          <ReglasDeConvivencia renta={renta} />
          <EstacionamientosDelAlojamiento renta={renta} />
          <CalendariosDePlataformas renta={renta} />
          <HorarioDeEntrada renta={renta} />
          <RecordatoriosDelRegistro renta={renta} parametros={parametros} />
          <VisitasDeHuespedes renta={renta} />
          <CumplimientoLegal renta={renta} esDueno={esDueno} />
          <ConfianzaDelDepartamento renta={renta} />
          <LibroDelAlojamiento renta={renta} />

          <Button
            variant="primary"
            onPress={handleGuardar}
            disabled={renta.guardando}
          >
            {renta.guardando ? "Guardando…" : "Guardar configuración"}
          </Button>

          <BajaDeRentaCorta renta={renta} />
        </>
      )}

      <View className="h-6" />

      {/*
        El modal de pago es el compartido: esta pantalla tenía el suyo propio,
        copiado, y los dos llevaban el formulario de tarjeta y el `$15.00`
        escrito a mano.
      */}
      <SuscripcionPagoModal
        visible={renta.showPayment}
        onClose={() => renta.setShowPayment(false)}
        precio={renta.precio}
        pagoSimulado={renta.pagoSimulado}
        procesando={renta.paymentLoading}
        onIrAlPago={renta.irAlPago}
        onConfirmarSimulado={() => renta.confirmarPago(null)}
        codigo={renta.codigoDescuento}
        onCodigo={renta.setCodigoDescuento}
        descuento={renta.descuento}
        aplicandoCodigo={renta.aplicandoCodigo}
        onAplicarCodigo={() => void renta.aplicarCodigo()}
      />
    </DesplazableConTeclado>
  );
}
