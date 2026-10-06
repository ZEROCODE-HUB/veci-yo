import { ScrollView, Text, View } from "react-native";
import { Button, Card } from "@/shared/components";
import { useUIStore } from "@/stores";
import { theme } from "@/config";
import { telefonoInternacional } from "@/shared/constants";
import { usePropietarioServicio } from "../hooks/usePropietarioServicio";
import { PropietarioServicioForm } from "../components/servicios";

/**
 * Los servicios que paga la vivienda: luz, agua, internet.
 *
 * El KT lista «agregar servicio» entre lo que hace el propietario, y esta
 * pantalla estaba terminada desde el prototipo —formulario, validación con zod
 * y su hook—. Lo que no existía era **dónde guardarlo**: no había tabla, ni
 * política, ni nadie que lo consultara, así que el alta llamaba a
 * `simularAgregarServicio`, que esperaba 180 ms y devolvía lo que le dieras.
 *
 * Y estaba **inalcanzable** desde el 01/10/2026: la única ruta que la
 * registraba vivía en un stack que no montaba nadie.
 *
 * Las dos cosas se cierran el 06/10/2026. Y se le añade **la lista**, que no
 * tenía: dar de alta algo que después no se ve en ninguna parte es el defecto
 * que más veces ha salido en este proyecto —el número de lavadora se guardaba
 * bien y no aparecía en las cuatro pantallas que lo tenían que enseñar—.
 */
export function PropietarioAgregarServicioScreen() {
  const { addToast } = useUIStore();
  const form = usePropietarioServicio();

  const handleAgregar = form.handleSubmit(async (values) => {
    await form.agregar.mutateAsync(values);
    addToast("Servicio agregado", "success");
    form.reset();
  });

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerClassName="p-4 gap-3"
    >
      {form.hayVivienda ? null : (
        <Card className="p-4">
          <Text className="text-sm text-gray-700">
            Primero hay que elegir una vivienda: los servicios son de una
            vivienda, no de la cuenta.
          </Text>
        </Card>
      )}

      {form.servicios.length > 0 && (
        <Card className="gap-3 p-4">
          <Text className="text-base font-semibold text-gray-900">
            Servicios de esta vivienda
          </Text>
          {form.servicios.map((servicio) => (
            <View
              key={servicio.id}
              className="gap-1 border-t border-gray-200 pt-3"
            >
              <View className="flex-row items-center justify-between gap-3">
                <Text className="flex-1 text-sm font-semibold text-gray-900">
                  {servicio.nombre}
                  {Boolean(servicio.empresa) && ` · ${servicio.empresa}`}
                </Text>
                <Button
                  variant="secondary"
                  loading={form.borrar.isPending}
                  onPress={() => form.borrar.mutate(servicio.id)}
                >
                  <Text>Eliminar</Text>
                </Button>
              </View>

              {Boolean(servicio.numeroCliente) && (
                <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
                  Cliente {servicio.numeroCliente}
                  {Boolean(servicio.numeroMedidor) &&
                    ` · medidor ${servicio.numeroMedidor}`}
                </Text>
              )}

              {/*
                Los dos días juntos en una frase, y solo si los hay. Antes
                serían dos cajas vacías que no dicen nada.
              */}
              {servicio.diaPrimerAviso !== null && (
                <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
                  Vence el {servicio.diaPrimerAviso} de cada mes
                  {servicio.diaSegundoAviso !== null &&
                    `, segundo aviso el ${servicio.diaSegundoAviso}`}
                </Text>
              )}

              {Boolean(telefonoInternacional(servicio.codigoPais, servicio.telefono)) && (
                <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
                  {telefonoInternacional(servicio.codigoPais, servicio.telefono)}
                </Text>
              )}

              {Boolean(servicio.correoFactura) && (
                <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
                  Factura a {servicio.correoFactura}
                </Text>
              )}
            </View>
          ))}
        </Card>
      )}

      <Card className="gap-3 p-4">
        <Text className="text-base font-semibold text-gray-900">
          Agregar un servicio
        </Text>
        <PropietarioServicioForm
          control={form.control}
          errors={form.formState.errors}
          watch={form.watch}
          setValue={form.setValue}
          guardando={form.agregar.isPending}
          onSubmit={handleAgregar}
        />
      </Card>
    </ScrollView>
  );
}
