import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Input, Toggle } from "@/shared/components/ui";
import { Select } from "@/shared/components";
import { useMonedas } from "@/shared/hooks/useMonedas";
import { useParametrosDeLaBase } from "@/shared/hooks";
import { useUIStore } from "@/stores";
import { mensajeDeError } from "@/shared/utils";
import { montoDesdeTexto } from "@/shared/utils/monto";
import {
  guardarConfiguracionCuotas,
  obtenerConfiguracionCuotas,
} from "@/features/directorio/services/cuotas.repo";

/**
 * Cuánto cobra el edificio de cuota, en qué moneda y qué día vence.
 *
 * Lo pidió el cliente el 13/10/2026: que sea parametrizable. Hasta entonces no
 * había dónde decirlo: el mes de cuota solo existía si alguien lo escribía en
 * la base, con el importe que pusiera ese día.
 *
 * El importe de una vivienda concreta --un local, un dúplex-- se cambia en
 * Directorio › Pagos, que es donde se ve la lista de viviendas.
 */



// No la cadena vacía: el desplegable la lee como «nada elegido».
const SIN_VENCIMIENTO = "sin";

export function ConfiguracionDeCuotas({
  condominioId,
}: {
  condominioId: string;
}) {
  const cliente = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);
  const parametrosDeLaBase = useParametrosDeLaBase();

  /*
    Los días que se ofrecen, del 1 al tope de la plataforma
    (`cuota_dia_vencimiento_maximo`, hoy 28 para que exista en febrero). Era
    un 28 escrito aquí; la base valida contra el mismo parámetro.
  */
  const dias = useMemo(
    () =>
      parametrosDeLaBase.listo
        ? Array.from(
            { length: parametrosDeLaBase.numero("cuota_dia_vencimiento_maximo") },
            (_, i) => ({ value: String(i + 1), label: `Día ${i + 1}` }),
          )
        : null,
    [parametrosDeLaBase],
  );

  const guardada = useQuery({
    queryKey: ["cuotas", "configuracion", condominioId],
    queryFn: () => obtenerConfiguracionCuotas(condominioId),
    enabled: Boolean(condominioId),
  });

  const [monto, setMonto] = useState("");
  // La guardada --o la del edificio-- llega con la consulta; nacía en «COP».
  const [moneda, setMoneda] = useState("");
  // Solo el código: el campo va a media columna.
  const monedasCuota = useMonedas(moneda).monedas.map((m) => ({ value: m.codigo, label: m.codigo }));
  const [dia, setDia] = useState(SIN_VENCIMIENTO);
  const [automatica, setAutomatica] = useState(false);
  const [errorMonto, setErrorMonto] = useState("");

  useEffect(() => {
    if (!guardada.data) return;
    setMonto(guardada.data.monto === null ? "" : String(guardada.data.monto));
    setMoneda(guardada.data.moneda);
    setDia(
      guardada.data.diaVencimiento === null
        ? SIN_VENCIMIENTO
        : String(guardada.data.diaVencimiento),
    );
    setAutomatica(guardada.data.automatica);
  }, [guardada.data]);

  const guardar = useMutation({
    mutationFn: async () => {
      const importe = montoDesdeTexto(monto);
      if (Number.isNaN(importe) || (importe !== null && importe <= 0)) {
        setErrorMonto("Escribe un importe mayor que cero, solo con números.");
        throw new Error("Revisa el importe de la cuota.");
      }
      if (automatica && importe === null) {
        setErrorMonto("Para crear el mes automáticamente hace falta el importe.");
        throw new Error("Falta el importe de la cuota.");
      }
      setErrorMonto("");
      await guardarConfiguracionCuotas(condominioId, {
        monto: importe,
        moneda,
        diaVencimiento: dia === SIN_VENCIMIENTO ? null : Number(dia),
        automatica,
      });
    },
    onSuccess: () => {
      addToast("Configuración de cuotas guardada", "success");
      void cliente.invalidateQueries({ queryKey: ["cuotas", "configuracion"] });
    },
    onError: (fallo) =>
      addToast(mensajeDeError(fallo, "No se pudo guardar"), "error"),
  });

  // Sin lo guardado delante no se guarda: se pisaría con el formulario vacío.
  const sinLeer = guardada.isLoading || guardada.isError || !dias;

  return (
    <View className="gap-3">
      <Text className="text-xs leading-5 text-gray-500">
        Lo que paga cada vivienda al mes. Si alguna paga distinto, cámbialo en
        Directorio › Pagos.
      </Text>

      {guardada.isError ? (
        <Text className="text-xs leading-5 text-red-600">
          No pudimos leer la configuración guardada. Recarga la pantalla.
        </Text>
      ) : null}

      <View className="flex-row gap-2.5">
        <View className="flex-1">
          <Input
            label="Importe mensual"
            value={monto}
            onChangeText={(texto) => {
              setMonto(texto);
              setErrorMonto("");
            }}
            placeholder="Ej.: 350.000"
            type="numeric"
            showEditIcon={false}
            error={errorMonto || undefined}
          />
        </View>
        <View style={{ width: 110 }}>
          <Select
            label="Moneda"
            value={moneda}
            options={monedasCuota}
            onChange={(valor) => setMoneda(String(valor))}
          />
        </View>
      </View>

      {dias ? (
        <Select
          label="Día de vencimiento"
          value={dia}
          options={[{ value: SIN_VENCIMIENTO, label: "Sin vencimiento" }, ...dias]}
          onChange={(valor) => setDia(String(valor))}
        />
      ) : null}

      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1">
          <Text className="text-sm font-semibold text-gray-900">
            Crear el mes automáticamente
          </Text>
          <Text className="text-xs leading-5 text-gray-500">
            Cada mes aparece solo en Directorio › Pagos. Apagado, lo creas tú
            desde allí.
          </Text>
        </View>
        <Toggle
          value={automatica}
          onChange={setAutomatica}
          accessibilityLabel="Crear el mes de cuota automáticamente"
        />
      </View>

      <Button
        fullWidth
        loading={guardar.isPending}
        disabled={sinLeer}
        onPress={() => guardar.mutate()}
      >
        Guardar cuotas
      </Button>
    </View>
  );
}
